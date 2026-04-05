# CLAUDE.md

## Быстрый старт

```bash
npm run dev          # http://localhost:5173
npm run build        # vue-tsc + vite → dist/
npx vue-tsc --noEmit # type-check без сборки
python3 scripts/parse_csv.py         # CSV → public/data/attractors.json
python3 scripts/parse_markup_csv.py  # разметка + демография + аттракторы → markup.json
python3 scripts/merge_all.py         # 3 CSV → .data/merged_respondents.csv (единая таблица)
```

## Что такое этот проект

**Vision Attractor** — BI-дашборд для анализа жизненных ценностей. Интерактивный граф (vis-network) показывает иерархию «аттракторов» (жизненных доменов) и корреляции между ними. Правая панель отображает предиктивный анализ для выбранных категорий.

## Карта файлов

```
src/
├── App.vue                        # корневой компонент, логика + grid layout + collapse
├── composables/
│   ├── useAppState.ts             # СИНГЛТОН: весь UI-стейт (+ rightPanelCollapsed)
│   ├── useAttractorStore.ts       # СИНГЛТОН: данные аттракторов из JSON
│   ├── useMarkupStore.ts          # СИНГЛТОН: данные разметки респондентов из markup.json
│   ├── useTheme.ts                # СИНГЛТОН: тема (light/dark)
│   ├── useVisualSettings.ts       # СИНГЛТОН: настройки графа
│   ├── useCoachMarks.ts           # СИНГЛТОН: onboarding подсказки (localStorage)
│   ├── useNetwork.ts              # ИНСТАНС: vis-network (см. CLAUDE-graph.md)
│   ├── useCorrelations.ts         # STATELESS: расчёт корреляций
│   ├── usePrediction.ts           # STATELESS: predictBehavior (Largest Remainder Method)
│   └── useAttractorDisplay.ts     # STATELESS: утилиты отображения
├── components/
│   ├── AppHeader.vue              # шапка: режимы, ситуации, настройки
│   ├── GraphZone.vue              # обёртка: NetworkCanvas + GraphLegend + FocusPanel + CoachMark
│   ├── NetworkCanvas.vue          # vis-network + defineExpose методов графа
│   ├── RightPanel.vue             # правая панель: collapsible секции + роутинг + transitions
│   ├── CollapsibleSection.vue     # переиспользуемая сворачиваемая секция + CoachMark
│   ├── ActiveNodeIndicator.vue    # индикатор активного узла (домен, цвет, уровень)
│   ├── SearchableCombobox.vue     # searchable dropdown (Teleport to body, keyboard nav)
│   ├── DemographicsPanel.vue      # фильтры: возраст/пол/семья
│   ├── DualRangeSlider.vue        # dual range slider с тултипом и пропорц. тиками
│   ├── AttractorDropdowns.vue     # 3 combobox-а L2 + корреляции (teal/red color-blind safe)
│   ├── PanelBreadcrumb.vue        # единый breadcrumb для всех панелей
│   ├── CoachMark.vue              # всплывающая подсказка (dismiss → localStorage)
│   ├── StrategyBar.vue            # бар стратегии с анимацией
│   └── panels/
│       ├── AttractorPanel.vue     # аттрактор: breadcrumb + описание + ситуации
│       ├── SituationPanel.vue     # ситуация: breadcrumb + стратегии + разметка
│       ├── AllSituationsPanel.vue # список всех 33 ситуаций
│       ├── EmptyPanel.vue         # onboarding: 3-шаговый гид
│       └── L3Panel.vue            # L3-узел: breadcrumb + описание
├── data/
│   ├── correlations.ts            # ~137 корреляций между L2 с возрастными диапазонами
│   ├── situations.ts              # 33 ситуации (привязка к L2 через attractorL2)
│   ├── strategies.ts              # стратегии с ageModifier: (age) => number
│   └── themes.ts                  # JS-цвета для vis-network canvas
├── types/
│   └── situation.ts               # Situation, Strategy, MarkupSituation, MarkupStrategy, *Demographics
└── utils/
    ├── nodeStyles.ts              # wrapLabel(), nodeFont(), nodeSize() и др.
    ├── edgeStyles.ts              # hierarchyEdge(), correlationEdge()
    └── colors.ts                  # domainColor(), domainBorder() (sat 30-55%)

public/data/
└── markup.json                    # 8 ситуаций: частоты + демография + аттракторный профиль

data/
└── attractors.json                # domains[] + attractors[] (L1/L2/L3)

.data/                             # ⚠️ .gitignore — индивидуальные данные
├── demographics.csv               # ~690 респондентов (пол, возраст, семья, образование)
├── attractor_scores.csv           # ~690 респондентов, 58 L2-аттракторов (оценки 0–3)
├── markup_dataset.csv             # ~693 респондента, 8 ситуаций × 46 стратегий (0/1)
├── attractor_dataset.csv          # исходник для attractors.json
└── merged_respondents.csv         # ЕДИНАЯ ТАБЛИЦА (ABT): 690 × 112

scripts/
├── parse_csv.py                   # attractor_dataset.csv → attractors.json
├── parse_markup_csv.py            # разметка + демография + аттракторы → markup.json
└── merge_all.py                   # 3 CSV → merged_respondents.csv
```

