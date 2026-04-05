# Граф и сеть — подробности

> Детали useNetwork, useAppState, подсветки и vis-network. Основной контекст в [CLAUDE.md](./CLAUDE.md).

## useAppState — полный стейт

```typescript
ageMin, ageMax              // ref<number> (18–75)
midAge                      // computed: Math.round((min+max)/2)
gender, childrenCount, maritalStatus
correlationsVisible         // ref<boolean>
expansionMode               // 'click' | 'allL2' | 'allL3'
currentFocus                // ref<string|null> — id выбранного узла
currentSituation            // ref<{attrId, sitId}|null>
currentMode                 // 'graph' | 'situations'
currentStrategy             // ref<number|null>
l3NodeId                    // ref<string|null>
selectedAttractors          // ref<(string|null)[]> — 3 слота
activeSelectedIds           // computed Set<string>
highlightedAttractorIdx     // ref<number|null> — индекс дропдауна для линий (0/1/2/null)
panelState                  // computed: 'empty'|'attractor'|'situation'|'all-situations'|'l3'
// Приоритет: currentSituation > l3NodeId > currentMode=situations > currentFocus > empty
clearSelectedAttractors()
resetState()
```

## useNetwork — управление графом

### Модульные переменные (очищаются в onBeforeUnmount)
```typescript
network, nodes, edges       // vis-network, DataSet'ы
ORIG, ORIG_EDGE             // снапшоты оригинальных стилей
expandedL1, expandedL2      // Set<string>
graphFocusSet               // мульти-фокус
dropdownCorrLines           // данные для afterDrawing overlay
```

### Ключевые функции
```typescript
toggleL1(nodeId) / toggleL2(nodeId)
expandAllL2() / expandAllL3() / collapseAllL2()
snapshotExpansionState() / restoreExpansionState(snap)
applyFocus(nodeId) / addFocusNode(nodeId) / clearGraphFocus()
clearFocusVisualsPreserveVisibility() / resetGraphVisuals()
applyDropdownHighlight(selectedIds, corrSourceId?) / clearDropdownHighlight()
updateCorrelationsForAge(age) / updateVisibleCorrelations() / hideAllCorrelations()
getNodeData(nodeId) / unselectAll()
onSelectNode(callback) / onClickEmpty(callback)
```

## Два типа подсветки — взаимоисключающие

| | Клик-фокус | Dropdown-подсветка |
|---|---|---|
| Источник | клик по L2 | выбор в дропдауне |
| State | `graphFocusSet` | `selectedAttractors` / `activeSelectedIds` |
| Функция | `applyMultiFocusVisuals()` | `applyDropdownHighlight()` |
| Рёбра | DataSet edges | afterDrawing canvas overlay |

Клики по графу НЕ сбрасывают дропдауны.

## Поток взаимодействия (App.vue)

```
onMounted → loadData() → nextTick → getNetwork()

Клик L1 → toggleL1 → clearGraphFocus → showAttractorPanel
Клик L2 → toggleL2 → addFocusNode → showAttractorPanel
Клик L3 → l3NodeId = nodeId
Клик пустое → restore или reset

Слайдер возраста → applyHighlightFromState или updateCorrelationsForAge
watch(selectedAttractors) → applyHighlightFromState
watch(highlightedAttractorIdx) → applyHighlightFromState
```

## vis-network — критические знания

- **Шрифты** — canvas-единицы: L1=120, L2=78, L3=49. НЕ пиксели CSS.
- **font заменяется целиком**: `nodes.update([{ id, font: { ...ORIG[id].font, color: 'red' } }])`
- **Hover отключён**: `interaction: { hover: false }`
- **afterDrawing**: callback с CanvasRenderingContext2D в canvas-координатах
- **Физика**: Barnes-Hut, после стабилизации ноды фиксируются

## backSnapshot

Сохраняет expand/collapse перед кликом на L2 или ситуацию. При клике в пустое место → `restoreExpansionState(backSnapshot)`.

## Корреляции — толщина линий

- Dropdown overlay: `5 + strength * 16`
- Серые (фон): `corrDefaultWidth = 7`
