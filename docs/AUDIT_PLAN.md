# LOGOS v3.0 — UI/UX аудит и код-ревью

**Статус:** в работе
**Дата старта:** 2026-04-17
**Подтверждено пользователем:** Да. Язык UI — русский (бренд «LOGOS» остаётся). Мёртвый код удаляется.

## Принятые решения (open questions)

- **Возраст в Correlations:** унифицировать на dual-range (_блокер Фазы 3, требует финального подтверждения_).
- **Нейтральная корреляция в легенде:** удалить (в данных нет).
- **Карточки ситуаций без markup:** блокировать клик + тултип «Данные в обработке».
- **Dropdown демографии:** переиспользовать `SearchableCombobox` (с пропом `searchable={false}`).
- **Обновление CLAUDE.md:** в том же PR/коммите, что и Фаза 1 cleanup.
- **Бренд-термины:** «LOGOS» — остаётся. «Analyse / Graph / Prediction / Situations / respondents / ANALYSE» — переводим.

---

## Executive summary

Проект отрефакторен на state machine (`state/useStore.ts` с discriminated unions) + `ScenarioView`/`GraphView`. В репо остаётся много dead code (legacy композаблы и панели), смешанная локализация (EN-термины в RU UI), несогласованности (native `<select>` vs кастомный combobox; dual-range vs single-range), overflow SVG-лейблов за границу графа, 32 места в `data/attractors.json` с пробелами перед запятыми/точкой.

6 фаз. Общая сложность — Medium. Наибольший риск регресса — Фаза 3.

---

## Фаза 1 — Critical: overflow графа + dead code cleanup (Medium) ✅

- [x] 1.1 **Clamp zoom графа** — `useD3Zoom.ts`: max `k` с `1.5` → `0.8`; padding одиночного узла min 900 (вмещает соседние L2 с лейблами).
- [x] 1.2 **Overflow/clipping канваса** — `D3Graph.vue`: SVG `preserveAspectRatio="xMidYMid meet"` + CSS `.d3-graph { overflow: hidden }` (без этого SVG без viewBox имеет `overflow: visible` и контент выезжает за родителя).
- [x] 1.3 **Удалить legacy композаблы** — `src/composables/useAppState.ts` удалён.
- [x] 1.4 **Удалить legacy компоненты** — `SituationPanel.vue`, `EmptyPanel.vue`, `FocusPanel.vue`, `ActiveNodeIndicator.vue`, `AttractorDropdowns.vue` — все 5 файлов удалены (ни один не импортировался извне).
- [x] 1.5 **Breadcrumb-тавтология** — `AttractorPanel.vue:81-96`: universal dedup смежных crumb'ов с одинаковым label (покрывает L1 «Независимость › Независимость» и любые другие collisions).
- [x] 1.6 **Обновить CLAUDE.md и CLAUDE-graph.md** под актуальную D3-архитектуру (убраны упоминания vis-network, useAppState, NetworkCanvas и пр.).
- [x] 1.7 **Проверка сборки** — `vue-tsc --noEmit` ✓, `npm run build` ✓ (212.98 kB, 1.58s).

## Фаза 2 — i18n (Low) ✅

- [x] 2.1 `AppHeader.vue` — «Analyse»/«Graph» → «Анализ»/«Граф».
- [x] 2.2 `SituationDetail.vue` — «Prediction» → «Прогноз», «N respondents» → плюрализация через `utils/plural.ts` (респондент/респондента/респондентов), small-sample warning → «Малая выборка: результаты могут быть нестабильны», no-data → «Нет респондентов для выбранных фильтров.» + «Попробуйте расширить настройки демографии.» / «Данные по этой ситуации ещё не размечены и находятся в работе.», tooltip переведён, breadcrumb «Situations» → «Ситуации».
- [x] 2.3 `SituationCard.vue` — badge «ANALYSE» → «АНАЛИЗ».
- [x] 2.4 `App.vue` — «Loading data...» → «Загрузка данных…». Grep по остальным вхождениям — только TS-идентификаторы и комментарии, UI чист.
- [x] **Доп:** CLICK_NODE на L1 больше не вызывает ZOOM_TO_FIT — сохраняет overview (визуально лейбл L1 больше не доминирует).

## Фаза 3 — UX consistency (Medium) ✅

