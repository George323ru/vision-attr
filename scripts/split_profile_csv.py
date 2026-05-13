#!/usr/bin/env python3
"""Разделяет общий CSV профилей на demographics.csv и attractor_scores.csv.

Ожидаемый формат входа:
  Респондент, <соцдем-колонки...>, <пустая колонка>, <58 L2-аттракторов...>

Выходные файлы:
  .data/demographics.csv      — Респондент + полный соцдем
  .data/attractor_scores.csv  — Респондент + оценки L2-аттракторов
"""

from __future__ import annotations

import csv
import os
import sys


def split_profile_csv(project_dir: str, source_path: str) -> None:
    data_dir = os.path.join(project_dir, '.data')
    demographics_path = os.path.join(data_dir, 'demographics.csv')
    attractors_path = os.path.join(data_dir, 'attractor_scores.csv')

    with open(source_path, encoding='utf-8', newline='') as f:
        rows = list(csv.reader(f))

    if not rows:
        raise ValueError(f'Пустой CSV: {source_path}')

    header = rows[0]
    try:
        separator_idx = next(i for i, col in enumerate(header) if not col.strip())
    except StopIteration as exc:
        raise ValueError(
            'Не найдена пустая колонка-разделитель между соцдемом и аттракторами'
        ) from exc

    if separator_idx <= 1:
        raise ValueError('Пустая колонка-разделитель стоит слишком рано')

    demo_header = header[:separator_idx]
    attr_header = [header[0]] + header[separator_idx + 1:]

    if len(attr_header) <= 1:
        raise ValueError('После разделителя не найдены колонки аттракторов')

    os.makedirs(data_dir, exist_ok=True)

    with open(demographics_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(demo_header)
        for row in rows[1:]:
            if not row or not row[0].strip():
                continue
            padded = row + [''] * (len(header) - len(row))
            writer.writerow(padded[:separator_idx])

    with open(attractors_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(attr_header)
        for row in rows[1:]:
            if not row or not row[0].strip():
                continue
            padded = row + [''] * (len(header) - len(row))
            writer.writerow([padded[0]] + padded[separator_idx + 1:])

    data_rows = sum(1 for row in rows[1:] if row and row[0].strip())
    print(f'✓ Source rows: {data_rows}')
    print(f'✓ Socdem columns: {len(demo_header) - 1}')
    print(f'✓ Attractor columns: {len(attr_header) - 1}')
    print(f'✓ Written: {demographics_path}')
    print(f'✓ Written: {attractors_path}')


def main() -> None:
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_path = (
        sys.argv[1]
        if len(sys.argv) > 1
        else os.path.join(project_dir, '.data', 'respondent_profiles.csv')
    )
    split_profile_csv(project_dir, source_path)


if __name__ == '__main__':
    main()
