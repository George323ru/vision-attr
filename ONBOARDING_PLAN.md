# План: Переработка онбординга LOGOS v3.0

## 1. Диагноз текущего состояния

| # | Проблема | Где |
|---|----------|-----|
| 1 | Все 3 CoachMark появляются синхронно, перегружая UI | `cm-graph` в `GraphView.vue:6`, `cm-profile` в `ProfileSidebar.vue:10`, `cm-situation` в `SituationGrid.vue:19` |
| 2 | Нет welcome-экрана — пользователь не понимает, что за продукт | `App.vue` |
| 3 | `cm-graph` пересекается с pill «Обзор/Корреляции» (top: 60px, translateX) | `GraphView.vue:57-61` |
| 4 | Нет объяснения ключевых концептов: **аттрактор**, **L1/L2/L3**, **домен**, **корреляция**, **режим Анализ vs Граф**, **pill Обзор/Корреляции**, **слайдер возраста в корреляциях** | везде |
| 5 | Нет подсказок в `SituationDetail` (Прогноз, стратегии, "малая выборка") — help-icon есть, но на него не наводят | `SituationDetail.vue:11-15` |
| 6 | Нет перехода-«моста» между экранами: кнопка «Показать на графе →» не объясняется | `SituationDetail.vue:50-52` |
| 7 | Нет UI-кнопки «?» для повторного запуска — только программный `resetAll()` | `useCoachMarks.ts:30` |
| 8 | CoachMark не подсвечивает таргет (нет spotlight), нет прогресса («1 из 5»), нет кнопки «Пропустить тур» | `CoachMark.vue` |
| 9 | На мобильных (≤768) абсолютно-позиционированные подсказки могут уехать за вьюпорт | `GraphView.vue:129-132` |

## 2. Новая архитектура онбординга (трёхслойная)

### Слой A — Welcome-overlay (при первом заходе)
- Что такое LOGOS (1 абзац): BI-инструмент анализа жизненных аттракторов
- Два режима: **Анализ** (33 ситуации с прогнозами) и **Граф** (иерархия + корреляции)
- Кнопки: **«Начать тур»** / **«Пропустить»**
- Ключ: `logos-welcome-seen`

### Слой B — Пошаговый tour

**Tour в ScenarioView (5 шагов):**
1. Pill в хедере → «Переключение между сценариями и визуальным графом»
2. ProfileSidebar.Демография → «Фильтр респондентов, на которых считается прогноз»
3. ProfileSidebar.Аттракторы → «До 3 аттракторов вашего профиля. Карточки ниже подстраиваются»
4. SituationGrid → «33 ситуации в 6 категориях. Релевантные профилю — наверх»
5. Карточка с badge «АНАЛИЗ» → «Только 8 из 33 размечены — кликните для прогноза»

**Tour в GraphView (5 шагов):**
1. Граф целиком → «Иерархия из 3 уровней: L1 (домены) → L2 → L3»
2. Pill Обзор/Корреляции → «Обзор — структура. Корреляции — связи между L2»
3. Легенда → «Размер = уровень. Цвет рёбер: teal — усиление, красный — конфликт»
4. Любой узел → «Клик = фокус. Двойной клик = раскрыть/свернуть»
5. GraphSidebar → «Панель деталей: breadcrumb, инсайты, корреляции»

### Слой C — Контекстные just-in-time подсказки

| Ключ | Триггер | Текст |
|------|---------|-------|
| `ctx-first-situation-opened` | Первый `OPEN_SITUATION` с данными | Объяснение Prediction-баров |
| `ctx-small-sample` | Первое появление `small-sample-warn` | «Фильтры слишком узкие — расширьте возраст/пол» |
| `ctx-no-markup` | Первый `SituationDetail` без markup | «8 из 33 ситуаций размечены, остальные — в работе» |
| `ctx-correlations-mode` | Первое переключение в `correlations` | «Выберите L2-узел, чтобы увидеть его связи» |
| `ctx-correlation-age` | Первый клик по L2 в `correlations` | «Слайдер меняет возраст — рёбра появляются/ослабевают» |
| `ctx-dblclick-expand` | Первый `CLICK_NODE` по L1/L2 | «Двойной клик раскрывает дочерние уровни» |
| `ctx-show-on-graph` | Первое открытие `SituationDetail` с данными | «Кнопка "Показать на графе →" откроет соответствующий аттрактор» |

---

## 3. Фаза 1 — MVP

- [x] Расширить `useCoachMarks.ts` — добавить `tourActive`, `tourStep`, `startTour()`, `nextStep()`, `prevStep()`, `endTour()`
- [x] Создать `src/components/onboarding/tourSteps.ts` — конфигурация 10 шагов (5 scenarios + 5 graph)
- [x] Создать `src/components/WelcomeModal.vue` — приветствие с «Начать тур» / «Пропустить»
- [x] Создать `src/components/OnboardingTour.vue` — spotlight + карточка + навигация «Назад/Далее/Пропустить» + счётчик
- [x] Создать `src/components/HelpButton.vue` — «?» в AppHeader для перезапуска тура
- [x] Удалить `cm-graph` из `GraphView.vue` (заменяется туром)
- [x] Удалить `cm-profile` из `ProfileSidebar.vue` (заменяется туром)
- [x] Удалить `cm-situation` из `SituationGrid.vue` (заменяется туром)
- [x] Добавить `<WelcomeModal>` и `<OnboardingTour>` в `App.vue`
- [x] Добавить `<HelpButton>` в `AppHeader.vue`

## 4. Фаза 2 — Контекстные подсказки

- [x] `ctx-correlations-mode` — в `GraphView.vue` при первом `SET_GRAPH_MODE → correlations`
- [x] `ctx-correlation-age` — в `CorrelationPanel.vue` при первом фокусе узла
- [x] `ctx-first-situation-opened` — в `SituationDetail.vue` при наличии данных
- [x] `ctx-small-sample` — в `SituationDetail.vue` рядом с `small-sample-warn`
- [x] `ctx-no-markup` — в `SituationDetail.vue` при отсутствии данных
- [ ] `ctx-dblclick-expand` — в `D3Graph.vue` при первом `CLICK_NODE` (отложено — требует рефакторинга эмитов)
- [x] `ctx-show-on-graph` — в `SituationDetail.vue` рядом с кнопкой «Показать на графе»

## 5. Фаза 3 — Полировка

- [ ] Клавиатурная навигация тура: `Esc` — закрыть, `→` / `←` — шаги
- [ ] Spotlight с анимацией (highlight целевого элемента через overlay)
- [ ] Мобильная адаптация (≤768): карточка тура снизу экрана вместо рядом с элементом
- [ ] Разделение тура на 2 трека в меню «?» («Тур: Анализ» / «Тур: Граф»)
- [ ] Skip-confirm: «Точно пропустить? Можно запустить позже через ?»

## 6. Технические заметки

- Tour-карточки рендерить в `<Teleport to="body">` — иначе `overflow: hidden` в `.graph-area` обрежет
- Spotlight: `::before` overlay с `clip-path: polygon(...)` вокруг target `getBoundingClientRect()`
- i18n-задел: тексты в `src/i18n/onboarding.ru.ts`
- Storage keys: `logos-welcome-seen`, `logos-tour-state`, `logos-coach-marks` (существующий)
- Таргет-селекторы: slot-based API (не глобальный CSS-селектор) для стабильности при рефакторе
