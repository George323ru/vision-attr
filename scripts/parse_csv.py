#!/usr/bin/env python3
"""
Парсер CSV → data/attractors.json
Читает .data/attractor_dataset.csv и генерирует JSON для графа Vision Attractor.

Структура CSV:
  col1=L1-домен, col2=L2-категория, col3=L3-аттрактор, col4=Описание, col5=Инсайты
  - L1: col1 не пуст, col2 пуст, col3 пуст
  - L2: col1 не пуст, col2 не пуст, col3 пуст
  - L3: col1 не пуст, col2 не пуст, col3 не пуст
"""

import csv
import json
import os
import re

# ============================================================
#  КОНФИГ ДОМЕНОВ: id, цвет (hue/sat), сохраняем совместимость
#  со старыми 5 доменами (семья/работа/саморазв/социум/стаб)
# ============================================================
DOMAIN_CONFIG = {
    'Быт':          {'id': 'byt',        'hue': 30,  'sat': 65},
    'Независимость':{'id': 'nezav',      'hue': 180, 'sat': 55},
    'Переживания':  {'id': 'perezhiv',   'hue': 245, 'sat': 45},
    'Работа':       {'id': 'rabota',     'hue': 210, 'sat': 60},
    'Саморазвитие': {'id': 'samorazv',   'hue': 270, 'sat': 55},
    'Семья':        {'id': 'semya',      'hue': 0,   'sat': 65},
    'Социум':       {'id': 'sotsiium',   'hue': 330, 'sat': 55},
    'Стабильность': {'id': 'stabilnost', 'hue': 160, 'sat': 50},
    'Тело':         {'id': 'telo',       'hue': 15,  'sat': 65},
    'Убеждения':    {'id': 'ubezhdenia', 'hue': 50,  'sat': 55},
    'Увлечения':    {'id': 'uvlechenia', 'hue': 100, 'sat': 60},
}


def normalize(s):
    """Нормализует метку для сравнения: ё→е, _, лишние пробелы"""
    s = s.strip()
    s = s.replace('ё', 'е').replace('Ё', 'Е')
    s = s.replace('_', ', ')          # подчёркивание → «, »
    s = re.sub(r',\s*', ', ', s)      # привести к «, » с единым пробелом
    s = re.sub(r'\s+', ' ', s)        # схлопнуть пробелы
    return s.lower()


def hsl_to_hex(h, s, l):
    """HSL (0-360, 0-100, 0-100) → hex-цвет"""
    s /= 100
    l /= 100
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if 0 <= h < 60:    r, g, b = c, x, 0
    elif 60 <= h < 120: r, g, b = x, c, 0
    elif 120 <= h < 180: r, g, b = 0, c, x
    elif 180 <= h < 240: r, g, b = 0, x, c
    elif 240 <= h < 300: r, g, b = x, 0, c
    else:                r, g, b = c, 0, x
    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)
    return f'#{r:02x}{g:02x}{b:02x}'


def main():
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    csv_path    = os.path.join(project_dir, '.data', 'attractor_dataset.csv')
    output_dir  = os.path.join(project_dir, 'data')
    output_path = os.path.join(output_dir, 'attractors.json')

    os.makedirs(output_dir, exist_ok=True)

    domains    = []
    attractors = []

    seen_domains  = set()
    l2_counters   = {}   # domain_id → int
    l3_counters   = {}   # l2_id     → int
    # Индекс L2 по (domain_id, label) для быстрого поиска родителя в L3
    l2_index      = {}   # (domain_id, label) → l2_id

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # пропустить заголовок

        for row in reader:
            # дополнить до 5 колонок если строка короче
            while len(row) < 5:
                row.append('')

            col1 = row[0].strip()
            col2 = row[1].strip()
            col3 = row[2].strip()
            col4 = row[3].strip()
            col5 = row[4].strip()

            # ── L1 ──────────────────────────────────────────────
            if col1 and not col2 and not col3:
                cfg = DOMAIN_CONFIG.get(col1)
                if not cfg:
                    print(f'  SKIP unknown domain: {col1!r}')
                    continue

                l1_id = 'l1_' + cfg['id']

                if cfg['id'] not in seen_domains:
                    seen_domains.add(cfg['id'])
                    domains.append({
                        'id':          cfg['id'],
                        'name':        col1,
                        'hue':         cfg['hue'],
                        'sat':         cfg['sat'],
                        'color':       hsl_to_hex(cfg['hue'], cfg['sat'], 48),
                        'description': col4,
                    })
                    attractors.append({
                        'id':          l1_id,
                        'label':       col1,
                        'level':       1,
                        'domain':      cfg['id'],
                        'description': col4,
                    })

            # ── L2 ──────────────────────────────────────────────
            elif col1 and col2 and not col3:
                cfg = DOMAIN_CONFIG.get(col1)
                if not cfg:
                    print(f'  SKIP L2 row (неизвестный домен {col1!r}): {col2!r}')
                    continue

                domain_id = cfg['id']
                l1_id     = 'l1_' + domain_id   # ← берём из col1, не из «текущего» L1

                l2_counters[domain_id] = l2_counters.get(domain_id, 0) + 1
                idx = l2_counters[domain_id]

                l2_id = f'l2_{domain_id}_{idx:02d}'
                l3_counters[l2_id] = 0
                l2_index[(domain_id, normalize(col2))] = l2_id

                attractors.append({
                    'id':          l2_id,
                    'label':       col2,
                    'level':       2,
                    'domain':      domain_id,
                    'parent':      l1_id,
                    'description': col4,
                    'insights':    col5,
                })

            # ── L3 ──────────────────────────────────────────────
            elif col1 and col2 and col3:
                cfg = DOMAIN_CONFIG.get(col1)
                if not cfg:
                    print(f'  SKIP L3 row (неизвестный домен {col1!r}): {col3!r}')
                    continue

                domain_id = cfg['id']

                # Ищем родительский L2 по (domain, нормализованная метка)
                l2_id = l2_index.get((domain_id, normalize(col2)))
                if not l2_id:
                    print(f'  SKIP L3 (L2 не найден: domain={domain_id!r}, label={col2!r}): {col3!r}')
                    continue

                l3_counters[l2_id] = l3_counters.get(l2_id, 0) + 1
                idx = l3_counters[l2_id]

                # l3_byt_01_001 из l2_byt_01
                l3_id = f'l3_{l2_id[3:]}_{idx:03d}'

                attractors.append({
                    'id':          l3_id,
                    'label':       col3,
                    'level':       3,
                    'domain':      domain_id,
                    'parent':      l2_id,
                    'description': col4,
                })

    output = {'domains': domains, 'attractors': attractors}

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    l1 = [a for a in attractors if a['level'] == 1]
    l2 = [a for a in attractors if a['level'] == 2]
    l3 = [a for a in attractors if a['level'] == 3]

    print(f'\n✓ Записано в {output_path}')
    print(f'  L1-доменов:       {len(l1)}')
    print(f'  L2-категорий:     {len(l2)}')
    print(f'  L3-аттракторов:   {len(l3)}')
    print(f'  Всего аттракторов:{len(attractors)}')
    print(f'  Размер файла:     {os.path.getsize(output_path):,} байт')


if __name__ == '__main__':
    main()
