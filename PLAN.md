# Path B: Scenario-First Rebuild

## Прогресс

| Фаза | Статус | Результат |
|------|--------|-----------|
| 1. Фундамент | **DONE** | Reducer + types + selectors + useStore. App.vue 376→36 строк. Бандл 600KB→70KB. Два экрана переключаются. |
| 2. Scenario view | **DONE** | ProfileSidebar + DemographicsPanel (dispatch) + AttractorPicker + SituationGrid + SituationCard + SituationDetail. Build 112KB чистый. Удалены мёртвые AllSituationsPanel, L3Panel. |
| 3. D3-граф | **DONE** | D3Graph.vue (SVG + d3-zoom), useGraphLayout.ts, useD3Zoom.ts, useGraphEffects.ts, GraphSidebar.vue, GraphView.vue. AttractorPanel + CorrelationPanel адаптированы на dispatch. Бандл 196KB (d3 вместо vis-network 600KB). |
| 4. Кросс-навигация | **DONE** | SituationDetail: «Показать на графе →» + GO_BACK. AttractorPanel: OPEN_SITUATION + «← Назад». useStore: буфер pendingEffects для отложенных эффектов при scenarios→graph. Reducer: ANIMATE_EXPAND (не toggle) для NAVIGATE_TO_GRAPH_NODE. |
| 5. Удаление старого кода | **DONE** | Удалены 7 файлов: GraphZone, RightPanel, VisualSettingsPanel, NetworkCanvas, useNetwork, useNetworkBreathe, useNetworkLayout. Удалены vis-network + vis-data из package.json. Бандл 212KB. |
| 6. Полировка | **DONE** | 6a: view-fade transition между экранами, node-appear/edge-fade-in анимации. 6b: CoachMarks cm-profile, cm-situation, cm-graph. 6c: responsive <768px (sidebar → top/bottom). 6d: semantic zoom (L3 скрыты при scale<0.25). |

---

## Что мы строим

**Vision Attractor** — аналитический дашборд, отвечающий на вопрос: «Как люди с такими аттракторами ведут себя в жизненных ситуациях?». Пользователь задаёт демографический профиль и выбирает аттракторы — система показывает релевантные ситуации со стратегиями и вероятностями. Граф аттракторов доступен как инструмент исследования.

**Стек**: Vue 3 + TypeScript + D3.js (граф) + Vite. Статический SPA, без бэкенда. Данные из JSON.

---

## Три слоя архитектуры

```
┌─────────────────────────────────────────────────────────┐
│  ВВОД (Profile)                                         │
│  Демография + визуальный пикер топ-3 аттракторов        │
├─────────────────────────────────────────────────────────┤
│  ОРКЕСТРАЦИЯ (State Machine)                            │
│  Reducer + discriminated unions + effects                │
│  Единый dispatch, невалидные состояния невозможны       │
├─────────────────────────────────────────────────────────┤
│  ВЫВОД                                                  │
│  A) Карточки ситуаций со стратегиями (default)          │
│  B) D3-граф аттракторов (opt-in exploration)            │
└─────────────────────────────────────────────────────────┘
```

---

## Слой оркестрации: State Machine

### Типы ядра

```typescript
// === Два экрана вместо трёх режимов ===
type ViewState =
  | { view: 'scenarios'; focus: ScenarioFocus }
  | { view: 'graph';     focus: GraphFocus; graphMode: GraphMode }

type ScenarioFocus =
  | { type: 'grid' }                                                           // список ситуаций
  | { type: 'detail'; sitId: string; attrId: string; strategyIdx: number | null } // раскрытая ситуация

type GraphFocus =
  | { type: 'none' }
  | { type: 'node'; nodeId: string; level: 1 | 2 | 3 }
  | { type: 'correlations'; nodeId: string; age: number }

type GraphMode = 'explore' | 'correlations'

// === Профиль (ортогонален) ===
interface ProfileState {
  demographics: DemographicsState
  selectedAttractors: readonly [string | null, string | null, string | null]
  highlightedIdx: number | null
}

interface DemographicsState {
  ageMin: number; ageMax: number
  gender: 'male' | 'female' | 'any'
  maritalStatus: 'married' | 'not_married' | 'divorced' | 'widowed' | 'civil_union' | 'any'
  childrenCount: string
}

// === UI Chrome (ортогонален) ===
interface ChromeState {
  profileCollapsed: boolean
}

// === Полный стейт ===
interface AppState {
  readonly viewState: ViewState
  readonly profile: ProfileState
  readonly chrome: ChromeState
  readonly navHistory: readonly ViewState[]
}
```

