# CLAUDE.md

## Быстрый старт

```bash
npm run dev          # http://localhost:5173
npm run build        # vue-tsc + vite → dist/
npx vue-tsc --noEmit # type-check без сборки
python3 scripts/parse_csv.py  # CSV → public/data/attractors.json
```

---

## Что такое этот проект

**Vision Attractor** — BI-дашборд для анализа жизненных ценностей. Интерактивный граф (vis-network) показывает иерархию «аттракторов» (жизненных доменов) и корреляции между ними. Правая панель отображает предиктивный анализ для выбранных категорий.

---

## Карта файлов

```
src/
├── main.ts                        # точка входа, монтирует App.vue
├── App.vue                        # корневой компонент, вся логика взаимодействия
│
├── composables/
│   ├── useAppState.ts             # СИНГЛТОН: весь UI-стейт приложения
│   ├── useAttractorStore.ts       # СИНГЛТОН: данные аттракторов (загружаются из JSON)
│   ├── useTheme.ts                # СИНГЛТОН: тема (light/dark), sync body.classList
│   ├── useVisualSettings.ts       # СИНГЛТОН: настройки графа (размеры нод, цвета рёбер)
│   ├── useNetwork.ts              # ИНСТАНС: vis-network, всё управление графом
│   ├── useCorrelations.ts         # STATELESS: getCorrelationAtAge, getCorrelatedL2Ids, getCorrEdgesForNode
│   ├── usePrediction.ts           # STATELESS: predictBehavior (Largest Remainder Method)
│   └── useAttractorDisplay.ts     # STATELESS: утилиты отображения аттракторов
│
├── components/
│   ├── AppHeader.vue              # шапка: кнопки режимов, ситуации, настройки
│   ├── GraphZone.vue              # обёртка графа: NetworkCanvas + GraphLegend + FocusPanel
│   ├── NetworkCanvas.vue          # <div ref> + useNetwork() + defineExpose всех методов графа
│   ├── FocusPanel.vue             # плашка поверх графа: имя выделенного + счётчик корреляций
│   ├── GraphLegend.vue            # легенда цветов доменов
│   ├── RightPanel.vue             # правая панель: роутинг между sub-panels
│   ├── DemographicsPanel.vue      # возраст/пол/семья — фильтры, слайдер возраста
│   ├── AttractorDropdowns.vue     # 3 дропдауна выбора L2-аттракторов + панель корреляций
│   ├── VisualSettingsPanel.vue    # оверлей настроек графа (размеры, цвета)
│   ├── SituationCard.vue          # карточка ситуации в списке
│   ├── StrategyBar.vue            # бар стратегии с анимацией
│   └── panels/
│       ├── EmptyPanel.vue         # панель по умолчанию ("выберите категорию")
│       ├── AttractorPanel.vue     # панель выбранного L2-узла: описание + список ситуаций
│       ├── AllSituationsPanel.vue # список всех 31 ситуации
│       ├── SituationPanel.vue     # конкретная ситуация: стратегии с барами
│       └── L3Panel.vue            # панель L3-узла: описание + кнопка фокуса на родителе
│
├── data/
│   ├── correlations.ts            # ~85 корреляций между L2-нодами с возрастными диапазонами
│   ├── situations.ts              # 31 ситуация (привязка к L2 через attractorL2)
│   ├── strategies.ts              # стратегии с ageModifier: (age) => number
│   └── themes.ts                 # THEMES: JS-объект цветов для vis-network canvas
│
├── types/
│   ├── attractor.ts               # Attractor, AttractorLevel
│   ├── correlation.ts             # Correlation, AgeRange, CorrelationAtAge, CorrelationType
│   ├── domain.ts                  # Domain, DomainMap
│   ├── network.ts                 # VisNodeData, VisEdgeData, OrigNodeSnapshot, OrigEdgeSnapshot, ExpansionSnapshot
│   ├── situation.ts               # Situation, Strategy, Prediction, StrategiesMap
│   └── theme.ts                   # ThemeName, ThemeColors
│
└── utils/
    ├── nodeStyles.ts              # nc(), nodeFont(), nodeSize(), nodeMass(), wrapLabel() — чистые функции
    ├── edgeStyles.ts              # hierarchyEdge(), correlationEdge() — чистые функции
    └── colors.ts                  # domainColor(), domainBorder() — HSL-расчёт по домену

public/data/attractors.json        # загружается fetch() при старте: domains[] + attractors[]
.data/attractor_dataset.csv        # 2944 строки, исходник для attractors.json
```

