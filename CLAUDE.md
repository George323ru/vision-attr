# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vision Attractor** — BI Predictive Dashboard для анализа жизненных ценностей и поведенческих паттернов. Vue 3 + TypeScript + Vite, визуализация корреляций между жизненными доменами (аттракторами) с учётом возраста пользователя. Граф построен на vis-network.

## Commands

```bash
npm run dev          # dev-сервер → http://localhost:5173
npm run build        # vue-tsc type-check + vite build → dist/
npm run preview      # предпросмотр собранной версии
npx vue-tsc --noEmit # только type-check (без сборки)
```

Регенерация данных из CSV:
```bash
python3 scripts/parse_csv.py   # .data/attractor_dataset.csv → public/data/attractors.json
```

## Architecture

### Composable-паттерн (singleton vs instance)

Composables делятся на три категории:

- **Синглтоны** (`useAppState`, `useAttractorStore`, `useTheme`): state объявлен на уровне модуля (вне функции), все компоненты получают одни и те же ref'ы. Pinia не используется.
- **Инстанс** (`useNetwork`): единственный не-синглтон. Создаётся в `NetworkCanvas.vue`, принимает `Ref<HTMLElement>`. Module-level переменные (`nodes`, `edges`, `ORIG`, `expandedL1/L2`) очищаются в `onBeforeUnmount`.
- **Stateless** (`useCorrelations`, `usePrediction`): чистые функции без локального state, импортируются там, где нужны.

### vis-network интеграция

vis-network управляет собственным canvas — Vue **не трогает** содержимое контейнера. Цепочка expose:
- `NetworkCanvas.vue`: `<div ref>` + `useNetwork(containerRef)` + `defineExpose({ getNetwork })`
- `GraphZone.vue`: оборачивает NetworkCanvas, `defineExpose({ networkRef, setFocusCount })`
- `App.vue`: достаёт через `graphZoneRef.value?.networkRef` и вызывает методы сети

Event flow: `App.vue onMounted` → `loadData()` → `nextTick` → `getNetwork()` → регистрация `onSelectNode`/`onClickEmpty`.

### Двойная тема (CSS + JS)

CSS-переменные в `global.css`: `:root` = dark, `body.light` = light. JS-объект `THEMES` в `useTheme.ts` для canvas-цветов (vis-network не видит CSS-переменные). `watch(currentTheme)` в useTheme синхронизирует `body.classList`, watcher в useNetwork вызывает `rebuildForTheme()`.

### Трёхуровневая иерархия

```
L1 (11 доменов)  → L2 (категории, id: l2_{domain}_{NN})  → L3 (листья, id: l3_{domain}_{NN}_{NNN})
```

Клик L1 → expand/collapse L2. Клик L2 → `applyFocus()` (подсветка корреляций) + expand L3. Клик L3 → L3Panel.

### Панель состояний

`useAppState.panelState` (computed) определяет правую панель. Приоритет:
1. `currentSituation` → `'situation'`
2. `l3NodeId` → `'l3'`
3. `currentMode === 'situations'` → `'all-situations'`
4. `currentFocus` → `'attractor'`
5. иначе → `'empty'`

### Возрастная логика

`getCorrelationAtAge(corr, age)` — fade-эффект (3-unit zone) на границах возрастных диапазонов, floor 0.3×. `predictBehavior()` — Largest Remainder Method для гарантированной суммы 100%.

### Поток взаимодействия

1. Клик по L2-узлу → `applyFocus()` → подсвечивает корреляции, показывает ситуации
2. Клик по карточке ситуации → `SituationPanel` → стратегии с анимированными барами
3. Слайдер возраста (18–75) → `updateCorrelationsForAge()` → обновляет граф и стратегии
4. Клик по пустому месту → если есть `backSnapshot` (сохранённое состояние до focus) → `restoreExpansionState()`, иначе полный сброс

## Data

- `public/data/attractors.json` — fetch при старте (domains[] + attractors[])
- `src/data/correlations.ts` — 63 корреляции между L2 с возрастными диапазонами
- `src/data/situations.ts` — 31 ситуация (привязка к L2 через `attractorL2`)
- `src/data/strategies.ts` — стратегии с `ageModifier: (age) => number`
- `.data/attractor_dataset.csv` — 2944 строки, исходник для attractors.json

## Layout

`#app` div стилизован в `global.css` как `flex column` — это критично, т.к. `App.vue` использует fragment (multiple root elements). Без этого layout ломается.

## Legacy Files

`index.old.html`, `js/`, `css/` — оригинальная vanilla JS версия, сохранена для справки.

## Working Style

- Получив задачу — сразу делай, не показывай драфты, аудиты или планы, если не просят явно. Не объясняй что собираешься делать — просто делай.
- Перед редактированием файла всегда прочитай его текущее состояние. Не полагайся на предположения о содержимом.

## Debugging

- При фиксе бага — сначала проверь реальную причину, прежде чем применять исправление.
- Если первый фикс не сработал — пересмотри гипотезу о причине, а не патчи ту же теорию повторно.
- Рассмотри несколько гипотез перед тем как редактировать код.

## Architecture Awareness

- Когда пользователь описывает архитектуру или поправляет понимание — прими поправку немедленно, не навязывай свою интерпретацию.
- Не хардкодь маппинги, которые должны приходить из данных.
- Если задача затрагивает и фронтенд и бэкенд — уточни скоуп, прежде чем редактировать.

## Deployment

- Не предлагай CI/CD или деплой-пайплайны, не спросив сначала о текущем хостинге.
- Проверь существующие конфиги (docker-compose, Dockerfile, панель хостинга) перед предложением новых решений.

## Types

`src/types/` — единственный источник истины для TypeScript-интерфейсов:
- `attractor.ts` — `Attractor`, `AttractorLevel`
- `correlation.ts` — `Correlation`, `AgeRange`, `CorrelationAtAge`, `CorrelationType`
- `domain.ts` — `Domain`, `DomainMap`
- `network.ts` — `VisNodeData`, `VisEdgeData` и snapshot-типы
- `situation.ts` — `Situation`, `Strategy`, `Prediction`, `StrategiesMap`
- `theme.ts` — `ThemeName`, `ThemeColors`

## Notes

- Интерфейс и данные на **русском языке**
- Физика графа: Barnes-Hut solver (vis-network)
- Правая панель маршрутизируется через `RightPanel.vue`, который рендерит одну из 5 sub-panels из `src/components/panels/`
- Edge-утилиты (`edgeStyles.ts`) используются в `useNetwork.ts` для создания рёбер
- Node-утилиты (`nodeStyles.ts`, `colors.ts`) принимают `DomainMap` и `ThemeColors` как параметры (чистые функции, без глобалов)
