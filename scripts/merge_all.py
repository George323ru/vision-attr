#!/usr/bin/env python3
"""
Объединение трёх CSV в единую Analytical Base Table (ABT).

Входные данные (все в .data/, не отслеживаются git):
  demographics.csv      — демография (пол, возраст, семья, образование)
  attractor_scores.csv  — оценки L2-аттракторов (0–3)
  markup_dataset.csv    — поведенческие ответы по ситуациям (0/1)

Выход:
  .data/merged_respondents.csv — плоская таблица, 1 строка = 1 респондент

⚠️  КОНФИДЕНЦИАЛЬНОСТЬ: merged_respondents.csv содержит индивидуальные данные
    респондентов. Файл НЕ должен попадать в git или публичные хранилища.
    .data/ уже в .gitignore и .dockerignore.
"""

import csv
import json
import os
import sys


# Fuzzy-маппинг ID (Разметка → остальные таблицы)
FUZZY_ID_MAP: dict[str, str] = {
    'П_Таня_Диана_06_10.2025': 'П_Таня_06.окт.2025_Диана',
}

# Ручной маппинг CSV-колонок аттракторов → L2 ID (для неточных совпадений)
COLUMN_FIX: dict[str, str] = {
    'Внешность и ее поддержание/улучшение': 'l2_telo_01',
    'Мужественность/Женственность': 'l2_sotsiium_05',
}