---

## Три типа composables — принципиальное различие

### Синглтоны (state на уровне модуля, вне функции)
State объявлен вне `export function`, поэтому все компоненты получают **одни и те же ref'ы**:
- `useAppState` — весь UI-стейт
- `useAttractorStore` — загруженные данные
- `useTheme` — текущая тема
- `useVisualSettings` — настройки графа

### Инстанс (`useNetwork`)
Единственный не-синглтон. Создаётся **только в `NetworkCanvas.vue`**. Принимает `Ref<HTMLElement>`. Module-level переменные (`nodes`, `edges`, `ORIG`, `ORIG_EDGE`, `expandedL1/L2`, `dropdownCorrLines`) очищаются в `onBeforeUnmount`. Методы экспортируются через `defineExpose` → GraphZone → App.vue.

### Stateless (чистые функции, без state)
- `useCorrelations` — три функции расчёта корреляций
- `usePrediction` — предиктивный расчёт
- `useAttractorDisplay` — утилиты отображения

---

## Цепочка expose (граф → App.vue)

```
NetworkCanvas.vue
  └── useNetwork(containerRef) → defineExpose({ applyFocus, toggleL1, applyDropdownHighlight, ... })

GraphZone.vue
  └── <NetworkCanvas ref="networkRef"> → defineExpose({ networkRef, setFocusCount })

App.vue
  └── graphZoneRef.value?.networkRef  → все методы графа
      graphZoneRef.value?.setFocusCount(n)
```

Вызов: `getNetwork()` → возвращает `networkRef` из GraphZone.

---

## useAppState — полный стейт

```typescript
// Демография (фильтры)
ageMin, ageMax          // ref<number> (18–75)
midAge                  // computed: Math.round((min+max)/2) — используется для корреляций
gender, childrenCount, maritalStatus

// Граф
correlationsVisible     // ref<boolean> — показывать ли серые корреляции фоном
expansionMode           // 'click' | 'allL2' | 'allL3'

// Фокус (клик по графу)
currentFocus            // ref<string|null> — id выбранного узла (L1 или L2)

// Панель
currentSituation        // ref<{attrId, sitId}|null>
currentMode             // 'graph' | 'situations'
currentStrategy         // ref<number|null>
l3NodeId                // ref<string|null>

// Dropdown-аттракторы (независимы от клик-фокуса)
selectedAttractors      // ref<(string|null)[]> — 3 слота, null = не выбран
activeSelectedIds       // computed Set<string> — только заполненные слоты
highlightedAttractorIdx // ref<number|null> — индекс дропдауна, чьи корреляции рисовать (0/1/2/null)
clearSelectedAttractors()

// Роутинг правой панели
panelState              // computed: 'empty'|'attractor'|'situation'|'all-situations'|'l3'
// Приоритет: currentSituation > l3NodeId > currentMode=situations > currentFocus > empty

resetState()            // полный сброс (вызывается из App.vue редко)
```

---

## useNetwork — управление графом

### Модульные переменные (очищаются в onBeforeUnmount)
```typescript
network: Network | null          // vis-network инстанс
nodes: DataSet<VisNodeData>      // нодовый датасет
edges: DataSet<VisEdgeData>      // рёберный датасет
ORIG: Record<string, OrigNodeSnapshot>    // снапшоты оригинальных стилей нод
ORIG_EDGE: Record<string, OrigEdgeSnapshot> // снапшоты оригинальных стилей рёбер
expandedL1: Set<string>          // раскрытые L1-узлы
expandedL2: Set<string>          // раскрытые L2-узлы
graphFocusSet: Set<string>       // мульти-фокус: нодs в клик-фокусе
dropdownCorrLines: DropdownCorrLine[] // данные для afterDrawing overlay
```

