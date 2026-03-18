#!/usr/bin/env python3
"""
Парсер CSV → src/data/correlations.ts
Читает .data/corr_attractor_map.csv и генерирует TypeScript-файл с корреляциями.

Маппинг названий L2 → id берётся из public/data/attractors.json.
Отрицательные значения → conflicting, положительные → reinforcing.
"""

import csv
import json
import os

def main():
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    csv_path    = os.path.join(project_dir, '.data', 'corr_attractor_map.csv')
    json_path   = os.path.join(project_dir, 'public', 'data', 'attractors.json')
    output_path = os.path.join(project_dir, 'src', 'data', 'correlations.ts')

    # Загрузить L2-аттракторы и построить маппинг label → id
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    label_to_id = {}
    for a in data['attractors']:
        if a.get('level') == 2:
            key = a['label'].lower().replace('ё', 'е')
            label_to_id[key] = a['id']

    # Прочитать CSV и сгенерировать корреляции
    correlations = []
    skipped = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            label1 = row['Величина 1'].strip()
            label2 = row['Величина 2'].strip()
            value  = float(row['Значение корреляции'])

            key1 = label1.lower().replace('ё', 'е')
            key2 = label2.lower().replace('ё', 'е')

            id1 = label_to_id.get(key1)
            id2 = label_to_id.get(key2)

            if not id1:
                skipped.append(f'  L2 не найден: {label1!r}')
                continue
            if not id2:
                skipped.append(f'  L2 не найден: {label2!r}')
                continue

            corr_type = 'conflicting' if value < 0 else 'reinforcing'
            strength = round(abs(value), 2)

            correlations.append({
                'from': id1,
                'to': id2,
                'baseType': corr_type,
                'strength': strength,
                'type': corr_type,
            })

    # Проверка дубликатов пар
    seen_pairs = set()
    duplicates = []
    for c in correlations:
        pair = tuple(sorted([c['from'], c['to']]))
        if pair in seen_pairs:
            duplicates.append(pair)
        seen_pairs.add(pair)

    # Генерация TypeScript
    lines = ["import type { Correlation } from '@/types/correlation'", '', 'export const CORRELATIONS: Correlation[] = [']

    reinforcing = [c for c in correlations if c['baseType'] == 'reinforcing']
    conflicting = [c for c in correlations if c['baseType'] == 'conflicting']

    idx = 0
    lines.append('  // ── УСИЛЕНИЕ ──────────────────────────────────────────────')
    for c in reinforcing:
        idx += 1
        cid = f'c{idx:02d}' if idx < 100 else f'c{idx}'
        lines.append(
            f"  {{ id: '{cid}', from: '{c['from']}', to: '{c['to']}', "
            f"baseType: 'reinforcing', "
            f"ageRanges: [{{ min: 18, max: 75, strength: {c['strength']}, type: 'reinforcing' }}] }},"
        )

    lines.append('  // ── КОНФЛИКТ ──────────────────────────────────────────────')
    for c in conflicting:
        idx += 1
        cid = f'c{idx:02d}' if idx < 100 else f'c{idx}'
        lines.append(
            f"  {{ id: '{cid}', from: '{c['from']}', to: '{c['to']}', "
            f"baseType: 'conflicting', "
            f"ageRanges: [{{ min: 18, max: 75, strength: {c['strength']}, type: 'conflicting' }}] }},"
        )

    lines.append(']')
    lines.append('')

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    # Отчёт
    print(f'\n✓ Записано в {output_path}')
    print(f'  Усиление (reinforcing): {len(reinforcing)}')
    print(f'  Конфликт (conflicting): {len(conflicting)}')
    print(f'  Всего корреляций:       {idx}')

    if skipped:
        print(f'\n⚠ Пропущено ({len(skipped)}):')
        for s in skipped:
            print(s)

    if duplicates:
        print(f'\n⚠ Дубликаты пар ({len(duplicates)}):')
        for d in duplicates:
            print(f'  {d[0]} ↔ {d[1]}')

    assert idx == len(correlations), f'Несовпадение: {idx} != {len(correlations)}'
    assert len(skipped) == 0, f'Есть пропущенные строки: {skipped}'


if __name__ == '__main__':
    main()
