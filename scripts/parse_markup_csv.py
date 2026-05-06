#!/usr/bin/env python3
"""Парсер CSV разметки + демографии + аттракторов → public/data/markup.json.

Читает три CSV:
  .data/markup_dataset.csv    — поведенческие ответы (ситуации × стратегии, 0/1)
  .data/demographics.csv      — демография респондентов
  .data/attractor_scores.csv  — оценки L2-аттракторов (0–3) каждого респондента

Маппинг CSV-ситуаций на стабильные id ведётся через
``public/data/situations_registry.json`` — единый source of truth.
Все названия ситуаций в CSV должны иметь `csvAliases` в registry,
иначе парсер падает с понятной ошибкой.

⚠️  Исходные CSV содержат индивидуальные данные. Выходной JSON содержит
    только агрегаты и анонимизированные записи — точный возраст заменяется
    на возрастную группу, ID обезличены (P001, P002, …).
"""

from __future__ import annotations

import csv
import ast
import json
import os
import sys
from dataclasses import dataclass, field

# Импорт работает при запуске из корня проекта (sys.path добавлен в main).
from lib.registry import Registry, RegistryError, load_registry


@dataclass
class Demographics:
    gender: str = ''
    age: int | None = None
    marital_status: str = ''
    has_children: bool = False
    children_count: int = 0
    education: str = ''
    living_with: list[str] = field(default_factory=list)


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
    sit_id: str  # id из registry
    strategies: list[StrategyData] = field(default_factory=list)
    respondent_ids: list[str] = field(default_factory=list)


# Fuzzy-маппинг ID (Разметка → Лист7) для нестандартных форматов
FUZZY_ID_MAP: dict[str, str] = {
    'П_Таня_Диана_06_10.2025': 'П_Таня_06.окт.2025_Диана',
}

AGE_GROUPS: list[tuple[str, int, int]] = [
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
    with open(csv_path, encoding='utf-8') as f:
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
                education=normalize_education(row.get('Уровень_образования', '')),
                living_with=parse_living_with(row.get('Проживание_Совместно_С', '')),
            )

    return result


def normalize_education(value: str) -> str:
    """Приводит свободный текст образования к стабильным категориям фильтра."""
    raw = value.strip().lower()
    if not raw:
        return ''
    if 'переподготов' in raw:
        if 'магистр' in raw:
            return 'master'
        return 'specialist'
    mapping = {
        'среднее': 'secondary',
        'среднее профессиональное': 'vocational',
        'неоконченное высшее': 'incomplete_higher',
        'бакалавр': 'bachelor',
        'специалист': 'specialist',
        'магистр': 'master',
        'аспирантура': 'postgraduate',
        'кандидат наук': 'phd',
    }
    return mapping.get(raw, raw)


def parse_living_with(value: str) -> list[str]:
    """Разбирает список совместного проживания из CSV в стабильный массив."""
    raw = value.strip()
    if not raw:
        return []

    items: list[str]
    if raw.startswith('['):
        try:
            parsed = ast.literal_eval(raw)
            items = [str(item) for item in parsed] if isinstance(parsed, list) else [raw]
        except (SyntaxError, ValueError):
            items = [raw]
    else:
        normalized = raw.replace(';', ',')
        items = [part for part in normalized.split(',')]

    result: list[str] = []
    aliases = {
        'с партнёром': 'partner',
        'с партнером': 'partner',
        'с детьми': 'children',
        'с родителями': 'parents',
        'с родственниками': 'relatives',
        'с друзьями': 'friends',
        'с соседями': 'neighbors',
        'общежитие': 'dorm',
        'в одиночку': 'alone',
    }
    for item in items:
        key = item.strip().strip('"').strip("'").lower()
        mapped = aliases.get(key)
        if mapped and mapped not in result:
            result.append(mapped)
    return result


def load_attractor_scores(
    csv_path: str, attractors_json_path: str
) -> dict[str, dict[str, int]]:
    """Загружает оценки L2-аттракторов → dict[respondent_id → {l2_id: score}]."""
    with open(attractors_json_path, encoding='utf-8') as f:
        data = json.load(f)
    l2_label_map: dict[str, str] = {}
    for a in data['attractors']:
        if a.get('level') == 2:
            l2_label_map[a['label'].strip().lower()] = a['id']

    result: dict[str, dict[str, int]] = {}
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        raw_cols = [h.strip() for h in header[1:]]

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
    """Считает средние оценки L2-аттракторов для группы респондентов."""
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

    sorted_items = sorted(averages.items(), key=lambda x: x[1], reverse=True)
    return dict(sorted_items[:top_n])