def load_l2_label_map(attractors_json_path: str) -> dict[str, str]:
    """Загружает маппинг label → L2 ID из attractors.json."""
    with open(attractors_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    result: dict[str, str] = {}
    for a in data['attractors']:
        if a.get('level') == 2:
            result[a['label'].strip().lower()] = a['id']
    return result


def map_column_to_l2(col_name: str, l2_label_map: dict[str, str]) -> str:
    """Маппит название колонки CSV на L2 ID."""
    if col_name in COLUMN_FIX:
        return COLUMN_FIX[col_name]
    key = col_name.strip().lower()
    if key in l2_label_map:
        return l2_label_map[key]
    # Fuzzy: проверяем вхождение
    for label, l2_id in l2_label_map.items():
        if key in label or label in key:
            return l2_id
    return f'extra_{col_name.replace(" ", "_").replace(",", "")}'


def resolve_id(resp_id: str) -> str:
    """Применяет fuzzy-маппинг к ID респондента."""
    return FUZZY_ID_MAP.get(resp_id, resp_id)


def load_demographics(csv_path: str) -> dict[str, dict[str, str]]:
    """Читает демографию → dict[id → {field: value}]."""
    result: dict[str, dict[str, str]] = {}
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            resp_id = row.get('Респондент', '').strip()
            if not resp_id:
                continue
            result[resp_id] = {
                'gender': row.get('Пол', '').strip(),
                'age': row.get('Возраст', '').strip(),
                'marital_status': row.get('Семейное_положение', '').strip(),
                'has_children': row.get('Дети_Наличие', '').strip(),
                'children_count': row.get('Дети_Количество', '').strip(),
                'education': row.get('Уровень_образования', '').strip(),
                'living_with': row.get('Проживание_Совместно_С', '').strip(),
            }
    return result


def load_attractor_scores(
    csv_path: str, l2_label_map: dict[str, str]
) -> tuple[dict[str, dict[str, str]], list[str]]:
    """Читает оценки аттракторов → dict[id → {l2_id: score}], columns."""
    result: dict[str, dict[str, str]] = {}
    l2_columns: list[str] = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        raw_cols = [h.strip() for h in header[1:]]

        # Маппим колонки → L2 ID
        l2_columns = [map_column_to_l2(col, l2_label_map) for col in raw_cols]

        for row in reader:
            resp_id = row[0].strip() if row else ''
            if not resp_id:
                continue
            scores: dict[str, str] = {}
            for i, l2_id in enumerate(l2_columns):
                val = row[i + 1].strip() if i + 1 < len(row) else ''
                scores[l2_id] = val
            result[resp_id] = scores

    return result, l2_columns


def load_markup(csv_path: str) -> tuple[dict[str, dict[str, str]], list[str]]:
    """Читает разметку → dict[id → {strategy_col: 0/1}], columns."""
    # Маппинг ситуаций → situation ID
    situation_ids: dict[str, str] = {
        'Рождение ребенка': 's19',
        'Смена места работы/выход на новое место работы': 's32',
        'Переезд в другой город или регион внутри страны': 's31',
        'Официальная регистрация брака / свадьба / венчание': 's21',
        'Развод': 's01',
        'Появление повода/необходимости обратиться к врачу '
        '(какие-либо симптомы, направление, плановый осмотр)': 's09',
        'Поступление в ВУЗ / ССУЗ': 's04',
        'Поиск романтических отношений': 's33',
    }

    result: dict[str, dict[str, str]] = {}
    strategy_columns: list[str] = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        row_situations = next(reader)
        row_strategies = next(reader)

        # Создаём имена столбцов: sit_{s_id}_{strategy_name}
        col_map: list[tuple[int, str]] = []
        for i in range(1, len(row_situations)):
            sit_name = row_situations[i].strip()
            strat_name = row_strategies[i].strip() if i < len(row_strategies) else ''
            if not strat_name:
                continue
            sit_id = situation_ids.get(sit_name, '')
            if not sit_id:
                continue
            col_name = f'sit_{sit_id}_{strat_name}'
            col_map.append((i, col_name))

        strategy_columns = [cm[1] for cm in col_map]

        for row in reader:
            resp_id = row[0].strip() if row else ''
            if not resp_id:
                continue
            resolved = resolve_id(resp_id)
            answers: dict[str, str] = {}
            for col_idx, col_name in col_map:
                val = row[col_idx].strip() if col_idx < len(row) else ''
                answers[col_name] = val
            result[resolved] = answers

    return result, strategy_columns


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(project_dir, '.data')

    demo_path = os.path.join(data_dir, 'demographics.csv')
    attr_path = os.path.join(data_dir, 'attractor_scores.csv')
    markup_path = os.path.join(data_dir, 'markup_dataset.csv')
    attractors_json = os.path.join(project_dir, 'data', 'attractors.json')
    output_path = os.path.join(data_dir, 'merged_respondents.csv')

    for path in [demo_path, attr_path, markup_path, attractors_json]:
        if not os.path.exists(path):
            print(f'✗ Файл не найден: {path}')
            sys.exit(1)

    # 1. Загрузка L2 маппинга
    l2_label_map = load_l2_label_map(attractors_json)
    print(f'✓ L2 маппинг: {len(l2_label_map)} аттракторов')

    # 2. Загрузка данных
    demographics = load_demographics(demo_path)
    print(f'✓ Демография: {len(demographics)} респондентов')

    attractor_scores, l2_columns = load_attractor_scores(attr_path, l2_label_map)
    print(f'✓ Аттракторы: {len(attractor_scores)} респондентов, '
          f'{len(l2_columns)} колонок')

    markup_data, strategy_columns = load_markup(markup_path)
    print(f'✓ Разметка: {len(markup_data)} респондентов, '
          f'{len(strategy_columns)} стратегий')

    # 3. Объединение (LEFT JOIN от демографии/аттракторов)
    demo_fields = [
        'gender', 'age', 'marital_status', 'has_children',
        'children_count', 'education', 'living_with',
    ]
    header = ['id'] + demo_fields + l2_columns + strategy_columns

    # Все ID из демографии (полный набор)
    all_ids = sorted(demographics.keys())

    rows_written = 0
    markup_matched = 0

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)

        for resp_id in all_ids:
            demo = demographics.get(resp_id, {})
            attrs = attractor_scores.get(resp_id, {})
            markup = markup_data.get(resp_id, {})

            if markup:
                markup_matched += 1

            row = [resp_id]
            row.extend(demo.get(field, '') for field in demo_fields)
            row.extend(attrs.get(col, '') for col in l2_columns)
            row.extend(markup.get(col, '') for col in strategy_columns)

            writer.writerow(row)
            rows_written += 1

    print(f'\n✓ Записано в {output_path}')
    print(f'  Строк: {rows_written}')
    print(f'  Столбцов: {len(header)}')
    print(f'  С разметкой: {markup_matched}/{rows_written} '
          f'({round(markup_matched / rows_written * 100, 1)}%)')
    print(f'\n⚠️  Файл содержит индивидуальные данные — '
          f'не загружать в публичные хранилища!')


if __name__ == '__main__':
    main()
