---
type: concept
title: Correlation Model
updated: 2026-05-08
status: active
---

# Correlation Model

Correlation edges connect L2 attractors. Each edge has:

- `type`: `reinforcing` or `conflicting`;
- `r`: signed Pearson correlation coefficient;
- `strength`: absolute strength used by the UI.

## Interpretation

Use cautious language:

- reinforcing link: the two L2 attractors are positively associated in the current dataset;
- conflicting link: the two L2 attractors are negatively associated in the current dataset;
- strength: the magnitude of the observed association.

Do not say that one attractor causes another. Correlation edges are useful for navigation, hypothesis generation, and identifying tensions, but not for causal proof.

## UI Implication

The Graph view may use edge type and strength to prioritize what users see. The first MVP uses weighted degree as the role metric and a **Напряжения** filter for conflicting links.

