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
├── App.vue                        # корневой компонент, вся логика взаимодействия
├── composables/
│   ├── useAppState.ts             # СИНГЛТОН: весь UI-стейт (см. CLAUDE-graph.md)
│   ├── useAttractorStore.ts       # СИНГЛТОН: данные аттракторов из JSON
│   ├── useMarkupStore.ts          # СИНГЛТОН: данные разметки респондентов из markup.json
│   ├── useTheme.ts                # СИНГЛТОН: тема (light/dark)
│   ├── useVisualSettings.ts       # СИНГЛТОН: настройки графа
│   ├── useNetwork.ts              # ИНСТАНС: vis-network (см. CLAUDE-graph.md)
│   ├── useCorrelations.ts         # STATELESS: расчёт корреляций
│   ├── usePrediction.ts           # STATELESS: predictBehavior (Largest Remainder Method)
│   └── useAttractorDisplay.ts     # STATELESS: утилиты отображения
├── components/
│   ├── AppHeader.vue              # шапка: режимы, ситуации, настройки
│   ├── GraphZone.vue              # обёртка: NetworkCanvas + GraphLegend + FocusPanel
│   ├── NetworkCanvas.vue          # vis-network + defineExpose методов графа
│   ├── RightPanel.vue             # правая панель: роутинг sub-panels
│   ├── DemographicsPanel.vue      # фильтры: возраст/пол/семья
│   ├── AttractorDropdowns.vue     # 3 дропдауна L2 + корреляции
│   ├── StrategyBar.vue            # бар стратегии с анимацией
│   └── panels/
│       ├── AttractorPanel.vue     # L2-узел: описание + ситуации
│       ├── SituationPanel.vue     # ситуация: стратегии + данные разметки
│       ├── AllSituationsPanel.vue # список всех 33 ситуаций
│       └── L3Panel.vue            # L3-узел: описание + кнопка фокуса
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
    └── colors.ts                  # domainColor(), domainBorder()

public/data/
├── attractors.json                # domains[] + attractors[] (L1/L2/L3)
└── markup.json                    # 8 ситуаций: частоты + демография + аттракторный профиль

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

**Синглтоны** (state вне функции, общий для всех компонентов): `useAppState`, `useAttractorStore`, `useMarkupStore`, `useTheme`, `useVisualSettings`

**Инстанс**: `useNetwork` — создаётся только в `NetworkCanvas.vue`, expose → GraphZone → App.vue

**Stateless**: `useCorrelations`, `usePrediction`, `useAttractorDisplay`

## Цепочка expose (граф → App.vue)

```
NetworkCanvas → defineExpose({...}) → GraphZone → defineExpose({networkRef}) → App.vue
```

## Правая панель — роутинг

```
RightPanel
  ├── DemographicsPanel    # всегда видна
  ├── AttractorDropdowns   # всегда видна
  └── panelState → EmptyPanel | AllSituationsPanel | AttractorPanel | SituationPanel | L3Panel
```

## Корреляции

137 записей в `correlations.ts`. Формат:
```typescript
{ id: 'c01', from: 'l2_rabota_01', to: 'l2_byt_03',
  baseType: 'reinforcing',
  ageRanges: [{ min: 22, max: 75, strength: 0.8, type: 'reinforcing' }] }
```
Возрастная логика: fade на 3-unit границах, floor 0.3×.

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

- CSS: `:root` = dark, `body.light` = light. Только light активна.
- JS THEMES: vis-network не видит CSS → цвета canvas через `themes.ts`
- Layout: `#app` flex-column, `.main-grid` grid 1fr 456px

## Деплой markup.json

Файл → сетевой диск `/app/data/markup.json`. nginx: `/data/` → `/app/data/`.

## Подробности графа

Детали useNetwork, useAppState, подсветки, vis-network → **[CLAUDE-graph.md](./CLAUDE-graph.md)**

## Working Style

- **Читай файл перед редактированием** — не полагайся на память
- **Сразу делай** — без планов/драфтов если не просят
- **Несколько гипотез при дебаге**
- **Интерфейс и данные на русском языке**

## Legacy

`index.old.html`, `js/`, `css/` — vanilla JS версия, не трогать.
