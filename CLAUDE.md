# CLAUDE.md

## Быстрый старт

```bash
npm run dev          # http://localhost:5173
npm run build        # vue-tsc + vite → dist/
npx vue-tsc --noEmit # type-check без сборки
python3 scripts/parse_csv.py         # CSV → data/attractors.json
python3 scripts/parse_markup_csv.py  # разметка + демография + аттракторы → public/data/markup.json
python3 scripts/merge_all.py         # 3 CSV → .data/merged_respondents.csv (единая таблица)
```

## Что такое этот проект

**Vision Attractor** (брендовое имя UI — **LOGOS v3.0**) — BI-дашборд для анализа жизненных аттракторов. Два экрана: **«Сценарии»** (карточки 33 жизненных ситуаций с прогнозами поведения) и **«Граф»** (интерактивная D3-визуализация иерархии аттракторов с корреляционным анализом). Демография и выбранные аттракторы — общий профиль, ортогональный обоим экранам.

## Архитектура — state machine

Весь UI-стейт лежит в одной `AppState` с discriminated-union `ViewState`. Переходы — через reducer (чистая функция) + effects (императивные команды графу).

```
src/composables/state/
├── types.ts         # AppState, Action, Effect, ViewState (+ discriminated unions)
├── reducer.ts       # reduce(state, action) → { state, effects }
├── selectors.ts     # derivePanelRoute, deriveFocusedNodeId, deriveMidAge, …
└── useStore.ts      # синглтон: dispatch, computed slices, effect handler
```

**ViewState** (discriminated union):
- `{ view: 'scenarios', focus: { type: 'grid' } | { type: 'detail', sitId, attrId, strategyIdx } }`
- `{ view: 'graph', graphMode: 'explore' | 'correlations', focus: { type: 'none' | 'node' | 'correlations' } }`

**Effect handler** регистрируется `D3Graph.vue` при `onMounted` через `setEffectHandler`. До регистрации эффекты копятся в `pendingEffects` (чтобы кросс-навигация «сценарий → граф» не теряла анимации).

## Карта файлов