### Ключевые функции
```typescript
// Expand/collapse
toggleL1(nodeId)          // раскрыть/свернуть L1 → показать/скрыть L2
toggleL2(nodeId)          // раскрыть/свернуть L2 → показать/скрыть L3
expandAllL2() / expandAllL3() / collapseAllL2()

// Snapshot expansion (для backSnapshot в App.vue)
snapshotExpansionState()  // → ExpansionSnapshot
restoreExpansionState(snap)

// Клик-фокус (мульти-фокус по нодам графа)
applyFocus(nodeId)        // единственный фокус → сбрасывает graphFocusSet
addFocusNode(nodeId)      // добавить/снять в мульти-фокусе (Ctrl-клик логика)
clearGraphFocus()         // сброс без изменения панели
clearFocusVisualsPreserveVisibility() // сброс без сворачивания expand-state
resetGraphVisuals()       // полный сброс всего

// Dropdown-подсветка (независима от клик-фокуса)
applyDropdownHighlight(selectedIds: Set<string>, corrSourceId?: string | null)
// selectedIds — золотая обводка для всех выбранных
// corrSourceId — рисовать линии только от этого аттрактора (null = не рисовать линии)
clearDropdownHighlight()                          // сбросить подсветку

// Корреляции
updateCorrelationsForAge(age)    // обновить цвет/толщину при смене возраста
updateVisibleCorrelations()      // показать серые корреляции для видимых L2
hideAllCorrelations()

// Утилиты
getNodeData(nodeId) → VisNodeData | null
unselectAll()
onSelectNode(callback)  // регистрирует обработчик клика по ноде
onClickEmpty(callback)  // регистрирует обработчик клика по пустому месту
```

### Нода-стили: три функции
```typescript
FOCUS_NODE(origSize, origFont)        // золотая обводка + белый фон
// ВАЖНО: передавать ORIG[nid].font чтобы сохранить размер шрифта (78 canvas-единиц)
// vis-network ЗАМЕНЯЕТ font-объект целиком, не делает deep merge
CORR_NODE()                           // жёлтая подсветка для скоррелированных нод
```

### wrapLabel — перенос меток L2/L3
```typescript
// utils/nodeStyles.ts
wrapLabel(text: string, wordsPerLine = 3): string
// L2: wrapLabel(label, 2) — 2 слова на строку
// L3: wrapLabel(label)    — 3 слова на строку (default)
// Не переносит союзы/предлоги в конец строки (HANGING_WORDS set)
// L1 — без переноса (label используется как есть)
```

### afterDrawing overlay (dropdown-корреляции поверх нод)
```typescript
// Зелёные/красные линии рисуются вручную в сетевом canvas ПОСЛЕ нод
// Координаты: network.getPosition(nodeId) → уже в canvas-пространстве
// dropdownCorrLines заполняется в applyDropdownHighlight
// Края в DataSet скрываются (hidden: true), overlay рисует их поверх
```

---

## Два типа подсветки — они взаимоисключающие

| | Клик-фокус | Dropdown-подсветка |
|---|---|---|
| Источник | клик по L2 на графе | выбор в дропдауне |
| State | `graphFocusSet` | `selectedAttractors` / `activeSelectedIds` |
| Функция | `applyMultiFocusVisuals()` | `applyDropdownHighlight()` |
| Рёбра | обычные DataSet edges | afterDrawing canvas overlay (поверх нод) |
| Сброс dropdown | ❌ не сбрасывает | - |
| Сброс клик | watcher в App.vue сбрасывает при появлении dropdown-выбора | - |

**Правило**: при изменении `selectedAttractors` (deep watcher) → `applyHighlightFromState(net)`. При изменении `highlightedAttractorIdx` → отдельный watcher → `applyHighlightFromState(net)`. Клики по графу НЕ сбрасывают дропдауны.

