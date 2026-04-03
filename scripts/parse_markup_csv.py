#!/usr/bin/env python3
"""
Парсер CSV разметки → public/data/markup.json
Читает .data/markup_dataset.csv и генерирует JSON с ситуациями и стратегиями
из данных разметки респондентов.

Формат CSV:
  row1: ситуации (повторяются через колонки)
  row2: стратегии (варианты поведения)
  row3+: респонденты (0/1/пусто)
"""

import csv
import json
import os
from dataclasses import dataclass, field


@dataclass
class StrategyData:
    name: str
    col_index: int
    count: int = 0
    total: int = 0


@dataclass
class SituationData:
    name: str
    strategies: list[StrategyData] = field(default_factory=list)


# Маппинг CSV-ситуаций на существующие ID в situations.ts и attractorL2
SITUATION_MAP: dict[str, dict[str, str]] = {
    'Рождение ребенка': {
        'linked_id': 's19',
        'attractor_l2': 'l2_semya_03',
    },
    'Смена места работы/выход на новое место работы': {
        'linked_id': '',
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
        'linked_id': '',
        'attractor_l2': 'l2_semya_01',
    },
    'Начало романтических отношений': {
        'linked_id': '',
        'attractor_l2': 'l2_semya_02',
    },
}


def parse_csv(csv_path: str) -> list[SituationData]:
    """Парсит CSV и возвращает список ситуаций со статистикой стратегий."""
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        row_situations = next(reader)
        row_strategies = next(reader)

        # Собираем структуру: ситуации → стратегии
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

        # Подсчёт частот
        for row in reader:
            for sit in situations:
                has_any = any(
                    s.col_index < len(row) and row[s.col_index] in ('0', '1')
                    for s in sit.strategies
                )
                if has_any:
                    for s in sit.strategies:
                        val = row[s.col_index] if s.col_index < len(row) else ''
                        if val in ('0', '1'):
                            s.total += 1
                            if val == '1':
                                s.count += 1

    return situations


def build_json(situations: list[SituationData]) -> list[dict]:
    """Конвертирует данные в JSON-формат."""
    result: list[dict] = []

    for idx, sit in enumerate(situations, start=1):
        mapping = SITUATION_MAP.get(sit.name, {})
        markup_id = f'mk{idx:02d}'

        strategies_json = []
        for s in sit.strategies:
            frequency = round(s.count / s.total, 4) if s.total > 0 else 0
            strategies_json.append({
                'name': s.name,
                'frequency': frequency,
                'respondents': s.total,
                'count': s.count,
            })

        # Сортируем по частоте (убывание)
        strategies_json.sort(key=lambda x: x['frequency'], reverse=True)

        entry: dict = {
            'id': markup_id,
            'title': sit.name,
            'attractorL2': mapping.get('attractor_l2', ''),
            'strategies': strategies_json,
            'totalRespondents': max(
                (s.total for s in sit.strategies), default=0
            ),
        }

        linked = mapping.get('linked_id', '')
        if linked:
            entry['linkedSituationId'] = linked

        result.append(entry)

    return result


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    csv_path = os.path.join(project_dir, '.data', 'markup_dataset.csv')
    output_dir = os.path.join(project_dir, 'public', 'data')
    output_path = os.path.join(output_dir, 'markup.json')

    os.makedirs(output_dir, exist_ok=True)

    situations = parse_csv(csv_path)
    json_data = build_json(situations)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    print(f'\n✓ Записано в {output_path}')
    print(f'  Ситуаций:    {len(json_data)}')
    for entry in json_data:
        linked = entry.get('linkedSituationId', '—')
        print(
            f'  {entry["id"]}: {entry["title"][:50]:<50s} '
            f'→ {entry["attractorL2"]:<20s} linked={linked}'
        )
        for s in entry['strategies']:
            pct = round(s['frequency'] * 100, 1)
            print(f'    {pct:5.1f}%  {s["name"]}')


if __name__ == '__main__':
    main()