- [x] 3.1 **Унификация возраста** (вариант A — dual-range везде, возраст корреляций = midpoint профиля): убран `age: number` из `GraphFocus.correlations`, удалён `SET_CORR_AGE` action, обновлён `deriveCorrelationAge(state)`, `D3Graph.vue` читает `correlationAge` из store, `CorrelationPanel.vue` использует `DualRangeSlider` привязанный к `profile.demographics.ageMin/ageMax` через `SET_AGE_RANGE`.
- [x] 3.2 **Dropdown consistency** — `SearchableCombobox` получил пропы `searchable` и `clearable`. `DemographicsPanel.vue` переписан: 3 `<select>` → 3 `SearchableCombobox` с `:searchable="false"` и `:clearable="false"`, устранён системный синий фон выбранного пункта.
- [x] 3.3 **Primary CTA** — `SituationDetail.vue`: «Показать на графе» теперь primary (accent-fill, shadow, hover-lift), «Назад» — ghost/transparent.
- [x] 3.4 **Truncation fix** — `.cp-node-name`: `-webkit-line-clamp: 2` вместо ellipsis в одну строку.
- [x] 3.5 **Удалить «нейтральную»** — строка убрана из `GraphLegend.vue`.
- [x] 3.6 **Карточки без данных** — `SituationCard.vue`: `disabled`, cursor:not-allowed, opacity 0.55, tooltip «Данные в обработке», бейдж «в обработке» вместо «АНАЛИЗ».

## Фаза 4 — Accessibility (Medium)

- [ ] 4.1 **SearchableCombobox ARIA** — `role="combobox"/listbox/option"`, `aria-expanded`, `aria-controls`, `aria-haspopup`, `aria-activedescendant`. Keyboard open (Enter/Space на trigger). Focus trap + return focus.
- [ ] 4.2 **Help-icon** в `SituationDetail.vue` — `<button>`, `aria-label`, `:focus-visible::after` для tooltip.
- [ ] 4.3 **CollapsibleSection** — `aria-hidden="true"` на chevron.
- [ ] 4.4 **Keyboard nav на узлах графа** — `.graph-node` с `tabindex="0"` + `@keydown.enter/space`.
- [ ] 4.5 **Контрасты** — прогнать светлую тему через axe-core, проверить `--text-muted-soft`, `--text-dim`.

## Фаза 5 — Code quality (Low)

- [ ] 5.1 **usePrediction** — не вызывать `useMarkupStore()` внутри функции, поднять в модульный scope или принять параметром.
- [ ] 5.2 **Reducer equality** — убрать `JSON.stringify`, сравнивать по дискриминанту.
- [ ] 5.3 **Константы в useCorrelations** — `FADE_WIDTH=3`, `MIN_STRENGTH_FLOOR=0.3` с JSDoc.
- [ ] 5.4 **Единая утилита `flatLabel`** в `useAttractorDisplay.ts` — убрать 3+ дубля `.replace(/\n/g, ' ')`.
- [ ] 5.5 **computeLayout memo** — `shallowRef` + кэш по set-of-ids.

## Фаза 6 — Data/текст (Low)

- [ ] 6.1 **Нормализация пробелов** в `scripts/parse_csv.py`: `re.sub(r'\s+([,.;:!?])', r'\1', s)`; collapse double spaces; strip `- ` prefix.
- [ ] 6.2 Перегенерировать `data/attractors.json`.
- [ ] 6.3 Проверить `src/data/situations.ts`, `strategies.ts` — нет ли таких же артефактов.
- [ ] 6.4 Если инсайт многострочный — рендер `<ul>` в `AttractorPanel.vue`.

---

## Риски

- Фаза 1.1 zoom-clamp — ручной регресс на разных ветках (мало/много L3), 1280px и 1024px.
- Фаза 1.3–1.4 — проверить импорты перед удалением; не трогать `index.old.html`, `js/`, `css/` (vanilla-legacy).
- Фаза 3.1 — ломает shape `GraphFocus.correlations`; миграции во всех читателях.
- Фаза 4.1 — Teleport + focus management, тестировать NVDA/клавиатуру.
- Фаза 6.2 — JSON в git изменится, проверить рендер на пустых insights.

## Прогресс

Обновляется по мере выполнения. Отмечать `[x]` для готовых задач.
