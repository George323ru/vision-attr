#!/usr/bin/env python3
"""Парсит CSV корреляций → public/data/correlations.json.

Формат CSV: колонки `category,variable,r,p`.
Источник по умолчанию: ~/Downloads/correlations_p005.csv (можно передать аргументом).

Логика:
  1. Маппит названия CSV на label L2-аттракторов из data/attractors.json.
     Нормализация: ё→е, '/' → ',', нижний регистр, схлопывание пробелов.
  2. Игнорирует не-L2 переменные (Возраст, Дети_Количество, Сиблинги_Количество).
  3. Дедупицирует симметричные пары: для каждой неупорядоченной пары {A,B}
     берётся первая встретившаяся строка (полные дубликаты тоже свёртываются).
  4. strength = |r| / max(|r|) — нормировка на максимум по выборке (шкала 0..1).
  5. type: r ≥ 0 → 'reinforcing', r < 0 → 'conflicting'.

Формат вывода:
  { "maxAbsR": 0.51,
    "correlations": [
      { "id": "c0001", "from": "l2_xxx", "to": "l2_yyy",
        "type": "reinforcing", "r": 0.49, "strength": 0.96 }, ... ] }
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ATTRACTORS_JSON = ROOT / "data" / "attractors.json"
OUTPUT_JSON = ROOT / "public" / "data" / "correlations.json"
DEFAULT_CSV = Path.home() / "Downloads" / "correlations_p005.csv"

# Имена переменных, которые НЕ являются L2-аттракторами.
NON_L2_VARIABLES = {
    "Возраст",
    "Дети_Количество",
    "Дети\\_Количество",
    "Сиблинги_Количество",
    "Сиблинги\\_Количество",
}


def normalize(name: str) -> str:
    """Нормализация для сравнения: ё→е, '/'→',', пробелы вокруг ',' убираем, lowercase."""
    s = name.strip()
    s = s.replace("ё", "е").replace("Ё", "Е")
    s = s.replace("/", ",")
    s = " ".join(s.split())
    # схлопываем пробелы вокруг запятой: "X, Y" и "X,Y" → один и тот же ключ
    s = ",".join(part.strip() for part in s.split(","))
    return s.lower()


def load_l2_index() -> dict[str, str]:
    """{normalized_label: l2_id} по data/attractors.json."""
    with ATTRACTORS_JSON.open(encoding="utf-8") as f:
        data = json.load(f)
    index: dict[str, str] = {}
    for a in data.get("attractors", []):
        if a.get("level") != 2:
            continue
        label = a.get("label", "")
        index[normalize(label)] = a["id"]
    return index


def main() -> int:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.exists():
        print(f"CSV не найден: {csv_path}", file=sys.stderr)
        return 1

    l2_index = load_l2_index()
    print(f"L2 attractors: {len(l2_index)}")

    with csv_path.open(encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        if [c.strip().lower() for c in header[:4]] != ["category", "variable", "r", "p"]:
            print(f"Неожиданный заголовок CSV: {header}", file=sys.stderr)
            return 1
        rows = list(reader)

    print(f"CSV строк: {len(rows)}")

    skipped_non_l2 = 0
    skipped_unknown = 0
    parsed: list[tuple[str, str, float, float]] = []
    unknown_names: set[str] = set()

    for row in rows:
        if len(row) < 4:
            continue
        cat, var, r_str, p_str = row[0], row[1], row[2], row[3]
        if cat in NON_L2_VARIABLES or var in NON_L2_VARIABLES:
            skipped_non_l2 += 1
            continue
        from_id = l2_index.get(normalize(cat))
        to_id = l2_index.get(normalize(var))
        if not from_id:
            unknown_names.add(cat)
        if not to_id:
            unknown_names.add(var)
        if not from_id or not to_id:
            skipped_unknown += 1
            continue
        if from_id == to_id:
            continue
        try:
            r = float(r_str)
            p = float(p_str)
        except ValueError:
            continue
        parsed.append((from_id, to_id, r, p))

    print(f"  не-L2 строк пропущено: {skipped_non_l2}")
    print(f"  не сопоставлено имён: {skipped_unknown}")
    if unknown_names:
        print(f"  unknown labels: {sorted(unknown_names)}")

    # Дедуп симметричных пар по неориентированному ключу.
    seen: dict[frozenset[str], tuple[str, str, float, float]] = {}
    for from_id, to_id, r, p in parsed:
        key = frozenset({from_id, to_id})
        if key in seen:
            continue
        seen[key] = (from_id, to_id, r, p)

    print(f"Уникальных неориентированных пар: {len(seen)}")

    max_abs_r = max((abs(rec[2]) for rec in seen.values()), default=1.0)
    print(f"max|r| = {max_abs_r}")

    correlations = []
    for i, (from_id, to_id, r, p) in enumerate(sorted(seen.values()), start=1):
        ctype = "reinforcing" if r >= 0 else "conflicting"
        strength = abs(r) / max_abs_r if max_abs_r > 0 else 0.0
        correlations.append(
            {
                "id": f"c{i:04d}",
                "from": from_id,
                "to": to_id,
                "type": ctype,
                "r": round(r, 4),
                "strength": round(strength, 4),
            }
        )

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(
            {"maxAbsR": max_abs_r, "correlations": correlations},
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"Записано: {OUTPUT_JSON.relative_to(ROOT)} ({len(correlations)} рёбер)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
