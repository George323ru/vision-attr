---
type: synthesis
title: Data Coverage
updated: 2026-05-08
status: active
confidence: high
contested: false
---

# Data Coverage

This page summarizes current runtime files as of 2026-05-08.

## Current Counts

Source files:

- `data/attractors.json`
- `public/data/situations_registry.json`
- `public/data/markup.json`
- `public/data/correlations.json`

Observed counts:

- Domains: 11.
- Attractors: 513 total.
- L1: 11.
- L2: 58.
- L3: 444.
- Registry situations: 41 active records in the local array.
- Registry declared total: 100.
- Situations with `csvAliases`: 23.
- Markup situations: 23.
- Markup respondents: 670.
- Correlations: 870 total.
- Reinforcing correlations: 792.
- Conflicting correlations: 78.
- `maxAbsR`: 0.63.

## Known Drift

The registry file declares `totalSituations: 100`, while the local `situations` array currently contains 41 active records. Treat this as catalog coverage drift until resolved.

Some older docs may also mention smaller correlation counts. The runtime `public/data/correlations.json` currently contains 870 edges.

## Product Implication

The Graph MVP should make coverage visible rather than hiding it. Linked situations can be shown for L2 nodes, but the UI must distinguish situations with markup from situations without behavioral data.