**Почему два экрана, а не три режима:** текущие «Граф / Корреляции / Ситуации» — это три входа в одни и те же данные. В scenario-first карточки ситуаций — основной экран, а граф — отдельный вид с подрежимами explore/correlations внутри себя.

### PanelRoute — derived

```typescript
type PanelRoute =
  | 'situation-grid'      // карточки ситуаций
  | 'situation-detail'    // раскрытая ситуация со стратегиями
  | 'graph-empty'         // граф без фокуса
  | 'graph-attractor'     // граф с выбранным узлом
  | 'graph-correlations'  // граф в режиме корреляций

function derivePanelRoute(vs: ViewState): PanelRoute {
  switch (vs.view) {
    case 'scenarios':
      return vs.focus.type === 'grid' ? 'situation-grid' : 'situation-detail'
    case 'graph':
      if (vs.graphMode === 'correlations') return 'graph-correlations'
      return vs.focus.type === 'none' ? 'graph-empty' : 'graph-attractor'
  }
}
```

### Actions

```typescript
type Action =
  // === Навигация между экранами ===
  | { type: 'SWITCH_VIEW'; view: 'scenarios' | 'graph' }
  | { type: 'GO_BACK' }

  // === Scenarios view ===
  | { type: 'OPEN_SITUATION'; sitId: string; attrId: string }
  | { type: 'CLOSE_SITUATION' }
  | { type: 'TOGGLE_STRATEGY'; index: number }

  // === Graph view ===
  | { type: 'CLICK_NODE'; nodeId: string; level: 1 | 2 | 3 }
  | { type: 'DBLCLICK_NODE'; nodeId: string }
  | { type: 'CLICK_EMPTY' }
  | { type: 'SET_GRAPH_MODE'; mode: GraphMode }
  | { type: 'SET_CORR_AGE'; age: number }

  // === Hover (визуальный, без навигации) ===
  | { type: 'HOVER_NODE'; nodeId: string | null }

  // === Профиль (ортогонален экранам) ===
  | { type: 'SET_AGE_RANGE'; min: number; max: number }
  | { type: 'SET_GENDER'; value: DemographicsState['gender'] }
  | { type: 'SET_MARITAL'; value: DemographicsState['maritalStatus'] }
  | { type: 'SET_CHILDREN'; value: string }
  | { type: 'SET_ATTRACTOR_SLOT'; slot: number; id: string | null }
  | { type: 'ADD_ATTRACTOR'; id: string }
  | { type: 'TOGGLE_HIGHLIGHT'; idx: number }
  | { type: 'CLEAR_ATTRACTORS' }

  // === Chrome ===
  | { type: 'TOGGLE_PROFILE' }
```

### Effects

```typescript
type Effect =
  // === Граф ===
  | { type: 'EXPAND_NODE'; nodeId: string }
  | { type: 'COLLAPSE_NODE'; nodeId: string }
  | { type: 'HIGHLIGHT_NODE'; nodeId: string }
  | { type: 'CLEAR_HIGHLIGHT' }
  | { type: 'SHOW_CORRELATIONS'; nodeId: string; age: number }
  | { type: 'HIDE_CORRELATIONS' }
  | { type: 'ZOOM_TO_FIT'; nodeIds: string[] }
  | { type: 'HOVER_VISUAL'; nodeId: string | null }
  | { type: 'ANIMATE_EXPAND'; parentId: string; childIds: string[] }
  | { type: 'ANIMATE_COLLAPSE'; parentId: string; childIds: string[] }
```

### Reducer — чистая функция

```typescript
function reduce(state: AppState, action: Action): { state: AppState; effects: Effect[] }
```

Ключевое: **reducer не знает про D3, vis-network или DOM**. Он возвращает новый стейт + массив эффектов. Effect Executor — единственный код, который трогает граф.

---

## Дерево компонентов

