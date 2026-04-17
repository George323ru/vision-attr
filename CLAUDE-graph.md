# Граф (D3) — подробности

> Технические детали `D3Graph.vue` и сопутствующих композаблов. Общий контекст — в [CLAUDE.md](./CLAUDE.md).

## Архитектура

```
D3Graph.vue (SVG + shapes + events)
   ├─ useD3Zoom(svgRef)           # d3-zoom behavior + fitAll + zoomTo
   ├─ useGraphLayout.computeLayout # d3-force simulation (300 ticks, sync)
   └─ useGraphEffects(expandedNodes, hovered, d3Zoom, positionsMap)
                                   # транслирует Effect[] → императивные вызовы
```

## Поток: Action → Effect

```
UI click → dispatch(Action) → reducer → { state', effects[] }
                                              ↓
                              useStore.effectHandler
                                              ↓
                              D3Graph(onMounted):
                                 setEffectHandler(effects → graphEffects.execute(effects))
                                              ↓
                              useGraphEffects.execute:
                                 switch(effect.type)
                                   case EXPAND_NODE:        expandedNodes.add/delete
                                   case COLLAPSE_NODE:      expandedNodes.delete
                                   case ZOOM_TO_FIT:        d3Zoom.zoomTo(positions)
                                   case HOVER_VISUAL:       hoveredNodeId = id
                                   case ANIMATE_EXPAND:     expandedNodes.add
                                   case ANIMATE_COLLAPSE:   expandedNodes.delete
                                   (HIGHLIGHT / SHOW_CORRELATIONS — no-op, деривятся из state)
```

## Лэйаут (useGraphLayout.ts)

1. **Геометрический seed:**
   - L1 — по кругу радиусом `L1_RADIUS=2000` (зафиксированы `fx`/`fy`).
   - L2 — веером вокруг своего L1, радиус `L2_RADIUS=600`, сектор `2π/N_L1 × 0.75`.
   - L3 — веером вокруг L2, радиус `L3_RADIUS=350`.
2. **Force simulation** (d3-force, 300 синхронных tick'ов):
   - `forceManyBody` — отталкивание: L1=-800, L2=-400, L3=-150.
   - `forceLink` — пружина parent↔child, distance `L2_RADIUS`/`L3_RADIUS`, strength 0.6.
   - `forceCollide` — радиусы L1=250, L2=120, L3=50 (учитывает лейблы).
   - `forceX`/`forceY` → 0, strength 0.01 — мягкая гравитация к центру.
3. Результат — `Map<nodeId, { x, y }>`, кэшируется в `computed`.

## Зум (useD3Zoom.ts)

- `scaleExtent([0.02, 4])`.
- `fitAll()` — при монтировании: вычисляется общий `extent=3500`, `k = min(w,h)/(extent*2) × 0.85`.
- `zoomTo(positions, padding=600)` — для фокуса на подмножестве узлов:
  - Для одиночного узла `effectivePad=max(padding, 900)` чтобы соседние L2-лейблы не выходили за viewport.
  - `max k = 0.8` — предотвращает чрезмерное увеличение.
- Transition: 600–800 ms, `easeExpOut`.

## Видимость узлов

```
L1: всегда.
L2: если expandedNodes.has(parent).
L3: если expandedNodes.has(parent) AND zoomScale >= 0.25 (semantic zoom).
```

При монтировании watcher на `attractors` раскрывает все L1 сразу.

## Рёбра

- **Иерархические** (`visibleHierarchyEdges`): curved quad-bezier с перпендикулярным сдвигом `len × 0.06`. Stroke-width: L1→L2 = 3, L2→L3 = 1.5. При фокусе — fade 0.04 для нерелевантных.
- **Корреляционные** (`visibleCorrEdges`): только при `focus.type === 'correlations'`. Quad-bezier сдвиг `len × 0.15`. Stroke-width `1.5 + strength × 3.5`. Glow-filter `#glow-teal` / `#glow-red`.

## Цвета и шрифты

- `domainColor(domains, domain, level)` — HSL с насыщенностью 30-55% и lightness, зависящим от level.
- `domainBorder`, `domainGradientCenter`, `domainFontColor` — в `utils/colors.ts`.
- L1 имеет `<radialGradient>` в `<defs>` + `feDropShadow`-filter.
- Шрифты (SVG): L1=64, L2=28, L3=14 в мировых координатах — масштабируются зумом.
- Лейблы L2/L3 обёрнуты через `wrapLabel(label, maxWordsPerLine)`.

## Overflow и clipping

- SVG `class="d3-graph"` имеет `overflow: hidden` в CSS — иначе трансформированный зумом контент физически выезжает за границы родителя (SVG без viewBox — default `overflow: visible`).
- `preserveAspectRatio="xMidYMid meet"` — для корректного масштабирования при resize.
- Родитель `.graph-area` — `position: relative; overflow: hidden`.

## Focus states (CSS)

- `.focused.level-1 circle` — accent-обводка 5px.
- `.focused.level-2 circle` — accent-обводка 3.5px + scale 1.06.
- `.faded` — opacity 0.15 (0.5 на hover).
- `.corr-target` — stroke-width 3 (подсвечивается при режиме корреляций).

## Производительность

- `computeLayout` — `computed` от `attractors.value` (стабильный список — один раз).
- `visibleNodes` — пересчёт при изменении `expandedNodes`, `focusedNodeId`, `activeAttractorIds`, `zoomScale`.
- SVG-трансформ `<g transform="translate ... scale ...">` — один узел DOM, браузер GPU-ускоряет.
