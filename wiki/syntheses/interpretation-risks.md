---
type: synthesis
title: Interpretation Risks
updated: 2026-05-08
status: active
confidence: high
contested: false
---

# Interpretation Risks

The graph can become misleading if visual prominence is treated as proof. The MVP should keep interpretation grounded in explicit metrics and source files.

## Main Risks

- **Correlation as causation**: reinforcing and conflicting links are associations, not causal mechanisms.
- **Visual overload**: showing 870 links at once can reduce clarity instead of improving analysis.
- **Coverage confusion**: a situation can exist in the registry but lack markup data.
- **Documentation drift**: older docs can disagree with runtime JSON after data rebuilds.
- **Metric opacity**: users need to know that MVP role is weighted degree, not a full network-science ranking.

## Safe UI Language

Prefer:

- "связано";
- "усиливающая связь";
- "конфликтующая связь";
- "в текущем наборе данных";
- "поведенческие данные пока не размечены".

Avoid:

- "вызывает";
- "доказывает";
- "определяет поведение";
- "объясняет полностью".

## Follow-Up Questions

- Which graph metric is most useful after weighted degree: betweenness, cluster membership, or domain bridge score?
- Should tension mode become a persistent graph mode in state, or remain local UI state?
- Which graph insights should be surfaced in Scenarios, if any?

