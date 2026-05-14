---
type: meta
title: Source Of Truth
updated: 2026-05-08
status: active
---

# Source Of Truth

This wiki is not a runtime data source. It explains and audits the project, while the application reads its data from JSON, CSV, and TypeScript code.

## Runtime Sources

- `data/attractors.json`: domains and L1/L2/L3 attractors.
- `public/data/situations_registry.json`: scenario registry consumed by the frontend and data parser.
- `public/data/markup.json`: aggregated scenario strategy data and anonymized respondent records used by the app.
- `public/data/correlations.json`: L2 correlation edges.
- `src/composables/state/*`: UI state machine and graph/scenario navigation rules.
- `src/components/D3Graph.vue`: graph rendering and visual edge behavior.

## Sensitive Data Rule

Do not copy respondent-level `.data/` content or raw respondent records into wiki pages. Wiki pages may describe aggregate coverage and methodological limits.

## Drift Rule

When documentation disagrees with runtime files, record the mismatch in [Data Coverage](../syntheses/data-coverage.md) or a future drift report. Do not silently choose the more convenient number.