```
src/
├── App.vue                        # лоадер данных + Transition между ScenarioView/GraphView
├── main.ts                        # createApp + global.css
├── composables/
│   ├── state/
│   │   ├── types.ts               # AppState, Action, Effect, ViewState
│   │   ├── reducer.ts             # reduce(state, action)
│   │   ├── selectors.ts           # derivers для computed
│   │   └── useStore.ts            # синглтон стейта + dispatch
│   ├── useAttractorStore.ts       # СИНГЛТОН: загрузка attractors.json + getAttractor
│   ├── useMarkupStore.ts          # СИНГЛТОН: загрузка markup.json + lookup утилиты
│   ├── useTheme.ts                # СИНГЛТОН: тема (light/dark)
│   ├── useVisualSettings.ts       # СИНГЛТОН: настройки графа
│   ├── useCoachMarks.ts           # СИНГЛТОН: onboarding подсказки (localStorage)
│   ├── useGraphLayout.ts          # STATELESS: computeLayout через d3-force (300 ticks)
│   ├── useD3Zoom.ts               # ИНСТАНС: d3-zoom behavior + zoomTo + fitAll
│   ├── useGraphEffects.ts         # ИНСТАНС: трансляция Effect[] в императивные вызовы
│   ├── useCorrelations.ts         # STATELESS: getCorrelationAtAge (возрастной fade)
│   ├── usePrediction.ts           # STATELESS: predictBehavior (Largest Remainder Method)
│   └── useAttractorDisplay.ts     # STATELESS: утилиты отображения (flatLabel)
├── views/
│   ├── ScenarioView.vue           # ProfileSidebar + SituationGrid (карточки + detail overlay)
│   └── GraphView.vue              # graph-area (D3Graph + GraphLegend + pill Обзор/Корреляции) + GraphSidebar
├── components/
│   ├── AppHeader.vue              # LOGOS + pill Analyse/Graph + v3.0
│   ├── D3Graph.vue                # SVG + zoom/pan + L1/L2/L3 + рёбра иерархии и корреляций
│   ├── GraphLegend.vue            # левая нижняя легенда (L1/L2/L3 + цвета корреляций)
│   ├── GraphSidebar.vue           # правая панель GraphView: Демография + Аттракторы + panel route
│   ├── ProfileSidebar.vue         # левая панель ScenarioView: Демография + Аттракторы
│   ├── DemographicsPanel.vue      # DualRangeSlider + 3 select (пол/семья/дети)
│   ├── DualRangeSlider.vue        # двойной слайдер с тиками и тултипом
│   ├── SearchableCombobox.vue     # кастомный combobox с поиском и Teleport
│   ├── AttractorPicker.vue        # 3 комбобокса выбора аттракторов
│   ├── CollapsibleSection.vue     # сворачиваемая секция + CoachMark
│   ├── CoachMark.vue              # всплывающая подсказка (localStorage dismiss)
│   ├── PanelBreadcrumb.vue        # breadcrumb с кликабельными crumb'ами
│   ├── SituationGrid.vue          # сетка карточек ситуаций + SituationDetail overlay
│   ├── SituationCard.vue          # карточка: заголовок + описание + тэг домена + badge «Анализ»
│   ├── SituationDetail.vue        # раскрытая ситуация: breadcrumb + Prediction bars + CTA
│   ├── StrategyBar.vue            # горизонтальная полоса стратегии с процентом
│   └── panels/
│       ├── AttractorPanel.vue     # аттрактор в graph-sidebar: breadcrumb + инсайт + дети/корреляции
│       └── CorrelationPanel.vue   # режим Корреляции: слайдер возраста + список связей
├── data/
│   ├── correlations.ts            # ~137 корреляций между L2 с возрастными диапазонами
│   ├── situations.ts              # 33 ситуации (привязка к L2 через attractorL2)
│   ├── strategies.ts              # стратегии с ageModifier: (age) => number
│   └── themes.ts                  # цвета для UI
├── types/
│   ├── attractor.ts               # Attractor, Domain
│   ├── correlation.ts             # Correlation, CorrelationType
│   └── situation.ts               # Situation, Strategy, MarkupSituation, MarkupStrategy
└── utils/
    ├── nodeStyles.ts              # wrapLabel()
    ├── edgeStyles.ts              # (для будущих стилей рёбер)
    └── colors.ts                  # domainColor, domainBorder, domainGradientCenter, domainFontColor

data/
└── attractors.json                # domains[] + attractors[] (L1/L2/L3)

public/data/
└── markup.json                    # агрегаты по 8 размеченным ситуациям

.data/                             # ⚠️ .gitignore
├── demographics.csv               # ~690 респондентов
├── attractor_scores.csv           # ~690 × 58 L2-оценок
├── markup_dataset.csv             # ~693 × 46 стратегий
├── attractor_dataset.csv
└── merged_respondents.csv         # ABT 690 × 112

scripts/
├── parse_csv.py                   # → data/attractors.json
├── parse_markup_csv.py            # → public/data/markup.json
└── merge_all.py                   # → .data/merged_respondents.csv
```

## Экран 1: ScenarioView («Сценарии», pill «Analyse»)

- Левый сайдбар — `ProfileSidebar`: Демография + Ваши аттракторы (общие на оба экрана).
- Основная зона — `SituationGrid`: 33 карточки, сгруппированные по 6 категориям таксономии (экзистенциальные, реляционные, материальные, …).
- Клик по карточке → action `OPEN_SITUATION` → state переходит в `focus: { type: 'detail' }` → overlay `SituationDetail` с breadcrumb + Prediction-барами.
- Если у ситуации нет markup-данных (только 8 из 33 размечены) — деталь показывает «Data for this situation is not yet available».

## Экран 2: GraphView («Граф»)

- Сверху канваса pill-переключатель **Обзор / Корреляции** (`graphMode: 'explore' | 'correlations'`).
- Канвас — `D3Graph.vue`: SVG с зум/пан, L1-узлы c radial-gradient, L2/L3 — плоские круги. Иерархические рёбра curved, корреляционные — с glow-filter.
- Легенда — слева внизу (`GraphLegend.vue`).
- Правый сайдбар — `GraphSidebar`: Демография + Аттракторы + панель роутинга (EmptyPanel / AttractorPanel / CorrelationPanel).

### Режим explore
- Клик по узлу любого уровня → `CLICK_NODE` → focus: `{ type: 'node' }` → highlight + zoom-to-fit.
- Двойной клик → `DBLCLICK_NODE` → effect `EXPAND_NODE` (toggle expand/collapse).
- `AttractorPanel` показывает breadcrumb + инсайт + ситуации L2 или детей/корреляции.

### Режим correlations
- Клик по L2 → focus: `{ type: 'correlations', nodeId, age }` → рисуются рёбра до всех коррелирующих L2. Повторный клик — снимает.
- Клик по L1/L3 в этом режиме — обычный node-focus.
- `CorrelationPanel` показывает слайдер возраста + список связей с процентами силы.