def parse_markup_csv(
    csv_path: str, registry: Registry
) -> list[SituationData]:
    """Парсит CSV разметки и сопоставляет ситуации с registry.

    Падает с RegistryError, если в CSV есть название ситуации без алиаса
    в registry — это требует сознательного решения, что мапить.
    """
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.reader(f)
        row_situations = next(reader)
        row_strategies = next(reader)

        situations: list[SituationData] = []
        unknown: dict[str, list[str]] = {}
        current_csv_name: str | None = None
        current_sit: SituationData | None = None

        for i in range(1, len(row_situations)):
            csv_name = row_situations[i].strip()
            strat_name = row_strategies[i].strip() if i < len(row_strategies) else ''

            if not strat_name or not csv_name:
                continue

            if csv_name != current_csv_name:
                current_csv_name = csv_name
                sit_id = registry.find_by_alias(csv_name)
                if sit_id is None:
                    unknown.setdefault(csv_name, [])
                    current_sit = None
                else:
                    current_sit = SituationData(name=csv_name, sit_id=sit_id)
                    situations.append(current_sit)

            if current_sit is not None:
                current_sit.strategies.append(
                    StrategyData(name=strat_name, col_index=i)
                )
            elif current_csv_name is not None:
                unknown[current_csv_name].append(strat_name)

        if unknown:
            details = '\n'.join(
                f'  • «{name}» ({len(strats)} стратегий)'
                for name, strats in unknown.items()
            )
            raise RegistryError(
                'В CSV есть ситуации без csvAlias в registry — '
                'добавьте записи в public/data/situations_registry.json '
                'или допишите алиас:\n' + details
            )

        # Считываем ответы
        for row in reader:
            resp_id = row[0].strip() if row else ''
            if not resp_id:
                continue

            for sit in situations:
                has_any = any(
                    s.col_index < len(row) and row[s.col_index] in ('0', '1')
                    for s in sit.strategies
                )
                if not has_any:
                    continue
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
    return FUZZY_ID_MAP.get(resp_id, resp_id)


def calc_age_group(age: int) -> str | None:
    for label, lo, hi in AGE_GROUPS:
        if lo <= age <= hi:
            return label
    return None


def build_strategy_demographics(
    resp_ids: list[str],
    demo_map: dict[str, Demographics],
) -> dict | None:
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
    """Строит массив респондентов с демографией, аттракторами и стратегиями.

    Респондент попадает в выборку ситуации только если у него хоть одна
    непустая клетка по этой ситуации (см. parse_markup_csv).
    """
    all_resp_ids: set[str] = set()
    for sit in situations:
        all_resp_ids.update(sit.respondent_ids)

    resp_strategies: dict[str, dict[str, list[int]]] = {}
    for sit in situations:
        for resp_id in sit.respondent_ids:
            if resp_id not in resp_strategies:
                resp_strategies[resp_id] = {}
            answers: list[int] = [
                1 if resp_id in s.respondent_ids else 0
                for s in sit.strategies
            ]
            resp_strategies[resp_id][sit.sit_id] = answers

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

        age_group = ''
        if demo.age is not None:
            age_group = calc_age_group(demo.age) or ''

        seq += 1
        result.append({
            'id': f'P{seq:03d}',
            'gender': gender,
            'ageGroup': age_group,
            'maritalStatus': marital,
            'childrenCount': demo.children_count,
            'education': demo.education,
            'livingWith': demo.living_with,
            'attractors': attractors,
            'strategies': strats,
        })

    return result


