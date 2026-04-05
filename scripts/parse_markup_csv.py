#!/usr/bin/env python3
"""
Парсер CSV разметки + демографии + аттракторов → public/data/markup.json

Читает три CSV:
  .data/markup_dataset.csv    — поведенческие ответы (ситуации × стратегии, 0/1)
  .data/demographics.csv      — демография респондентов (пол, возраст, семья и т.д.)
  .data/attractor_scores.csv  — оценки L2-аттракторов (0–3) каждого респондента

Маппит респондентов по ID и генерирует JSON с агрегированной демографией
и средними оценками аттракторов по каждой стратегии.

⚠️  Исходные CSV содержат индивидуальные данные. Выходной JSON содержит
    только агрегаты (средние, проценты) — индивидуальные данные не раскрываются.
"""

import csv
import json
import os
from dataclasses import dataclass, field


@dataclass
class Demographics:
    gender: str = ''
    age: int | None = None
    marital_status: str = ''
    has_children: bool = False
    children_count: int = 0


@dataclass
class StrategyData:
    name: str
    col_index: int
    count: int = 0
    total: int = 0
    respondent_ids: list[str] = field(default_factory=list)


@dataclass
class SituationData:
    name: str
    strategies: list[StrategyData] = field(default_factory=list)
    respondent_ids: list[str] = field(default_factory=list)


# Маппинг CSV-ситуаций на существующие ID в situations.ts и attractorL2
SITUATION_MAP: dict[str, dict[str, str]] = {
    'Рождение ребенка': {
        'linked_id': 's19',
        'attractor_l2': 'l2_semya_03',
    },
    'Смена места работы/выход на новое место работы': {
        'linked_id': 's32',
        'attractor_l2': 'l2_rabota_01',
    },
    'Переезд в другой город или регион внутри страны': {
        'linked_id': 's31',
        'attractor_l2': 'l2_byt_02',
    },
    'Официальная регистрация брака / свадьба / венчание': {
        'linked_id': 's21',
        'attractor_l2': 'l2_semya_02',
    },
    'Развод': {
        'linked_id': 's01',
        'attractor_l2': 'l2_semya_02',
    },
    'Появление повода/необходимости обратиться к врачу (какие-либо симптомы, направление, плановый осмотр)': {
        'linked_id': 's09',
        'attractor_l2': 'l2_telo_02',
    },
    'Поступление в ВУЗ / ССУЗ': {
        'linked_id': 's04',
        'attractor_l2': 'l2_samorazv_01',
    },
    'Поиск романтических отношений': {
        'linked_id': 's33',
        'attractor_l2': 'l2_semya_01',
    },
}

# Fuzzy-маппинг ID (Разметка → Лист7) для нестандартных форматов
FUZZY_ID_MAP: dict[str, str] = {
    'П_Таня_Диана_06_10.2025': 'П_Таня_06.окт.2025_Диана',
}

AGE_GROUPS = [
    ('18-25', 18, 25),
    ('26-35', 26, 35),
    ('36-45', 36, 45),
    ('46-55', 46, 55),
    ('56+', 56, 200),
]

# Ручной маппинг CSV-колонок аттракторов → L2 ID (неточные совпадения)
ATTRACTOR_COLUMN_FIX: dict[str, str] = {
    'Внешность и ее поддержание/улучшение': 'l2_telo_01',
    'Мужественность/Женственность': 'l2_sotsiium_05',
}


def load_demographics(csv_path: str) -> dict[str, Demographics]:
    """Загружает демографию из CSV → dict[respondent_id → Demographics]."""
    result: dict[str, Demographics] = {}
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            resp_id = row.get('Респондент', '').strip()
            if not resp_id:
                continue

            age_str = row.get('Возраст', '').strip()
            age: int | None = None
            if age_str:
                try:
                    age = int(float(age_str))
                except ValueError:
                    pass

            children_str = row.get('Дети_Наличие', '').strip().lower()
            children_count_str = row.get('Дети_Количество', '').strip()
            children_count = 0
            if children_count_str:
                try:
                    children_count = int(float(children_count_str))
                except ValueError:
                    pass

            result[resp_id] = Demographics(
                gender=row.get('Пол', '').strip(),
                age=age,
                marital_status=row.get('Семейное_положение', '').strip(),
                has_children=children_str == 'да',
                children_count=children_count,
            )

    return result