## Данные респондентов — три источника

```
Респондент (ID) ──┬── Демография (7 полей)       ← demographics.csv
                  ├── Аттракторы (58 оценок 0–3)  ← attractor_scores.csv
                  └── Поведение (46 стратегий 0/1) ← markup_dataset.csv
```

- Демография ↔ Аттракторы: **100%** совпадение ID
- С Разметкой: **98.4%** (682/694), 1 fuzzy-match, 12 без демографии
- 57/58 колонок аттракторов = L2-ноды графа (маппинг по label из attractors.json)
- 1 extra-колонка `Социальное любопытство` — нет L2-пары
- `.data/` в `.gitignore` и `.dockerignore`, `markup.json` содержит только агрегаты

### Типы ID респондентов
`п1_NN`...`п4_NN` (волны 1–4), `п5_NN_Фамилия` (волна 5), `П_Имя_дата_Имя` (основная выборка), `пилот_N`

## Пайплайны

**markup.json** (дашборд): `markup_dataset + demographics + attractor_scores` → `parse_markup_csv.py` → `public/data/markup.json`
- Стратегии с частотами, демографией (avgAge, genderSplit, byAgeGroup), аттракторным профилем (топ-10 L2)

**Единая таблица** (анализ): `demographics + attractor_scores + markup_dataset` → `merge_all.py` → `.data/merged_respondents.csv`

## Composables — три типа

**Синглтоны** (state вне функции, общий для всех компонентов): `useAppState`, `useAttractorStore`, `useMarkupStore`, `useTheme`, `useVisualSettings`, `useCoachMarks`

**Инстанс**: `useNetwork` — создаётся только в `NetworkCanvas.vue`, expose → GraphZone → App.vue

**Stateless**: `useCorrelations`, `usePrediction`, `useAttractorDisplay`

## Цепочка expose (граф → App.vue)

```
NetworkCanvas → defineExpose({...}) → GraphZone → defineExpose({networkRef}) → App.vue
```

## Правая панель — роутинг

```
RightPanel
  ├── CollapsibleSection "Демография" (collapsed by default, CoachMark)
  │     └── DemographicsPanel (DualRangeSlider + selects)
  ├── CollapsibleSection "Аттракторы человека" (collapsed by default, CoachMark)
  │     └── AttractorDropdowns (SearchableCombobox × 3)
  ├── ActiveNodeIndicator | header (Transition)
  └── panelState → (Transition mode="out-in")
        EmptyPanel (onboarding) | AllSituationsPanel | AttractorPanel | SituationPanel | L3Panel
```

Все панели используют `PanelBreadcrumb` для единообразной навигации.

Правая панель сворачивается кнопкой на границе графа (`rightPanelCollapsed` в `useAppState`).