```
App.vue
├── AppHeader.vue               ← упрощён: LOGOS + [Анализ | Граф] + ⚙
│
├── [view === 'scenarios']
│   ScenarioView.vue            ← НОВЫЙ: основной экран
│   ├── ProfileSidebar.vue      ← НОВЫЙ: боковая панель профиля
│   │   ├── DemographicsPanel.vue    ← ПЕРЕИСПОЛЬЗОВАН
│   │   │   └── DualRangeSlider.vue  ← ПЕРЕИСПОЛЬЗОВАН
│   │   └── AttractorPicker.vue      ← НОВЫЙ: визуальный пикер аттракторов
│   │       └── SearchableCombobox.vue ← ПЕРЕИСПОЛЬЗОВАН
│   └── SituationGrid.vue      ← НОВЫЙ: сетка карточек
│       ├── SituationCard.vue   ← НОВЫЙ: карточка ситуации
│       └── SituationDetail.vue ← НОВЫЙ: раскрытая ситуация
│           ├── StrategyBar.vue      ← ПЕРЕИСПОЛЬЗОВАН
│           └── PanelBreadcrumb.vue  ← ПЕРЕИСПОЛЬЗОВАН
│
├── [view === 'graph']
│   GraphView.vue               ← НОВЫЙ: обёртка для графа
│   ├── D3Graph.vue             ← НОВЫЙ: SVG граф (заменяет NetworkCanvas+GraphZone)
│   │   └── GraphTooltip.vue    ← НОВЫЙ: кастомный тултип
│   ├── GraphLegend.vue         ← ОБНОВЛЁН
│   └── GraphSidebar.vue        ← НОВЫЙ: боковая панель графа
│       ├── AttractorPanel.vue       ← ПЕРЕИСПОЛЬЗОВАН с изменениями
│       ├── CorrelationPanel.vue     ← ПЕРЕИСПОЛЬЗОВАН с изменениями
│       └── CollapsibleSection.vue   ← ПЕРЕИСПОЛЬЗОВАН
│
└── CoachMark.vue               ← ПЕРЕИСПОЛЬЗОВАН
```

---

## Фазы реализации

### Фаза 1: Фундамент (оркестрация + каркас)

**Цель**: рабочий reducer, новый root layout, два экрана-заглушки.

**Создать:**

| Файл | Описание |
|------|----------|
| `src/composables/state/types.ts` | ViewState, ProfileState, Actions, Effects — все типы выше |
| `src/composables/state/reducer.ts` | Чистый reducer: `(state, action) => { state, effects }` |
| `src/composables/state/selectors.ts` | derivePanelRoute, deriveMidAge, deriveActiveAttractorIds и др. |
| `src/composables/state/useStore.ts` | Vue composable: reactive ref + dispatch + computed selectors |
| `src/views/ScenarioView.vue` | Заглушка: `<div>Scenario View</div>` |
| `src/views/GraphView.vue` | Заглушка: `<div>Graph View</div>` |

**Изменить:**

`src/App.vue` — **переписать** root layout:
```vue
<template>
  <AppHeader />
  <div class="main-content">
    <ScenarioView v-if="viewState.view === 'scenarios'" />
    <GraphView v-else />
  </div>
</template>
```
App.vue становится ~40 строк: header + router по viewState. Вся логика — в reducer.

`src/components/AppHeader.vue` — **упростить**:
- Убрать expansion-mode pill-группу (больше не нужна)
- Pill-группа: `Анализ | Граф` (два экрана вместо трёх режимов)
- Оставить ⚙ настройки

`package.json` — добавить `d3` (пока не используется, подготовка к фазе 4):
```
"dependencies": { "d3": "^7.9.0", "vue": "^3.5.13" }
```
Убрать `vis-network`, `vis-data` (пока не удаляем файлы — старый граф ещё жив для reference).

**Проверка:**
- `npm run build` — собирается
- Два экрана переключаются pill-группой
- Заглушки видны
- Старый код ещё существует, но не импортируется из нового App.vue

---

### Фаза 2: Экран профиля + scenario view

**Цель**: рабочий scenario-first экран — профиль слева, карточки ситуаций справа.

**Создать:**

`src/views/ScenarioView.vue` — layout:
```vue
<template>
  <div class="scenario-layout">
    <ProfileSidebar class="sidebar" />
    <SituationGrid class="content" />
  </div>
</template>
```
Layout: CSS Grid `280px 1fr`. Sidebar — профиль, content — карточки.

`src/components/ProfileSidebar.vue` — боковая панель профиля:
- `CollapsibleSection` «Демография» → `DemographicsPanel` (переиспользован as-is)
- `CollapsibleSection` «Ваши аттракторы» → `AttractorPicker`
- Все мутации через `dispatch()`

`src/components/AttractorPicker.vue` — визуальный пикер аттракторов:
- 3 слота (как текущий `AttractorDropdowns`, но с визуальными карточками)
- Каждый слот: `SearchableCombobox` (переиспользован) + цветной бейдж домена
- При выборе: бейдж с цветом домена через `domainColor()` из `utils/colors.ts`
- dispatch `SET_ATTRACTOR_SLOT` / `ADD_ATTRACTOR` / `CLEAR_ATTRACTORS`