def load_attractor_scores(
    csv_path: str, attractors_json_path: str
) -> dict[str, dict[str, int]]:
    """Загружает оценки L2-аттракторов → dict[respondent_id → {l2_id: score}]."""
    # Загрузка L2 label → id маппинга
    with open(attractors_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    l2_label_map: dict[str, str] = {}
    for a in data['attractors']:
        if a.get('level') == 2:
            l2_label_map[a['label'].strip().lower()] = a['id']

    result: dict[str, dict[str, int]] = {}
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        raw_cols = [h.strip() for h in header[1:]]

        # Маппим колонки → L2 ID
        l2_cols: list[str] = []
        for col in raw_cols:
            if col in ATTRACTOR_COLUMN_FIX:
                l2_cols.append(ATTRACTOR_COLUMN_FIX[col])
            elif col.strip().lower() in l2_label_map:
                l2_cols.append(l2_label_map[col.strip().lower()])
            else:
                l2_cols.append(f'extra_{col}')

        for row in reader:
            resp_id = row[0].strip() if row else ''
            if not resp_id:
                continue
            scores: dict[str, int] = {}
            for i, l2_id in enumerate(l2_cols):
                val = row[i + 1].strip() if i + 1 < len(row) else ''
                if val and val.isdigit():
                    scores[l2_id] = int(val)
            result[resp_id] = scores

    return result


def build_attractor_profile(
    resp_ids: list[str],
    attr_map: dict[str, dict[str, int]],
    top_n: int = 10,
) -> dict[str, float] | None:
    """Считает средние оценки L2-аттракторов для группы респондентов.

    Возвращает top_n аттракторов с наибольшей средней оценкой.
    """
    sums: dict[str, float] = {}
    counts: dict[str, int] = {}

    for rid in resp_ids:
        resolved = resolve_id(rid)
        scores = attr_map.get(resolved)
        if not scores:
            continue
        for l2_id, score in scores.items():
            if l2_id.startswith('extra_'):
                continue
            sums[l2_id] = sums.get(l2_id, 0.0) + score
            counts[l2_id] = counts.get(l2_id, 0) + 1

    if not sums:
        return None

    averages = {
        l2_id: round(sums[l2_id] / counts[l2_id], 2)
        for l2_id in sums
        if counts[l2_id] > 0
    }

    # Топ-N по средней оценке
    sorted_items = sorted(averages.items(), key=lambda x: x[1], reverse=True)
    return dict(sorted_items[:top_n])


def parse_markup_csv(csv_path: str) -> list[SituationData]:
    """Парсит CSV разметки и возвращает ситуации с ID респондентов."""
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        row_situations = next(reader)
        row_strategies = next(reader)

        situations: list[SituationData] = []
        current_name: str | None = None

        for i in range(1, len(row_situations)):
            sit_name = row_situations[i].strip()
            strat_name = row_strategies[i].strip() if i < len(row_strategies) else ''

            if not strat_name:
                continue

            if sit_name != current_name:
                current_name = sit_name
                situations.append(SituationData(name=sit_name))

            situations[-1].strategies.append(
                StrategyData(name=strat_name, col_index=i)
            )

        for row in reader:
            resp_id = row[0].strip() if row else ''
            if not resp_id:
                continue

            for sit in situations:
                has_any = any(
                    s.col_index < len(row) and row[s.col_index] in ('0', '1')
                    for s in sit.strategies
                )
                if has_any:
                    sit.respondent_ids.append(resp_id)
                    for s in sit.strategies:
                        val = row[s.col_index] if s.col_index < len(row) else ''
                        if val in ('0', '1'):
                            s.total += 1
                            if val == '1':
                                s.count += 1
                                s.respondent_ids.append(resp_id)

    return situations


def resolve_id(resp_id: str) -> str:
    """Применяет fuzzy-маппинг к ID респондента."""
    return FUZZY_ID_MAP.get(resp_id, resp_id)


def calc_age_group(age: int) -> str | None:
    """Определяет возрастную группу."""
    for label, lo, hi in AGE_GROUPS:
        if lo <= age <= hi:
            return label
    return None


def build_strategy_demographics(
    resp_ids: list[str],
    demo_map: dict[str, Demographics],
) -> dict | None:
    """Считает агрегированную демографию для списка респондентов."""
    ages: list[int] = []
    genders: dict[str, int] = {}
    age_groups: dict[str, int] = {label: 0 for label, _, _ in AGE_GROUPS}
    matched = 0

    for rid in resp_ids:
        resolved = resolve_id(rid)
        demo = demo_map.get(resolved)
        if not demo:
            continue
        matched += 1

        if demo.age is not None:
            ages.append(demo.age)
            grp = calc_age_group(demo.age)
            if grp:
                age_groups[grp] += 1

        if demo.gender:
            genders[demo.gender] = genders.get(demo.gender, 0) + 1

    if matched == 0:
        return None

    total_gender = sum(genders.values())
    gender_split = {
        g: round(c / total_gender, 4) for g, c in genders.items()
    } if total_gender > 0 else {}

    return {
        'avgAge': round(sum(ages) / len(ages), 1) if ages else None,
        'genderSplit': gender_split,
        'byAgeGroup': {
            label: {'count': age_groups[label]}
            for label, _, _ in AGE_GROUPS
            if age_groups[label] > 0
        },
    }


def build_situation_demographics(
    resp_ids: list[str],
    demo_map: dict[str, Demographics],
) -> dict | None:
    """Считает демографию на уровне ситуации."""
    ages: list[int] = []
    genders: dict[str, int] = {}
    matched = 0

    for rid in resp_ids:
        resolved = resolve_id(rid)
        demo = demo_map.get(resolved)
        if not demo:
            continue
        matched += 1

        if demo.age is not None:
            ages.append(demo.age)
        if demo.gender:
            genders[demo.gender] = genders.get(demo.gender, 0) + 1

    if matched == 0:
        return None

    total_gender = sum(genders.values())
    gender_split = {
        g: round(c / total_gender, 4) for g, c in genders.items()
    } if total_gender > 0 else {}

    return {
        'avgAge': round(sum(ages) / len(ages), 1) if ages else None,
        'genderSplit': gender_split,
        'ageRange': [min(ages), max(ages)] if ages else None,
    }


GENDER_MAP: dict[str, str] = {
    'муж': 'male',
    'жен': 'female',
}

MARITAL_MAP: dict[str, str] = {
    'в браке': 'married',
    'в отношениях': 'civil_union',
    'сингл': 'not_married',
    'в разводе': 'divorced',
    'вдовствует': 'widowed',
}


def build_respondents(
    situations: list[SituationData],
    demo_map: dict[str, Demographics],
    attr_map: dict[str, dict[str, int]] | None,
) -> list[dict]:
    """Строит массив респондентов с демографией, аттракторами и стратегиями."""
    # Собираем маппинг ситуация → markup_id + порядок стратегий
    sit_meta: dict[str, tuple[str, list[str]]] = {}  # sit.name → (markup_id, [strat_names])
    counter = 0
    for sit in situations:
        mapping = SITUATION_MAP.get(sit.name, {})
        if not mapping.get('linked_id'):
            continue
        counter += 1
        markup_id = f'mk{counter:02d}'
        strat_names = [s.name for s in sit.strategies]
        sit_meta[sit.name] = (markup_id, strat_names)

    # Собираем все уникальные ID респондентов
    all_resp_ids: set[str] = set()
    for sit in situations:
        if sit.name in sit_meta:
            all_resp_ids.update(sit.respondent_ids)

    # Для каждого респондента — собираем его ответы по всем ситуациям
    resp_strategies: dict[str, dict[str, list[int]]] = {}
    for sit in situations:
        if sit.name not in sit_meta:
            continue
        markup_id, _ = sit_meta[sit.name]
        for resp_id in sit.respondent_ids:
            if resp_id not in resp_strategies:
                resp_strategies[resp_id] = {}
            answers: list[int] = []
            for s in sit.strategies:
                answers.append(1 if resp_id in s.respondent_ids else 0)
            resp_strategies[resp_id][markup_id] = answers

    result: list[dict] = []
    seq = 0
    for resp_id in sorted(all_resp_ids):
        resolved = resolve_id(resp_id)
        demo = demo_map.get(resolved)
        if not demo:
            continue

        gender = GENDER_MAP.get(demo.gender, '')
        if not gender:
            continue

        marital = MARITAL_MAP.get(demo.marital_status, '')

        # Аттракторы (sparse, только ненулевые)
        attractors: dict[str, int] = {}
        if attr_map:
            scores = attr_map.get(resolved, {})
            attractors = {
                k: v for k, v in scores.items()
                if v > 0 and not k.startswith('extra_')
            }

        strats = resp_strategies.get(resp_id, {})
        if not strats:
            continue

        seq += 1
        result.append({
            'id': f'P{seq:03d}',
            'gender': gender,
            'age': demo.age,
            'maritalStatus': marital,
            'childrenCount': demo.children_count,
            'attractors': attractors,
            'strategies': strats,
        })

    return result


def build_json(
    situations: list[SituationData],
    demo_map: dict[str, Demographics],
    attr_map: dict[str, dict[str, int]] | None = None,
) -> dict:
    """Конвертирует данные в JSON-формат с ситуациями и респондентами."""
    sit_list: list[dict] = []

    counter = 0
    for sit in situations:
        mapping = SITUATION_MAP.get(sit.name, {})
        if not mapping.get('linked_id'):
            continue
        counter += 1
        markup_id = f'mk{counter:02d}'

        # Список имён стратегий (порядок = индексы в respondent.strategies)
        strategy_names = [s.name for s in sit.strategies]

        strategies_json = []
        for s in sit.strategies:
            frequency = round(s.count / s.total, 4) if s.total > 0 else 0
            strat_entry: dict = {
                'name': s.name,
                'frequency': frequency,
                'respondents': s.total,
                'count': s.count,
            }

            strat_demo = build_strategy_demographics(s.respondent_ids, demo_map)
            if strat_demo:
                strat_entry['demographics'] = strat_demo

            if attr_map:
                attr_profile = build_attractor_profile(
                    s.respondent_ids, attr_map
                )
                if attr_profile:
                    strat_entry['attractorProfile'] = attr_profile

            strategies_json.append(strat_entry)

        strategies_json.sort(key=lambda x: x['frequency'], reverse=True)

        entry: dict = {
            'id': markup_id,
            'title': sit.name,
            'attractorL2': mapping.get('attractor_l2', ''),
            'strategyNames': strategy_names,
            'strategies': strategies_json,
            'totalRespondents': max(
                (s.total for s in sit.strategies), default=0
            ),
        }

        linked = mapping.get('linked_id', '')
        if linked:
            entry['linkedSituationId'] = linked

        sit_demo = build_situation_demographics(sit.respondent_ids, demo_map)
        if sit_demo:
            entry['demographics'] = sit_demo

        if attr_map:
            sit_attr = build_attractor_profile(sit.respondent_ids, attr_map)
            if sit_attr:
                entry['attractorProfile'] = sit_attr

        sit_list.append(entry)

    respondents = build_respondents(situations, demo_map, attr_map)

    return {
        'situations': sit_list,
        'respondents': respondents,
    }


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    markup_path = os.path.join(project_dir, '.data', 'markup_dataset.csv')
    demo_path = os.path.join(project_dir, '.data', 'demographics.csv')
    attr_path = os.path.join(project_dir, '.data', 'attractor_scores.csv')
    attractors_json = os.path.join(project_dir, 'data', 'attractors.json')
    output_dir = os.path.join(project_dir, 'public', 'data')
    output_path = os.path.join(output_dir, 'markup.json')

    os.makedirs(output_dir, exist_ok=True)

    # Загрузка демографии
    demo_map: dict[str, Demographics] = {}
    if os.path.exists(demo_path):
        demo_map = load_demographics(demo_path)
        print(f'✓ Демография: {len(demo_map)} респондентов')
    else:
        print(f'⚠ Файл демографии не найден: {demo_path}')

    # Загрузка аттракторов
    attr_map: dict[str, dict[str, int]] | None = None
    if os.path.exists(attr_path) and os.path.exists(attractors_json):
        attr_map = load_attractor_scores(attr_path, attractors_json)
        print(f'✓ Аттракторы: {len(attr_map)} респондентов')
    else:
        print(f'⚠ Аттракторы не найдены: {attr_path}')

    # Парсинг разметки
    situations = parse_markup_csv(markup_path)

    # Статистика маппинга
    if demo_map:
        all_markup_ids: set[str] = set()
        for sit in situations:
            all_markup_ids.update(sit.respondent_ids)
        matched = sum(1 for rid in all_markup_ids if resolve_id(rid) in demo_map)
        print(f'  Маппинг: {matched}/{len(all_markup_ids)} респондентов '
              f'({round(matched / len(all_markup_ids) * 100, 1)}%)')

    # Генерация JSON
    json_data = build_json(situations, demo_map, attr_map)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    resp_count = len(json_data.get('respondents', []))
    sit_list = json_data.get('situations', [])
    print(f'\n✓ Записано в {output_path}')
    print(f'  Ситуаций: {len(sit_list)}, Респондентов: {resp_count}')
    for entry in sit_list:
        linked = entry.get('linkedSituationId', '—')
        demo = entry.get('demographics', {})
        avg_age = demo.get('avgAge', '—')
        gender = demo.get('genderSplit', {})
        gender_str = ', '.join(f'{g}:{round(p*100)}%' for g, p in gender.items())
        print(
            f'  {entry["id"]}: {entry["title"][:45]:<45s} '
            f'→ {linked}  n={entry["totalRespondents"]}  '
            f'age={avg_age}  {gender_str}'
        )
        # Аттракторный профиль ситуации (top-5)
        sit_attr = entry.get('attractorProfile', {})
        if sit_attr:
            top5 = list(sit_attr.items())[:5]
            attr_str = ', '.join(f'{k}={v}' for k, v in top5)
            print(f'    top attractors: {attr_str}')
        for s in entry['strategies']:
            pct = round(s['frequency'] * 100, 1)
            s_demo = s.get('demographics', {})
            s_age = s_demo.get('avgAge', '')
            print(f'    {pct:5.1f}%  {s["name"]}'
                  + (f'  (avg_age={s_age})' if s_age else ''))


if __name__ == '__main__':
    main()
