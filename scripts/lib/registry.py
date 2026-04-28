"""Загрузка и валидация registry ситуаций.

Registry — единственный source of truth для метаданных ситуаций (id, title,
описание, категория, привязка к L2-аттрактору, алиасы названий из CSV).

Формат: см. public/data/situations_registry.json.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass


REGISTRY_PATH = os.path.join('public', 'data', 'situations_registry.json')
ATTRACTORS_PATH = os.path.join('data', 'attractors.json')


@dataclass(frozen=True)
class SituationEntry:
    id: str
    title: str
    description: str
    category: str
    attractor_l2: str
    csv_aliases: tuple[str, ...]
    active: bool


@dataclass(frozen=True)
class CategoryEntry:
    id: str
    title: str
    description: str


@dataclass
class Registry:
    version: str
    generated_at: str
    categories: list[CategoryEntry]
    situations: list[SituationEntry]
    _alias_to_id: dict[str, str]

    def find_by_alias(self, csv_name: str) -> str | None:
        """Возвращает id ситуации по названию из CSV (или None)."""
        return self._alias_to_id.get(csv_name.strip())

    def get(self, sit_id: str) -> SituationEntry | None:
        return next((s for s in self.situations if s.id == sit_id), None)

    @property
    def situations_with_aliases(self) -> list[SituationEntry]:
        return [s for s in self.situations if s.csv_aliases and s.active]


class RegistryError(Exception):
    """Базовый класс ошибок registry — даёт actionable-сообщения парсеру."""


def load_registry(
    project_dir: str | None = None,
    *,
    validate: bool = True,
) -> Registry:
    """Загружает registry. При validate=True — сверяет L2-id с attractors.json
    и проверяет уникальность id/aliases.
    """
    project_dir = project_dir or _project_root()
    path = os.path.join(project_dir, REGISTRY_PATH)

    if not os.path.exists(path):
        raise RegistryError(
            f'Registry не найден: {path}\n'
            f'Создайте файл по образцу или восстановите из git.'
        )

    with open(path, encoding='utf-8') as f:
        raw = json.load(f)

    categories = [
        CategoryEntry(id=c['id'], title=c['title'], description=c['description'])
        for c in raw.get('categories', [])
    ]

    situations: list[SituationEntry] = []
    for s in raw.get('situations', []):
        situations.append(
            SituationEntry(
                id=s['id'],
                title=s['title'],
                description=s['description'],
                category=s['category'],
                attractor_l2=s['attractorL2'],
                csv_aliases=tuple(s.get('csvAliases', [])),
                active=bool(s.get('active', True)),
            )
        )

    alias_to_id: dict[str, str] = {}
    for s in situations:
        for alias in s.csv_aliases:
            alias_to_id[alias.strip()] = s.id

    registry = Registry(
        version=raw.get('version', ''),
        generated_at=raw.get('generatedAt', ''),
        categories=categories,
        situations=situations,
        _alias_to_id=alias_to_id,
    )

    if validate:
        _validate(registry, project_dir)

    return registry


def _validate(registry: Registry, project_dir: str) -> None:
    errors: list[str] = []

    ids = [s.id for s in registry.situations]
    dup_ids = {i for i in ids if ids.count(i) > 1}
    if dup_ids:
        errors.append(f'Дубликаты id ситуаций: {sorted(dup_ids)}')

    cat_ids = {c.id for c in registry.categories}
    bad_cat = [s.id for s in registry.situations if s.category not in cat_ids]
    if bad_cat:
        errors.append(
            f'Ситуации со ссылкой на несуществующую категорию: {bad_cat}.'
            f' Допустимые категории: {sorted(cat_ids)}.'
        )

    seen: dict[str, str] = {}
    for s in registry.situations:
        for alias in s.csv_aliases:
            if alias in seen and seen[alias] != s.id:
                errors.append(
                    f'csv_alias «{alias}» привязан к двум ситуациям: '
                    f'{seen[alias]} и {s.id}'
                )
            seen[alias] = s.id

    attractors_path = os.path.join(project_dir, ATTRACTORS_PATH)
    if os.path.exists(attractors_path):
        with open(attractors_path, encoding='utf-8') as f:
            attractors = json.load(f)
        l2_ids = {
            a['id'] for a in attractors.get('attractors', [])
            if a.get('level') == 2
        }
        bad_l2 = [
            (s.id, s.attractor_l2)
            for s in registry.situations
            if s.attractor_l2 not in l2_ids
        ]
        if bad_l2:
            errors.append(
                'Ситуации со ссылкой на несуществующий L2-аттрактор: '
                + ', '.join(f'{sid}→{l2}' for sid, l2 in bad_l2)
            )

    if errors:
        raise RegistryError(
            'Registry не прошёл валидацию:\n  • '
            + '\n  • '.join(errors)
        )


def _project_root() -> str:
    """Поднимается от scripts/lib/registry.py до корня проекта."""
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(here))


if __name__ == '__main__':
    reg = load_registry()
    print(f'✓ registry v{reg.version} ({reg.generated_at})')
    print(f'  категорий: {len(reg.categories)}')
    print(f'  ситуаций: {len(reg.situations)}')
    print(f'  с csvAliases: {len(reg.situations_with_aliases)}')
    print(f'  алиасов всего: {len(reg._alias_to_id)}')