`applyHighlightFromState(net)` — хелпер в App.vue: читает `highlightedAttractorIdx` → вычисляет `corrSourceId` → вызывает `net.applyDropdownHighlight(activeSelectedIds, corrSourceId)`.

---

## Правая панель — структура и роутинг

```
RightPanel.vue
  ├── DemographicsPanel    # всегда видна сверху (слайдер возраста, пол, семья)
  ├── AttractorDropdowns   # всегда видна (3 дропдауна + панель корреляций)
  ├── [header: заголовок + кнопка ×]
  └── right-panel-content  # роутится через panelState:
      ├── EmptyPanel           (panelState = 'empty')
      ├── AllSituationsPanel   (panelState = 'all-situations')
      ├── AttractorPanel       (panelState = 'attractor')
      ├── SituationPanel       (panelState = 'situation')
      └── L3Panel              (panelState = 'l3')
```

---

## AttractorDropdowns — компонент выбора аттракторов

**Что делает**: 3 дропдауна со всеми L2-аттракторами, сгруппированными по доменам. Уже выбранные варианты disabled в других дропдаунах.

**Кнопка корреляций** (справа от каждого дропдауна):
- SVG-иконка граф-узлов, переключает `highlightedAttractorIdx` (radio-логика: один активный)
- Активная кнопка → `applyDropdownHighlight` рисует линии только от этого аттрактора
- Клик по активной кнопке снимает подсветку линий (highlightedAttractorIdx = null)
- По умолчанию активен индекс 0 (первый аттрактор)

**Панель корреляций** (раскрывается под дропдаунами):
- Пары между выбранными аттракторами (зелёный/красный + %)
- Топ-10 внешних корреляций с другими L2-нодами
- Обновляется при смене возраста (использует `midAge`)

**Важно**: `selectedAttractors.value = copy` (не мутировать напрямую — нужен новый массив для реактивности).

---

## Корреляции — как работают

### Данные (`src/data/correlations.ts`)
137 корреляций, формат:
```typescript
{ id: 'c01', from: 'l2_rabota_01', to: 'l2_byt_03',
  baseType: 'reinforcing',
  ageRanges: [{ min: 22, max: 75, strength: 0.8, type: 'reinforcing' }] }
```
`id` совпадает с `e.id` рёбра в DataSet → `ORIG_EDGE['c01']`.

### Возрастная логика (`useCorrelations.ts`)
```typescript
getCorrelationAtAge(corr, age)
// fade-эффект на 3-unit границах диапазона
// floor 0.3× (корреляция не исчезает полностью)
// возвращает null если age вне всех диапазонов

getCorrelatedL2Ids(nodeId, age) → Set<string>
getCorrEdgesForNode(nodeId, age) → Array<{corrId, type, strength}>
```

### Толщина линий
```typescript
// Dropdown overlay (afterDrawing):
width: 5 + strength * 16   // при strength=1.0 → 21px
// Серые корреляции (фон):
corrDefaultWidth = 7       // из useVisualSettings
```

---

## Тема — двойная система

**CSS-переменные** (`src/assets/global.css`):
- `:root` = dark тема
- `body.light` = light тема
- Vue-компоненты используют `var(--accent)`, `var(--text)` и т.д.

**JS THEMES** (`src/data/themes.ts`):
- vis-network не видит CSS-переменные → цвета canvas задаются через JS
- `T.value.focusFont.color`, `T.value.dim.node.bg`, etc.
- `useTheme`: `watch(currentTheme)` → `body.classList`, watcher в `useNetwork` → `rebuildForTheme()`

**Только light тема активна** (dark закомментирована в themes.ts).

---

## vis-network — критические знания

### Размеры шрифтов — canvas-единицы, не пиксели CSS
```
L1 font size: 120  (canvas units)
L2 font size: 78   (canvas units)
L3 font size: 49   (canvas units)
```
**Никогда не хардкодить 14 или другое маленькое число для L2/L1** — при типичном zoom будет невидимо.

