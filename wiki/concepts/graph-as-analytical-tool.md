---
type: concept
title: Graph As Analytical Tool
updated: 2026-05-08
status: active
---

# Graph As Analytical Tool

The Graph view should help users reason about the attractor system, not merely inspect a drawn table.

## Questions The Graph Should Answer

- Which L2 attractors are structurally prominent?
- What is directly connected to the selected L2?
- Which links are reinforcing and which are conflicting?
- Where does the selected L2 appear in scenarios?
- What should the user inspect next?

## MVP Behavior

For a selected L2, the sidebar should show:

- a graph role based on weighted degree;
- total reinforcing and conflicting link counts;
- top reinforcing and conflicting neighbors;
- linked situations and whether markup exists.

The graph canvas should support a **Напряжения** mode that filters correlation lines down to conflicting relationships.

## Non-Goals

- Do not show all analytical dimensions at once.
- Do not treat graph position as proof of meaning without explaining the metric.
- Do not use LLM-generated interpretation as runtime truth.
- Do not replace the Scenarios view.