## Режимы видимости рёбер

- Иерархические рёбра — всегда (fade при фокусе, если не relevant).
- Корреляционные рёбра — только в `graphMode='correlations'` при focused L2.

## Composables — три типа

- **Синглтоны** (state вне функции): `useAttractorStore`, `useMarkupStore`, `useTheme`, `useVisualSettings`, `useCoachMarks`, `useStore` (state machine).
- **Инстансы**: `useD3Zoom`, `useGraphEffects` — создаются в `D3Graph.vue`.
- **Stateless**: `useGraphLayout`, `useCorrelations`, `usePrediction`, `useAttractorDisplay`.

## Effects pipeline

```
UI click → dispatch(Action) → reducer(state, action) → { state', effects[] }
                                                        ↓
                                            effectHandler (D3Graph.execute)
                                                        ↓
                                    expandedNodes / hoveredNodeId / d3Zoom.zoomTo
```

Reactive state (focusedNodeId, correlationAge) деривится из `viewState` через selectors — императивные эффекты не нужны для highlight/correlation visibility.

## Корреляции

137 записей в `correlations.ts`. Формат:
```typescript
{ id: 'c01', from: 'l2_rabota_01', to: 'l2_byt_03',
  baseType: 'reinforcing',
  ageRanges: [{ min: 22, max: 75, strength: 0.8, type: 'reinforcing' }] }
```
Возрастная логика в `getCorrelationAtAge`: fade на 3-unit границах, floor 0.3×.

Цвета: усиливающие — teal (#0891b2), конфликтующие — red (#dc2626). Color-blind safe.

## useMarkupStore

```typescript
loadMarkupData()                      // fetch('./data/markup.json')
getMarkupForSituation(situationId)    // по linkedSituationId
getMarkupById(markupId)               // по id (mk01–mk08)
getMarkupForAttractor(attractorL2)    // все ситуации для L2
```

### Маппинг ситуаций (8 размеченных)
```
mk01: Рождение ребенка       → s19 (l2_semya_03)    mk05: Развод            → s01 (l2_semya_02)
mk02: Смена работы            → s32 (l2_rabota_01)   mk06: Обращение к врачу → s09 (l2_telo_02)
mk03: Переезд                → s31 (l2_byt_02)      mk07: Поступление в ВУЗ → s04 (l2_samorazv_01)
mk04: Регистрация брака      → s21 (l2_semya_02)    mk08: Поиск отношений   → s33 (l2_semya_01)
```

## Тема и layout

- CSS: `:root` — light theme. CSS-переменные в `assets/global.css`.
- Шрифты: Inter Tight (display) + Inter (body) через Google Fonts.
- Layout: `#app` flex-column, `main-content` flex, внутри — grid `1fr var(--sidebar-width)`.
- Responsive: `--sidebar-width` 360px → 320px@1280 → 280px@1024; @768px — колонка становится строкой.

## Accessibility

- `--text-muted`: WCAG AA на светлом фоне.
- ARIA: `aria-label` на иконках, `aria-expanded` на CollapsibleSection.
- Color-blind: корреляции teal/red (не green/red).

## Onboarding (CoachMarks)

`useCoachMarks.ts` — localStorage-based. При первом взаимодействии появляются подсказки:
- `cm-graph` — в GraphView.
- `cm-demographics`, `cm-attractors` — в ProfileSidebar/GraphSidebar.
- `cm-situation` — над сеткой ситуаций.

## Деплой

### Сборка
```bash
npm run build        # → dist/
docker build -t vision-attractor .
```

### Файлы на сетевом диске
```
/app/data/
├── attractors.json    ← data/attractors.json
└── markup.json        ← public/data/markup.json
```
nginx: `/data/` → `/app/data/`. Приложение загружает оба через `fetch()`.

## Working Style

- **Читай файл перед редактированием** — не полагайся на память.
- **Сразу делай** — без планов/драфтов, если не просят.
- **Несколько гипотез при дебаге**.
- **Интерфейс и данные на русском языке** (бренд «LOGOS» — исключение).

## Legacy

- `index.old.html`, `js/`, `css/` — vanilla JS версия, не трогать.
- Рефакторы: удалены `useAppState`, `FocusPanel`, `AttractorDropdowns`, `ActiveNodeIndicator`, `panels/SituationPanel`, `panels/EmptyPanel`, весь vis-network стэк (`useNetwork`, `NetworkCanvas`, `RightPanel`, `GraphZone`). См. коммиты e78e1e8, bfbd4bb, fba747a.
