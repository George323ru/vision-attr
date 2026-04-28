#!/usr/bin/env python3
"""
Enrich data/attractors.json with L2 descriptions and insight lists from
.data/insights.csv.

The frontend already reads description/insights from attractors.json, so this
script keeps the public JSON shape unchanged and only updates matched L2 nodes.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
INSIGHTS_CSV = ROOT / ".data" / "insights.csv"
ATTRACTORS_JSON = ROOT / "data" / "attractors.json"

REQUIRED_COLUMNS = {"раздел", "аттрактор", "описание", "номер_инсайта", "инсайт"}

ATTRACTOR_ALIASES = {
    ("Быт", "Место жительства"): ("Быт", "Место жительства (город, регион)"),
    ("Тело", "Внешность и ее поддержание/улучшение"): (
        "Тело",
        "Внешность и ее поддержание, улучшение",
    ),
    ("Социум", "Мужественность/Женственность"): (
        "Социум",
        "Мужественность, женственность",
    ),
}


def normalize(value: str) -> str:
    value = value.strip()
    value = value.replace("ё", "е").replace("Ё", "Е")
    value = value.replace("_", ", ")
    value = re.sub(r",\s*", ", ", value)
    value = re.sub(r"\s+", " ", value)
    return value.lower()


def clean_text(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^[-–—]\s+", "", value)
    value = re.sub(r"\s+([,.;:!?])", r"\1", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value


def aliased_key(section: str, label: str) -> tuple[str, str]:
    return ATTRACTOR_ALIASES.get((section, label), (section, label))


def normalized_key(section: str, label: str) -> tuple[str, str]:
    return normalize(section), normalize(label)


def load_insight_groups(path: Path) -> dict[tuple[str, str], list[dict[str, str]]]:
    if not path.exists():
        raise FileNotFoundError(f"Insights CSV not found: {path}")

    groups: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"Insights CSV is empty: {path}")

        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            missing_cols = ", ".join(sorted(missing))
            raise ValueError(f"Insights CSV is missing columns: {missing_cols}")

        for line_no, row in enumerate(reader, start=2):
            section = clean_text(row["раздел"])
            label = clean_text(row["аттрактор"])
            description = clean_text(row["описание"])
            insight_no = clean_text(row["номер_инсайта"])
            insight = clean_text(row["инсайт"])

            if not all([section, label, description, insight_no, insight]):
                raise ValueError(f"Empty required cell in insights CSV line {line_no}")

            try:
                parsed_no = int(insight_no)
            except ValueError as exc:
                raise ValueError(
                    f"Invalid insight number {insight_no!r} in line {line_no}"
                ) from exc

            target_section, target_label = aliased_key(section, label)
            key = normalized_key(target_section, target_label)
            groups[key].append(
                {
                    "section": section,
                    "label": label,
                    "target_section": target_section,
                    "target_label": target_label,
                    "description": description,
                    "number": str(parsed_no),
                    "insight": insight,
                    "line": str(line_no),
                }
            )

    validate_groups(groups)
    return groups


def validate_groups(groups: dict[tuple[str, str], list[dict[str, str]]]) -> None:
    for rows in groups.values():
        label = f"{rows[0]['target_section']} / {rows[0]['target_label']}"
        descriptions = {r["description"] for r in rows}
        if len(descriptions) != 1:
            raise ValueError(f"Multiple descriptions for {label}")

        numbers = sorted(int(r["number"]) for r in rows)
        expected = list(range(1, len(numbers) + 1))
        if numbers != expected:
            raise ValueError(
                f"Insight numbering for {label} must be {expected}, got {numbers}"
            )


def load_attractors(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Attractors JSON not found: {path}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def build_l2_index(data: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    domain_names = {d["id"]: d["name"] for d in data.get("domains", [])}
    index: dict[tuple[str, str], dict[str, Any]] = {}

    for attr in data.get("attractors", []):
        if attr.get("level") != 2:
            continue

        domain = domain_names.get(attr.get("domain"))
        if not domain:
            raise ValueError(f"Unknown domain for L2 attractor: {attr.get('id')}")

        key = normalized_key(domain, attr.get("label", ""))
        if key in index:
            raise ValueError(f"Duplicate L2 key for domain/label: {domain} / {attr.get('label')}")
        index[key] = attr

    return index


def enrich(data: dict[str, Any], groups: dict[tuple[str, str], list[dict[str, str]]]) -> tuple[int, list[dict[str, Any]]]:
    l2_index = build_l2_index(data)
    unmatched = sorted(set(groups) - set(l2_index))
    if unmatched:
        lines = []
        for key in unmatched:
            row = groups[key][0]
            lines.append(f"- {row['section']} / {row['label']}")
        raise ValueError("Unmatched CSV attractors:\n" + "\n".join(lines))

    updated = 0
    for key, rows in groups.items():
        attr = l2_index[key]
        sorted_rows = sorted(rows, key=lambda r: int(r["number"]))
        attr["description"] = sorted_rows[0]["description"]
        attr["insights"] = "\n".join(f"- {r['insight']}" for r in sorted_rows)
        updated += 1

    preserved = [
        attr
        for key, attr in sorted(
            l2_index.items(),
            key=lambda item: (item[1].get("domain", ""), item[1].get("id", "")),
        )
        if key not in groups
    ]
    return updated, preserved


def save_attractors(path: Path, data: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main() -> int:
    try:
        groups = load_insight_groups(INSIGHTS_CSV)
        data = load_attractors(ATTRACTORS_JSON)
        updated, preserved = enrich(data, groups)
        save_attractors(ATTRACTORS_JSON, data)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    l2_total = sum(1 for a in data.get("attractors", []) if a.get("level") == 2)
    print(f"Insights CSV groups: {len(groups)}")
    print(f"L2 attractors updated: {updated}/{l2_total}")
    if preserved:
        print(f"L2 attractors preserved without CSV rows: {len(preserved)}")
        for attr in preserved:
            print(f"  - {attr.get('id')}: {attr.get('label')}")
    else:
        print("L2 attractors preserved without CSV rows: 0")
    print(f"Wrote {ATTRACTORS_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