`src/components/SituationGrid.vue` — сетка карточек:
```vue
<template>
  <div class="situation-grid">
    <div v-for="category in groupedSituations" :key="category.id" class="category-group">
      <h3>{{ category.title }}</h3>
      <div class="cards">
        <SituationCard
          v-for="sit in category.situations"
          :key="sit.id"
          :situation="sit"
          :hasMarkup="!!getMarkupForSituation(sit.id)"
          :relevance="computeRelevance(sit)"
          @open="dispatch({ type: 'OPEN_SITUATION', sitId: sit.id, attrId: sit.attractorL2 })"
        />
      </div>
    </div>
  </div>
</template>
```
- 33 ситуации, сгруппированные по 6 категориям из `SITUATION_CATEGORIES`
- Карточки отсортированы: ситуации с markup data (8 шт) сверху, с бейджем «есть данные»
- Релевантность: если `sit.attractorL2` совпадает с одним из `selectedAttractors` — карточка подсвечена

`src/components/SituationCard.vue` — карточка ситуации:
- Заголовок + короткое описание + бейдж категории (цвет)
- Если есть markup: «Данные: N респондентов»
- Если атрактор совпадает с профилем: border accent color
- `@click → emit('open')`

`src/components/SituationDetail.vue` — раскрытая ситуация:
- `PanelBreadcrumb` (переиспользован): Ситуации → Категория → Название
- Описание ситуации
- Предиктивный анализ: `predictBehavior()` (переиспользован из `usePrediction.ts`)
- Список стратегий: `StrategyBar` × N (переиспользован)
- Если нет markup data: «Предиктивный анализ недоступен для этой ситуации»

**Как dispatch работает в панелях:**
Каждая панель импортирует `useStore()` и вызывает `dispatch()`. Никаких прямых мутаций refs. Пример DemographicsPanel:
```vue
<DualRangeSlider
  :min="profile.demographics.ageMin"
  :max="profile.demographics.ageMax"
  @update="dispatch({ type: 'SET_AGE_RANGE', min: $event.min, max: $event.max })"
/>
```

**Миграция DemographicsPanel.vue:**
Текущий компонент напрямую мутирует `ageMin.value`, `gender.value` и др. через v-model. Переделать на `:model-value` + `@update:model-value="dispatch(...)"`. Структура и стили остаются.

**Проверка:**
- Scenario view показывает 33 ситуации в 6 категориях
- 8 ситуаций с markup data имеют бейдж
- Клик на карточку → SituationDetail с предикциями
- Изменение демографии → предикции пересчитываются
- Выбор аттракторов → релевантные карточки подсвечены
- Breadcrumb навигация работает
- `npm run build` проходит

---

### Фаза 3: D3-граф — визуальный слой

**Цель**: интерактивный SVG-граф на D3.js, заменяющий vis-network.

**Архитектурное решение: Vue + D3 гибрид**
- **Vue** управляет DOM: `v-for` по нодам и рёбрам, `:class` для состояний, `<transition>` для анимаций
- **D3** считает математику: `d3-zoom` для pan/zoom, `computeInitialPositions` для layout (переиспользован)
- **CSS** анимирует: `transition` на position, opacity, transform

Это лучше чем pure D3 (совместимо с Vue reactivity) и лучше чем vis-network (полный контроль).

**Создать:**

`src/composables/useGraphLayout.ts` — расчёт позиций (рефакторинг `useNetworkLayout.ts`):
```typescript
// Тот же алгоритм: L1 по кругу, L2 веером, L3 веером
// Но без зависимости от vis-network
export function computeLayout(attractors: Attractor[]): Map<string, { x: number; y: number }>
```
По сути переиспользуем `computeInitialPositions` из `useNetworkLayout.ts` — алгоритм хороший, нужно только убрать зависимость от массива и вернуть Map.

`src/composables/useD3Zoom.ts` — zoom behaviour:
```typescript
export function useD3Zoom(svgRef: Ref<SVGSVGElement | null>) {
  // d3.zoom() привязывается к SVG элементу
  // Возвращает: transform (ref), zoomTo(nodeIds), resetZoom()
  // Pan: drag на SVG
  // Zoom: колесо мыши
  // Programmatic: zoomTo([nodeId1, nodeId2]) — плавно подлететь к набору нод
}
```

