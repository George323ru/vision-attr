---
type: schema
title: Wiki Schema
updated: 2026-05-08
status: active
---

# Wiki Schema

## Domain

This wiki is the LLM-maintained methodology and interpretation layer for Vision Attractor / LOGOS v3.0. It explains product intent, graph analytics, data coverage, interpretation limits, and open questions.

## Source of Truth

- Runtime data lives in JSON/CSV/code, not in wiki pages.
- Wiki pages may summarize data coverage, but they must cite the source files they summarize.
- Do not copy all correlations, all L3 attractors, or respondent-level records into wiki pages.
- If wiki and runtime files disagree, runtime files win and the disagreement is logged as drift.

## Conventions

- File names use lowercase hyphenated slugs.
- Pages use YAML frontmatter with `type`, `title`, `updated`, and `status`.
- Use relative markdown links, not Obsidian-only wikilinks.
- Update [index.md](./index.md) when adding or renaming pages.
- Append every init, ingest, query, lint, or major maintenance action to [log.md](./log.md).

## Page Types

- `overview`: high-level project synthesis.
- `concept`: reusable concept or method definition.
- `synthesis`: analysis combining multiple runtime sources.
- `meta`: source-of-truth, drift, or maintenance note.

## Update Policy

When new information conflicts with existing wiki content:

1. Check the runtime source file and the date/provenance of the claim.
2. Update the page if newer runtime data supersedes the old claim.
3. Preserve meaningful drift as an explicit note rather than silently smoothing it over.
4. Do not strengthen correlational findings into causal claims.