### font-объект заменяется целиком (не deep merge)
```typescript
// НЕПРАВИЛЬНО — сбросит size до undefined:
nodes.update([{ id, font: { color: 'red' } }])

// ПРАВИЛЬНО — сохранить origFont:
nodes.update([{ id, font: { ...ORIG[id].font, color: 'red' } }])
```
Поэтому `FOCUS_NODE(origSize, origFont)` принимает `origFont` и делает spread.

### Hover отключён
```typescript
interaction: { hover: false }
// title на нодах не задаётся — убрано намеренно
```

### afterDrawing
Callback с `CanvasRenderingContext2D` в сетевой системе координат (transform уже применён). `network.getPosition(nodeId)` возвращает координаты в том же пространстве → рисовать напрямую.

### Физика — Barnes-Hut
После первой стабилизации все ноды фиксируются (`fixed: { x: true, y: true }`). Drag снимает фиксацию, dragEnd возвращает.

---

## Поток взаимодействия (App.vue)

```
onMounted → loadData() → nextTick → getNetwork()
  └── net.onSelectNode(handler)
  └── net.onClickEmpty(handler)

Клик L1 → toggleL1 → clearGraphFocus → showAttractorPanel
Клик L2 → toggleL2 → addFocusNode → showAttractorPanel
  (addFocusNode возвращает {correlated: n} → setFocusCount)
Клик L3 → l3NodeId = nodeId

Клик пустое место:
  → если есть focus/situation → clearFocusVisualsPreserveVisibility + restoreExpansionState
  → если есть dropdown-выбор → applyDropdownHighlight
  → иначе → onResetDefault (collapseAllL2 + resetGraphVisuals)

Слайдер возраста → onAgeChange:
  → если dropdown активен → applyHighlightFromState (пересчитает с новым возрастом)
  → иначе → updateCorrelationsForAge

watch(selectedAttractors, deep):
  → ids.size > 0 → clearGraphFocus + applyHighlightFromState
  → ids.size = 0 → clearDropdownHighlight

watch(highlightedAttractorIdx):
  → applyHighlightFromState
```

---

## backSnapshot — зачем нужен

Сохраняет состояние expand/collapse перед тем как пользователь кликает на L2 или ситуацию:
```typescript
backSnapshot.value = net.snapshotExpansionState()
```
При клике в пустое место или закрытии панели → `restoreExpansionState(backSnapshot)` → граф возвращается к предыдущему состоянию раскрытия.

---

## Добавление новых корреляций

Файл: `src/data/correlations.ts`
```typescript
{ id: 'c86', from: 'l2_DOMAIN_NN', to: 'l2_DOMAIN_NN',
  baseType: 'reinforcing' | 'conflicting',
  ageRanges: [{ min: 18, max: 75, strength: 0.7, type: 'reinforcing' }] }
```
- `id` должен быть уникальным — станет `e.id` в DataSet (текущий максимум: c137)
- `from`/`to` — id L2-нод (найти в `attractors.json` или через devtools)
- strength: 0.0–1.0, влияет на толщину overlay-линии: `5 + strength * 16`
- Можно несколько `ageRanges` для разных периодов жизни

---

## Добавление новых ситуаций

Файл: `src/data/situations.ts`
- Привязка к L2 через `attractorL2: 'l2_domain_NN'`
- Стратегии в `src/data/strategies.ts` с `ageModifier: (age) => number`

---

## Layout

```css
/* global.css */
#app { display: flex; flex-direction: column; height: 100vh; }
/* App.vue */
.main-grid { flex: 1; display: grid; grid-template-columns: 1fr 456px; }
```
App.vue использует fragment (несколько корневых элементов), поэтому `#app` стилизован как flex-column.

---

## Working Style

- **Читай файл перед редактированием** — никогда не полагайся на память о содержимом
- **Сразу делай** — не показывай планы/драфты если не просят явно
- **Несколько гипотез при дебаге** — не патчи одну теорию повторно если не сработало
- **Интерфейс и данные на русском языке**

## Legacy

`index.old.html`, `js/`, `css/` — vanilla JS версия, только для справки, не трогать.