## Корреляции

137 записей в `correlations.ts`. Формат:
```typescript
{ id: 'c01', from: 'l2_rabota_01', to: 'l2_byt_03',
  baseType: 'reinforcing',
  ageRanges: [{ min: 22, max: 75, strength: 0.8, type: 'reinforcing' }] }
```
Возрастная логика: fade на 3-unit границах, floor 0.3×.

Цвета: усиливающие — teal (#0891b2), конфликтующие — red (#dc2626). Color-blind safe.

## useMarkupStore

```typescript
loadMarkupData()                      // fetch('./data/markup.json')
getMarkupForSituation(situationId)    // по linkedSituationId
getMarkupById(markupId)               // по id (mk01–mk08)
getMarkupForAttractor(attractorL2)    // все ситуации для L2
```

### Маппинг ситуаций
```
mk01: Рождение ребенка       → s19 (l2_semya_03)    mk05: Развод            → s01 (l2_semya_02)
mk02: Смена работы            → s32 (l2_rabota_01)   mk06: Обращение к врачу → s09 (l2_telo_02)
mk03: Переезд                → s31 (l2_byt_02)      mk07: Поступление в ВУЗ → s04 (l2_samorazv_01)
mk04: Регистрация брака      → s21 (l2_semya_02)    mk08: Поиск отношений   → s33 (l2_semya_01)
```

## Добавление данных

**Корреляции** (`correlations.ts`): текущий max id = c137. `from`/`to` = L2 ID.

**Ситуации** (`situations.ts`): текущий max = s33. Стратегии в `strategies.ts` с `ageModifier`.

## Тема и layout

- CSS: `:root` — light theme. CSS-переменные в `global.css`.
- Шрифты: Inter Tight (display) + Inter (body) через Google Fonts.
- Type scale: `--fs-xs` (11px) → `--fs-brand` (22px).
- JS THEMES: vis-network не видит CSS → цвета canvas через `themes.ts`
- Layout: `#app` flex-column, `.main-grid` grid `1fr var(--right-panel-width)`
- Responsive: `--right-panel-width` 456px → 360px@1280 → 300px@1024

## Accessibility

- `--text-muted`: rgba(0,0,0,0.55) — WCAG AA (5.3:1). `--text-muted-soft` для декора.
- ARIA: `aria-label` на icon-кнопках, `aria-expanded` на CollapsibleSection, `aria-label` на selects/sliders.
- Color-blind: корреляции teal/red (не green/red).

## Onboarding (CoachMarks)

`useCoachMarks.ts` — localStorage-based. Подсказки появляются при первом взаимодействии:
- Граф: "Кликните на любой узел для анализа"
- Демография: "Фильтры влияют на расчёт корреляций..."
- Аттракторы: "Выберите до 3 аттракторов..."

Сброс: ⚙ Настройки → "Показать подсказки заново".

## Деплой

### Сборка (Docker)
```bash
npm run build        # → dist/
docker build -t vision-attractor .
```

### Файлы на сетевом диске `/app/data/`
```
/app/data/
├── attractors.json    ← data/attractors.json
└── markup.json        ← public/data/markup.json
```
nginx: `/data/` → `/app/data/`. Приложение загружает оба через `fetch()`.

### Обновление данных
```bash
python3 scripts/parse_csv.py           # → data/attractors.json
python3 scripts/parse_markup_csv.py    # → public/data/markup.json
# Скопировать на сетевой диск:
cp data/attractors.json /app/data/
cp public/data/markup.json /app/data/
```

## Подробности графа

Детали useNetwork, useAppState, подсветки, vis-network → **[CLAUDE-graph.md](./CLAUDE-graph.md)**

## Working Style

- **Читай файл перед редактированием** — не полагайся на память
- **Сразу делай** — без планов/драфтов если не просят
- **Несколько гипотез при дебаге**
- **Интерфейс и данные на русском языке**

## Legacy

`index.old.html`, `js/`, `css/` — vanilla JS версия, не трогать.