`src/components/D3Graph.vue` — SVG граф (~200 строк):
```vue
<template>
  <svg ref="svgRef" class="d3-graph" @click.self="dispatch({ type: 'CLICK_EMPTY' })">
    <g :transform="transformString">
      <!-- Иерархические рёбра -->
      <path
        v-for="edge in visibleHierarchyEdges" :key="edge.id"
        :d="edgePath(edge)"
        class="edge-hierarchy"
        :class="{ faded: hasFocus && !edge.relevant }"
      />
      <!-- Корреляционные рёбра (только для фокусного узла) -->
      <transition-group name="fade">
        <path
          v-for="edge in visibleCorrelationEdges" :key="edge.id"
          :d="edgePath(edge)"
          class="edge-correlation"
          :class="[edge.corrType]"
          :stroke-width="edge.width"
        />
      </transition-group>
      <!-- Ноды -->
      <g
        v-for="node in visibleNodes" :key="node.id"
        :transform="`translate(${node.x}, ${node.y})`"
        class="graph-node"
        :class="[
          `level-${node.level}`,
          { focused: node.id === focusedNodeId, hovered: node.id === hoveredNodeId }
        ]"
        @click.stop="dispatch({ type: 'CLICK_NODE', nodeId: node.id, level: node.level })"
        @dblclick.stop="dispatch({ type: 'DBLCLICK_NODE', nodeId: node.id })"
        @mouseenter="dispatch({ type: 'HOVER_NODE', nodeId: node.id })"
        @mouseleave="dispatch({ type: 'HOVER_NODE', nodeId: null })"
      >
        <circle :r="node.radius" :fill="node.color" :stroke="node.borderColor" />
        <text>{{ node.label }}</text>
      </g>
    </g>
  </svg>
</template>
```

Ключевые вычисления:
- `visibleNodes: computed` — фильтрует по состоянию expand (L1 всегда видны, L2/L3 — если parent expanded)
- `visibleHierarchyEdges: computed` — рёбра между видимыми парами parent→child
- `visibleCorrelationEdges: computed` — **только** для focusedNodeId, через `getCorrEdgesForNode()`
- `edgePath(edge)` — SVG path `M x1,y1 Q cx,cy x2,y2` (quadratic bezier)
- Состояние expand: `expandedNodes: Ref<Set<string>>` — локальное для графа (какие L1/L2 раскрыты)

**Hover**: чисто визуальный — `hoveredNodeId` ref локальный, CSS transition на `transform: scale(1.1)` + `filter: drop-shadow()`.

**Focus**: через reducer — `CLICK_NODE` dispatch → reducer устанавливает focus → computed `visibleCorrelationEdges` обновляется → Vue рендерит рёбра с `<transition-group>`.

**Double-click (expand/collapse)**: `DBLCLICK_NODE` dispatch → reducer возвращает effect `ANIMATE_EXPAND` → effect executor добавляет id в `expandedNodes` → Vue рендерит новые ноды → CSS `transition: transform 0.4s, opacity 0.4s` анимирует появление.

**Zoom-to-fit**: при фокусе reducer возвращает effect `ZOOM_TO_FIT` → effect executor вызывает `d3Zoom.zoomTo(nodeIds)` → D3 плавно перемещает камеру.

`src/composables/useGraphEffects.ts` — Effect Executor для графа:
```typescript
export function useGraphEffects(
  expandedNodes: Ref<Set<string>>,
  d3Zoom: ReturnType<typeof useD3Zoom>,
) {
  function execute(effects: Effect[]) {
    for (const effect of effects) {
      switch (effect.type) {
        case 'EXPAND_NODE':
          expandedNodes.value = new Set([...expandedNodes.value, effect.nodeId])
          break
        case 'COLLAPSE_NODE':
          const next = new Set(expandedNodes.value)
          next.delete(effect.nodeId)
          expandedNodes.value = next
          break
        case 'ZOOM_TO_FIT':
          d3Zoom.zoomTo(effect.nodeIds)
          break
        // ...
      }
    }
  }
  return { execute }
}
```

`src/views/GraphView.vue` — обёртка:
```vue
<template>
  <div class="graph-layout">
    <D3Graph class="graph-area" />
    <GraphSidebar class="graph-sidebar" />
  </div>
</template>
```
Layout: CSS Grid `1fr var(--sidebar-width)`. Граф слева, sidebar справа (как сейчас, но с D3).

`src/components/GraphSidebar.vue` — боковая панель графа:
- Если нет фокуса: onboarding hint «Кликните на узел для анализа»
- Если фокус на ноде: `AttractorPanel` (переиспользован, dispatch вместо прямых мутаций)
- Если режим корреляций: `CorrelationPanel` (переиспользован, dispatch вместо v-model)
- `CollapsibleSection` «Демография» и «Аттракторы» — как в текущем RightPanel

**Миграция панелей для GraphSidebar:**