def build_json(
    situations: list[SituationData],
    registry: Registry,
    demo_map: dict[str, Demographics],
    attr_map: dict[str, dict[str, int]] | None = None,
) -> dict:
    """Конвертирует данные в JSON-формат с ситуациями и респондентами."""
    sit_list: list[dict] = []
    by_id: dict[str, SituationData] = {sit.sit_id: sit for sit in situations}

    # Идём в порядке registry, чтобы сериализация была стабильной
    for entry in registry.situations_with_aliases:
        sit = by_id.get(entry.id)
        if sit is None:
            continue

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
                attr_profile = build_attractor_profile(s.respondent_ids, attr_map)
                if attr_profile:
                    strat_entry['attractorProfile'] = attr_profile

            strategies_json.append(strat_entry)

        strategies_json.sort(key=lambda x: x['frequency'], reverse=True)

        out: dict = {
            'id': entry.id,
            'title': entry.title,
            'attractorL2': entry.attractor_l2,
            'category': entry.category,
            'strategyNames': strategy_names,
            'strategies': strategies_json,
            'totalRespondents': max(
                (s.total for s in sit.strategies), default=0
            ),
        }

        sit_demo = build_situation_demographics(sit.respondent_ids, demo_map)
        if sit_demo:
            out['demographics'] = sit_demo

        if attr_map:
            sit_attr = build_attractor_profile(sit.respondent_ids, attr_map)
            if sit_attr:
                out['attractorProfile'] = sit_attr

        sit_list.append(out)

    respondents = build_respondents(situations, demo_map, attr_map)

    return {
        'situations': sit_list,
        'respondents': respondents,
    }


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    sys.path.insert(0, script_dir)

    markup_path = os.path.join(project_dir, '.data', 'markup_dataset.csv')
    demo_path = os.path.join(project_dir, '.data', 'demographics.csv')
    attr_path = os.path.join(project_dir, '.data', 'attractor_scores.csv')
    attractors_json = os.path.join(project_dir, 'data', 'attractors.json')
    output_dir = os.path.join(project_dir, 'public', 'data')
    output_path = os.path.join(output_dir, 'markup.json')

    os.makedirs(output_dir, exist_ok=True)

    try:
        registry = load_registry(project_dir)
    except RegistryError as e:
        print(f'❌ {e}', file=sys.stderr)
        sys.exit(1)
    print(
        f'✓ Registry: {len(registry.situations)} ситуаций, '
        f'{len(registry.situations_with_aliases)} с алиасами'
    )

    demo_map: dict[str, Demographics] = {}
    if os.path.exists(demo_path):
        demo_map = load_demographics(demo_path)
        print(f'✓ Демография: {len(demo_map)} респондентов')
    else:
        print(f'⚠ Файл демографии не найден: {demo_path}')

    attr_map: dict[str, dict[str, int]] | None = None
    if os.path.exists(attr_path) and os.path.exists(attractors_json):
        attr_map = load_attractor_scores(attr_path, attractors_json)
        print(f'✓ Аттракторы: {len(attr_map)} респондентов')
    else:
        print(f'⚠ Аттракторы не найдены: {attr_path}')

    try:
        situations = parse_markup_csv(markup_path, registry)
    except RegistryError as e:
        print(f'❌ {e}', file=sys.stderr)
        sys.exit(1)

    if demo_map:
        all_markup_ids: set[str] = set()
        for sit in situations:
            all_markup_ids.update(sit.respondent_ids)
        if all_markup_ids:
            matched = sum(
                1 for rid in all_markup_ids if resolve_id(rid) in demo_map
            )
            print(
                f'  Маппинг: {matched}/{len(all_markup_ids)} респондентов '
                f'({round(matched / len(all_markup_ids) * 100, 1)}%)'
            )

    json_data = build_json(situations, registry, demo_map, attr_map)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    resp_count = len(json_data.get('respondents', []))
    sit_list = json_data.get('situations', [])
    print(f'\n✓ Записано в {output_path}')
    print(f'  Ситуаций: {len(sit_list)}, Респондентов: {resp_count}')
    for entry in sit_list:
        demo = entry.get('demographics', {})
        avg_age = demo.get('avgAge', '—')
        gender = demo.get('genderSplit', {})
        gender_str = ', '.join(
            f'{g}:{round(p * 100)}%' for g, p in gender.items()
        )
        print(
            f'  {entry["id"]}: {entry["title"][:45]:<45s} '
            f'n={entry["totalRespondents"]}  '
            f'age={avg_age}  {gender_str}'
        )


if __name__ == '__main__':
    main()