`AttractorPanel.vue` — изменения минимальны:
- `currentFocus.value = child.id` → `dispatch({ type: 'CLICK_NODE', nodeId: child.id, level: child.level })`
- `l3NodeId.value = child.id` → `dispatch({ type: 'CLICK_NODE', nodeId: child.id, level: 3 })`
- Breadcrumb actions → `dispatch({ type: 'CLICK_NODE', ... })`
- Emit `select-situation` → `dispatch({ type: 'OPEN_SITUATION', ... })`

`CorrelationPanel.vue` — изменения:
- `v-model="correlationAge"` → `:model-value` + `@update:model-value="dispatch({ type: 'SET_CORR_AGE', age: $event })"`
- Читает focusedNodeId и age из store computed

**CSS для графа (в D3Graph.vue `<style scoped>`):**
```css
.graph-node { cursor: pointer; transition: transform 0.2s ease; }
.graph-node:hover { transform: scale(1.1); }
.graph-node.focused circle { stroke: #fbbf24; stroke-width: 5px; }
.edge-correlation { opacity: 0; transition: opacity 0.3s ease; }
.edge-correlation.visible { opacity: 0.9; }
.edge-correlation.reinforcing { stroke: #0891b2; }
.edge-correlation.conflicting { stroke: #dc2626; }
/* Появление нод при expand */
.graph-node { transition: transform 0.4s ease, opacity 0.4s ease; }
```

**Проверка:**
- Граф показывает L1-ноды при открытии
- Double-click на L1 → L2-дети появляются с анимацией (CSS transition)
- Клик на L2 → корреляционные рёбра fade-in, камера центрируется
- Hover → нода увеличивается, тень, cursor: pointer
- Клик на L2 → GraphSidebar показывает AttractorPanel
- Pan (drag) и zoom (колесо) работают
- `npm run build` проходит

---

### Фаза 4: Интеграция + кросс-навигация

**Цель**: scenario view и graph view связаны, переходы работают, профиль общий.

**Кросс-навигация:**

1. **Из ситуации в граф**: в SituationDetail кнопка «Показать на графе» → dispatch `SWITCH_VIEW` + `CLICK_NODE` на связанный L2
2. **Из графа в ситуацию**: в AttractorPanel кнопка ситуации → dispatch `SWITCH_VIEW` + `OPEN_SITUATION`
3. **Профиль общий**: изменение демографии или аттракторов в ProfileSidebar (scenarios) обновляет и GraphSidebar при переключении

**Изменить:**

`src/composables/state/reducer.ts` — добавить transition actions:
```typescript
case 'SWITCH_VIEW': {
  if (action.view === state.viewState.view) return { state, effects: [] }
  return {
    state: {
      ...state,
      viewState: action.view === 'scenarios'
        ? { view: 'scenarios', focus: { type: 'grid' } }
        : { view: 'graph', focus: { type: 'none' }, graphMode: 'explore' },
      navHistory: pushNav(state.navHistory, state.viewState),
    },
    effects: [],
  }
}

// Комбинированное действие: перейти на граф И сфокусироваться на узле
case 'NAVIGATE_TO_GRAPH_NODE': {
  return {
    state: {
      ...state,
      viewState: {
        view: 'graph',
        focus: { type: 'node', nodeId: action.nodeId, level: action.level },
        graphMode: 'explore',
      },
      navHistory: pushNav(state.navHistory, state.viewState),
    },
    effects: [
      { type: 'EXPAND_NODE', nodeId: action.parentL1 }, // раскрыть родительский L1
      { type: 'HIGHLIGHT_NODE', nodeId: action.nodeId },
      { type: 'ZOOM_TO_FIT', nodeIds: [action.nodeId] },
    ],
  }
}
```

`src/components/SituationDetail.vue` — добавить кнопку:
```vue
<button @click="dispatch({ type: 'NAVIGATE_TO_GRAPH_NODE', nodeId: attrId, ... })">
  Показать на графе →
</button>
```

`src/components/panels/AttractorPanel.vue` — emit ситуации как dispatch:
```typescript
// Вместо emit('select-situation', attrId, sitId):
dispatch({ type: 'OPEN_SITUATION', sitId, attrId })
// Reducer автоматически переключит на scenario view
```

**GO_BACK навигация:**
- Reducer хранит navHistory как стек ViewState
- `GO_BACK` достаёт предыдущий ViewState целиком
- Если пользователь был в graph → open situation → go back → возвращается в graph с тем же фокусом

**Проверка:**
- Scenario → клик «На графе» → граф с фокусом на нужном L2
- Graph → клик ситуации в панели → scenario detail с этой ситуацией
- GO_BACK работает между экранами
- Профиль сохраняется при переключении экранов
- Демография из scenarios view обновляет предикции
- Смена аттракторов в scenarios подсвечивает ноды при переходе в graph

---

### Фаза 5: Удаление старого кода

**Цель**: убрать vis-network и весь старый код.

**Удалить файлы:**

| Файл | Причина |
|------|---------|
| `src/composables/useNetwork.ts` | Заменён D3Graph + useGraphEffects |
| `src/composables/useNetworkBreathe.ts` | Не нужен (декоративный шум) |
| `src/composables/useNetworkLayout.ts` | Заменён useGraphLayout.ts |
| `src/composables/useAppState.ts` | Заменён state/useStore.ts |
| `src/composables/useVisualSettings.ts` | Упростить или удалить (14 refs для настроек vis-network) |
| `src/components/NetworkCanvas.vue` | Заменён D3Graph.vue |
| `src/components/GraphZone.vue` | Заменён GraphView.vue |
| `src/components/FocusPanel.vue` | Функция встроена в D3Graph (тултип) |
| `src/components/ActiveNodeIndicator.vue` | Функция в GraphSidebar |
| `src/components/AttractorDropdowns.vue` | Заменён AttractorPicker.vue |
| `src/components/RightPanel.vue` | Заменён: scenarios → SituationGrid, graph → GraphSidebar |
| `src/components/VisualSettingsPanel.vue` | Удалить (настройки vis-network) |
| `src/components/panels/EmptyPanel.vue` | Онбординг переработан в CoachMark |
| `src/components/panels/AllSituationsPanel.vue` | Заменён SituationGrid.vue |
| `src/components/panels/L3Panel.vue` | Функция в AttractorPanel (L3 = дочерний узел) |
| `src/types/network.ts` | Типы vis-network |

**Обновить** `package.json`:
```diff
- "vis-data": "^7.1.9",
- "vis-network": "^9.1.9",
+ "d3": "^7.9.0",
```

**Удалить** из `global.css`:
- Секция `div.vis-tooltip` (строки 107–122) — vis-network тултипы

**Проверка:**
- `npm run build` — нет ошибок, нет неиспользуемых импортов
- `npx vue-tsc --noEmit` — типы проходят
- Полный прогон обоих экранов
- Размер бандла уменьшился (vis-network ~500KB → D3 ~200KB)

---

### Фаза 6: Полировка

**6a: Анимации**

- Переход между экранами: `<Transition name="slide">` на ScenarioView/GraphView
- Раскрытие карточки ситуации: `<Transition name="expand">` 
- Появление нод при expand: CSS `transition: transform 0.4s ease, opacity 0.4s ease`
- Появление рёбер корреляций: CSS `transition: opacity 0.3s ease`
- Zoom-to-fit: D3 `d3.transition().duration(500).call(zoom.transform, ...)`

**6b: Onboarding**

Обновить CoachMark-и:
| ID | Где | Текст |
|----|-----|-------|
| `cm-profile` | ProfileSidebar | «Выберите ваши аттракторы — карточки подстроятся» |
| `cm-situation` | SituationGrid | «Карточки с данными показывают предиктивный анализ» |
| `cm-graph` | GraphView | «Дважды кликните на домен, чтобы раскрыть его» |
| `cm-graph-focus` | GraphView | «Кликните на аттрактор — появятся его корреляции» |

**6c: Responsive**

- Scenario view: на `<1024px` ProfileSidebar сворачивается в horizontal bar сверху
- Graph view: на `<1024px` GraphSidebar сворачивается в bottom sheet
- CSS Grid breakpoints в ScenarioView и GraphView

**6d: Semantic Zoom (stretch goal)**

В D3Graph: `d3.zoom` отслеживает scale → при `scale < 0.4` скрывать L3, при `scale < 0.25` скрывать L2. Реализация: computed `visibleNodes` зависит от `zoomScale` ref.

---

## Файловая карта

### Создать (16 файлов)

```
src/composables/state/
├── types.ts              # ViewState, Actions, Effects — типы ядра
├── reducer.ts            # Чистый reducer
├── selectors.ts          # Derived state
└── useStore.ts           # Vue composable + dispatch

src/composables/
├── useGraphLayout.ts     # Детерминированные позиции нод
├── useD3Zoom.ts          # D3 zoom behaviour
└── useGraphEffects.ts    # Effect executor для графа

src/views/
├── ScenarioView.vue      # Основной экран: профиль + карточки
└── GraphView.vue          # Граф: D3 + sidebar

src/components/
├── ProfileSidebar.vue    # Боковая панель профиля
├── AttractorPicker.vue   # Визуальный пикер аттракторов
├── SituationGrid.vue     # Сетка карточек ситуаций
├── SituationCard.vue     # Одна карточка
├── SituationDetail.vue   # Раскрытая ситуация
├── D3Graph.vue           # SVG граф
├── GraphTooltip.vue      # Кастомный тултип
└── GraphSidebar.vue      # Боковая панель графа
```

### Переиспользовать без изменений (9 файлов)

```
src/composables/usePrediction.ts       # предиктивный движок
src/composables/useCorrelations.ts     # расчёт корреляций
src/composables/useAttractorStore.ts   # данные аттракторов
src/composables/useMarkupStore.ts      # данные разметки
src/composables/useTheme.ts            # темы
src/composables/useCoachMarks.ts       # онбординг
src/utils/colors.ts                    # цвета доменов
src/data/correlations.ts               # 137 корреляций
src/data/situations.ts                 # 33 ситуации + 6 категорий
src/data/strategies.ts                 # стратегии с ageModifier
src/types/situation.ts                 # типы ситуаций
src/types/attractor.ts                 # типы аттракторов
```

### Переиспользовать с изменениями (7 файлов)

```
src/components/DemographicsPanel.vue    # v-model → dispatch
src/components/DualRangeSlider.vue      # без изменений (emit остаётся)
src/components/SearchableCombobox.vue   # без изменений
src/components/StrategyBar.vue          # без изменений
src/components/CollapsibleSection.vue   # без изменений
src/components/PanelBreadcrumb.vue      # без изменений
src/components/CoachMark.vue            # обновить тексты
src/components/panels/AttractorPanel.vue # dispatch вместо ref.value=
src/components/panels/CorrelationPanel.vue # dispatch вместо v-model
src/components/AppHeader.vue            # упростить (2 кнопки вместо 6)
src/components/GraphLegend.vue          # обновить текст легенды
```

### Удалить (16 файлов)

```
src/composables/useNetwork.ts           # vis-network → D3
src/composables/useNetworkBreathe.ts    # декоративный шум
src/composables/useNetworkLayout.ts     # → useGraphLayout.ts
src/composables/useAppState.ts          # 25 refs → reducer
src/composables/useVisualSettings.ts    # настройки vis-network
src/composables/useAttractorDisplay.ts  # логика в selectors.ts
src/components/NetworkCanvas.vue        # → D3Graph.vue
src/components/GraphZone.vue            # → GraphView.vue
src/components/FocusPanel.vue           # → GraphTooltip.vue
src/components/ActiveNodeIndicator.vue  # → GraphSidebar
src/components/AttractorDropdowns.vue   # → AttractorPicker.vue
src/components/RightPanel.vue           # → SituationGrid + GraphSidebar
src/components/VisualSettingsPanel.vue   # настройки vis-network
src/components/panels/EmptyPanel.vue    # → CoachMark
src/components/panels/AllSituationsPanel.vue # → SituationGrid
src/components/panels/L3Panel.vue       # → AttractorPanel
src/types/network.ts                    # типы vis-network
```

### Не трогаем

```
src/assets/global.css     # CSS-переменные остаются (убрать .vis-tooltip)
src/data/themes.ts        # JS-цвета для canvas (пригодится для D3)
scripts/                  # пайплайны данных
public/data/              # JSON данные
data/                     # attractors.json
.data/                    # сырые CSV
index.old.html, js/, css/ # legacy
```

---

## Верификация

### После фазы 1:
- `npm run build` проходит
- Два экрана-заглушки переключаются

### После фазы 2:
- Scenario view: 33 ситуации, 6 категорий, 8 с бейджем «данные»
- Клик карточки → detail с предикциями
- Фильтры демографии → предикции обновляются
- Выбор аттракторов → релевантные карточки подсвечены
- **Core flow за 2 клика**: выбрать профиль → открыть ситуацию → увидеть стратегии

### После фазы 3:
- Граф: L1 по кругу, double-click раскрывает L2
- Hover: увеличение + тень + pointer
- Клик: фокус + корреляции fade-in + zoom-to-fit
- Pan/zoom работает
- Sidebar показывает детали фокусного узла

### После фазы 4:
- Scenario → «На графе» → граф с фокусом
- Graph → ситуация → scenario detail
- GO_BACK между экранами
- Профиль общий

### После фазы 5:
- `npm run build` без ошибок
- Нет мёртвого кода
- Бандл меньше (no vis-network)

### После фазы 6:
- Анимации переходов
- Онбординг на обоих экранах
- Responsive на 1024px
