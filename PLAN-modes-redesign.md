# План: Редизайн режимов дашборда

> Источник: обратная связь от социолога (апрель 2026)
> Дата: 2026-04-15

## Контекст

Социолог указал на несколько проблем:
1. Непонятно зачем для корреляций выбирать соцдем и 3 аттрактора
2. Ситуации сгруппированы по L1-аттракторам, а не по собственной таксономии
3. Заголовок «Предиктивный анализ» вводит в заблуждение
4. Режимы «Корреляции» и «Ситуации» могут быть включены одновременно
5. В режиме «Ситуации» можно кликать по графу (не нужно)
6. В режиме «Корреляции» выбирается до 3 аттракторов (нужен 1)
7. FocusPanel показывает «корреляций: 1», а визуально рёбер больше (путаница с фоновыми рёбрами)

## Архитектурный принцип

**Панель не исчезает — она адаптируется.** Правая панель меняет содержимое под режим (стандартный паттерн BI-дашбордов: master-detail).

---

## Фаза 0: Исправление багов графа ✅ DONE (2026-04-15)

**Цель:** Исправить 4 бага vis-network до начала редизайна режимов.

### Баг 0.4 ✅ Маленькое расстояние между нодами (особенно L3)
- `useNetworkLayout.ts`: `L3_RADIUS` 380→550, `L3_MIN_SPAN` 0.5→0.8, `L3_PER_CHILD` 0.18→0.25
- `useNetwork.ts`: `avoidOverlap` 0.6→0.9, `springLength` 350→450

### Баг 0.1 ✅ Нет индикатора загрузки графа
- `useNetwork.ts`: `graphReady = vueRef(false)`, выставляется в `true` в `network.once('stabilized')`
- `NetworkCanvas.vue`: expose `graphReady`
- `GraphZone.vue`: overlay «Построение графа…» + спиннер с `<Transition name="fade">`

### Баг 0.2 ✅ L1 закрывается при повторном клике
- `App.vue`: `net.toggleL1(nodeId)` → `net.expandL1(nodeId)` при клике на L1

### Баг 0.3 ✅ Пропадает плавная анимация L1-нод со временем
- `useNetworkBreathe.ts`: пропуск скрытых нод в `animate()`, новые функции `refreshBreatheFromNetwork()` и `isBreathRunning()`
- `useNetwork.ts`: вызов `refreshBreatheFromNetwork()` в `rebuildForTheme()` и `restoreExpansionState()`, watchdog каждые 5с

### Баг 0.5 ✅ Граф грузится 5 минут (спиннер «Построение графа…»)

**Проблема:** `graphReady` выставлялся только по событию `stabilized`, которое ждёт пока скорость ВСЕХ нод < `minVelocity`. С 512 нодами (скрытые L2/L3 тоже участвуют в физике), слабыми пружинами (`springConstant: 0.01`) и сильным отталкиванием (`gravitationalConstant: -8000`) стабилизация не наступала.

**Дополнительная проблема:** при начальной стабилизации ноды L2/L3 скрыты (`hidden: true`). Физика работает только на 11 L1-нодах, которые и так зафиксированы. `expandAllL3()` вызывается в `onMounted` ПОСЛЕ стабилизации — ноды появляются на предрассчитанных позициях (из `useNetworkLayout.ts`) без шанса раздвинуться.

**Решение:** гибридный подход (индустриальный стандарт для force-directed графов):
1. `stabilizationIterationsDone` вместо `stabilized` — гарантированно срабатывает после 200 итераций, не ждёт полной стабилизации
2. `graphReady = true` сразу по этому событию — спиннер исчезает мгновенно
3. Физика **продолжает работать** после показа графа — `expandAllL3()` делает L2/L3 видимыми, и физика их раздвигает (видимое «укладывание» нод ~3 сек, стандартное поведение force-directed layout)
4. Через 3 сек — `stopSimulation()`, фиксация всех нод в финальных позициях
5. Через 3.8 сек — запуск breathe-анимации (мягкое покачивание ±1.8px)

**Файлы:**
- `useNetwork.ts`: `stabilizationIterationsDone` + `setTimeout(stopSimulation, 3000)` + breathe с задержкой 800ms после фиксации

---

## Фаза 1: Таксономия ситуаций ✅ DONE (2026-04-15)

**Цель:** Сгруппировать 33 ситуации по 6 категориям из научной таксономии вместо L1-аттракторов.

**Почему первая:** Независима от остальных фаз. Быстрая. Визуально заметна для социолога → ранняя обратная связь.

### Результат
- `src/types/situation.ts`: интерфейс `SituationCategory`, поле `category` в `Situation`
- `src/data/situations.ts`: массив `SITUATION_CATEGORIES` (6 категорий), поле `category` у каждой из 33 ситуаций
- `src/components/panels/AllSituationsPanel.vue`: группировка по категориям с заголовками, внутри — сначала с разметкой, потом без

### Маппинг ситуаций → категории

#### 1. Экзистенциальные события
Затрагивают здоровье, безопасность, физическое и психическое состояние.

| ID | Ситуация | Подкатегория таксономии |
|----|----------|------------------------|
| s03 | Смерть близкого человека | 1.1 Утрата близких |
| s09 | Тревожащие симптомы / ухудшение самочувствия | 1.2 Физическое здоровье |
| s10 | Серьёзный диагноз / длительное лечение | 1.2 Физическое здоровье |
| s20 | Предупреждение врачей о вредных привычках | 1.6 Взаимодействие с мед. системой |
| s28 | Начало депрессии | 1.3 Психическое здоровье |

#### 2. Реляционные события
Изменения в структуре близких отношений: семья, любовь, родительство.

| ID | Ситуация | Подкатегория таксономии |
|----|----------|------------------------|
| s01 | Расставание или развод | 2.2 Распад отношений |
| s02 | Острый конфликт с родственниками | 2.4 Семейные отношения |
| s13 | Неверность партнёра | 2.2 Распад отношений |
| s19 | Рождение ребёнка | 2.3 Родительство |
| s21 | Начало совместной жизни / брак | 2.1 Романтические отношения |
| s30 | Незапланированная беременность | 2.3 Родительство |
| s33 | Поиск романтических отношений | 2.1 Романтические отношения |

#### 3. События жизненной траектории
Изменения в карьере, образовании, профессиональном пути.

| ID | Ситуация | Подкатегория таксономии |
|----|----------|------------------------|
| s04 | Поступление в вуз | 3.2 Высшее образование |
| s05 | Необходимость в новых проф. знаниях | 3.2 Высшее образование |
| s06 | Стресс или перегрузка на работе | 3.4 Рабочая динамика |
| s14 | Серьёзный конфликт с руководством | 3.4 Рабочая динамика |
| s22 | Окончание школы | 3.1 Школьное образование |
| s23 | Увольнение по собственному | 3.3 Карьерная динамика |
| s24 | Сокращение / закрытие компании | 3.3 Карьерная динамика |
| s25 | Невыносимые отношения с коллегами | 3.4 Рабочая динамика |
| s26 | Открытие собственного бизнеса | 3.5 Предпринимательство |
| s32 | Смена места работы | 3.3 Карьерная динамика |

#### 4. События материальной среды
Изменения в жилье, финансах, бытовых условиях.

| ID | Ситуация | Подкатегория таксономии |
|----|----------|------------------------|
| s07 | Потребность в крупной сумме денег | 4.5 Кредиты и долги |
| s11 | Долгосрочное финансовое планирование | 4.3 Финансовое благосостояние |
| s15 | Серьёзные финансовые проблемы / долги | 4.3 Финансовое благосостояние |
| s17 | Покупка или продажа жилья | 4.2 Жильё |
| s27 | Получение крупной суммы денег | 4.3 Финансовое благосостояние |
| s29 | Ремонт жилья | 4.2 Жильё |
| s31 | Переезд в другой город или регион | 4.1 Переезды |

#### 5. События образа жизни
Изменения привычек, досуга, повседневных практик.

| ID | Ситуация | Подкатегория таксономии |
|----|----------|------------------------|
| s12 | Значимые события с домашним животным | 5.5 Домашние животные |
| s18 | Проблемы с дорогой до работы / транспортом | 5.1 Повседневные привычки |

#### 6. Экстремальные события
Редкие негативные события, обусловленные внешними факторами.

| ID | Ситуация | Подкатегория таксономии |
|----|----------|------------------------|
| s08 | Нарушение прав потребителя | 6.5 Взаимодействие с законом |
| s16 | Финансовое мошенничество | 6.4 Мошенничество |

### Спорные маппинги (согласовать с социологом)

- **s06 «Стресс на работе»** → «Жизненная траектория» (3.4) или «Экзистенциальные» (1.3 Психическое здоровье)?
- **s18 «Проблемы с транспортом»** → «Образ жизни» (5.1) или «Материальная среда» (4.1)?
- **s12 «Домашнее животное»** → «Образ жизни» (5.5) или «Реляционные» (натяжка)?

### Шаги реализации

1. Добавить тип `SituationCategory` и данные категорий в `situations.ts`
2. Добавить поле `category` к каждой ситуации
3. В `AllSituationsPanel.vue` — группировать по категориям с заголовками
4. Внутри каждой категории: сначала ситуации с разметкой, потом без

### Файлы для изменения

- `src/types/situation.ts` — тип `SituationCategory`
- `src/data/situations.ts` — данные категорий + поле `category` в каждой ситуации
- `src/components/panels/AllSituationsPanel.vue` — группировка по категориям

---

## Фаза 2: Три взаимоисключающих режима + адаптивная панель ✅ DONE (2026-04-15)

**Цель:** Заменить независимые `correlationsVisible` + `currentMode` на единый `currentMode: 'graph' | 'correlations' | 'situations'`. Правая панель адаптирует содержимое под режим.

### Результат

- **`useAppState.ts`**: `currentMode` расширен до `'graph' | 'correlations' | 'situations'`. `correlationsVisible` из `ref(true)` стал `computed(() => currentMode !== 'situations')` — в useNetwork.ts ничего менять не пришлось, он по-прежнему читает `.value`. Добавлен `correlationFocusId: ref<string | null>(null)` (пока не используется, подготовка к фазе 3). `PanelState` расширен на `'correlations'`; `panelState` computed проверяет correlations-mode первым. `NavEntry.mode` обновлён на `AppMode`. `resetState()` сбрасывает `correlationFocusId`. Отдельные computed-хелперы `isGraphMode`/`isCorrelationsMode`/`isSituationsMode` не понадобились — достаточно прямой проверки `currentMode.value`.
- **`AppHeader.vue`**: Две независимые кнопки-тогглы («Корреляции», «Ситуации») заменены на pill-группу **Граф / Корреляции / Ситуации** (`.mode-group` + `.mode-btn`, стиль как у expansion-group). Единый emit `change-mode` с типом `AppMode` вместо `toggle-correlations` + `toggle-situations`.
- **`App.vue`**: `onToggleSituations()` + `onToggleCorrelations()` заменены единым `onChangeMode(mode)`. При смене режима: pushNavState → восстановление/сохранение snapshot (ситуации) → сброс всех стейтов (focus, situation, strategy, l3, correlationFocusId, selectedAttractors) → установка нового режима → clearFocusVisualsPreserveVisibility → applyHighlight. `onShowAllSituations()` упрощён до внутренней навигации (сброс situation/strategy/l3 внутри режима). Guard в `onSelectNode`: клики игнорируются в режиме `correlations` (фаза 3 добавит логику). Убрано принудительное `currentMode.value = 'graph'` при клике по L1/L2.
- **`RightPanel.vue`**: Секции «Демография» и «Аттракторы человека» обёрнуты в `v-if="currentMode !== 'correlations'"`. `ActiveNodeIndicator` показывается только в graph-режиме. `CorrelationPanel` добавлен первым в Transition-блок панелей. `headerTitle`/`headerDesc` адаптированы: «Корреляции» / «Все ситуации» / «Анализ аттракторов» (заменён вводящий в заблуждение «Предиктивный анализ» — проблема №3 из фидбека).
- **`CorrelationPanel.vue`** (новый): placeholder с SVG-иконкой и подсказкой «Кликните на аттрактор второго уровня на графе, чтобы увидеть его корреляции». Полная реализация (слайдер возраста, список корреляций) — фаза 3.

### Отличия от плана

- Computed-хелперы `isGraphMode`/`isCorrelationsMode`/`isSituationsMode` не добавлены — прямая проверка `currentMode.value === 'correlations'` читабельнее и не требует лишних экспортов.
- Заголовок «Предиктивный анализ» переименован в «Анализ аттракторов» уже в фазе 2 (вместо фазы 5), т.к. это затрагивало тот же `headerTitle` computed.

### Содержимое правой панели по режимам

| Режим | Правая панель | Граф |
|-------|--------------|------|
| **Граф** | Описание кликнутого узла, L3-дети, связанные ситуации | Клик = раскрытие/фокус, все текущие функции |
| **Корреляции** | Таблица корреляций выбранного L2 (имя, тип, сила) + слайдер возраста | Клик по L2 = показать корреляции. Один узел одновременно |
| **Ситуации** | Выбор ситуации → демография → аттракторы → предикция | Без взаимодействия (клики заблокированы) |

### Шаги реализации

1. **useAppState.ts:**
   - Удалить `correlationsVisible: ref(true)`
   - Изменить тип `currentMode`: `'graph' | 'correlations' | 'situations'`
   - Добавить computed `isCorrelationsMode`, `isSituationsMode`, `isGraphMode`
   - Добавить `correlationFocusId: ref<string | null>(null)` — выбранный L2 в режиме корреляций (только один)

2. **AppHeader.vue:**
   - Три кнопки pill-group: «Граф» / «Корреляции» / «Ситуации»
   - Клик на активную кнопку = без действия (или возврат в «Граф»)
   - Удалить отдельную кнопку «Корреляции»

3. **App.vue:**
   - При смене режима: сбрасывать стейт предыдущего режима
   - `onModeChange(mode)`: очистить `currentFocus`, `currentSituation`, `selectedAttractors`, `correlationFocusId`
   - Навигационная история: сохранять `currentMode` в `NavEntry`

4. **RightPanel.vue:**
   - Условный рендер секций по `currentMode`:
     - `graph`: текущее поведение (демография сворачиваема, аттракторы сворачиваемы, EmptyPanel/AttractorPanel/L3Panel)
     - `correlations`: только `CorrelationPanel` (новый компонент)
     - `situations`: демография + аттракторы + ситуации (текущее поведение минус отвлекающие элементы)

### Файлы для изменения

- `src/composables/useAppState.ts`
- `src/components/AppHeader.vue`
- `src/App.vue`
- `src/components/RightPanel.vue`

### Новые файлы

- `src/components/panels/CorrelationPanel.vue` — панель корреляций выбранного L2

---

## Фаза 3: Режим «Корреляции» — полная реализация ✅ DONE (2026-04-15)

**Цель:** В режиме корреляций: клик по L2 = показать его корреляции на графе + детали в панели. Один аттрактор одновременно. Слайдер возраста (влияет через `getCorrelationAtAge`).

### Результат

- **`useAppState.ts`**: добавлен `correlationAge = ref(42)` — возраст для режима корреляций, сбрасывается в `resetState()`
- **`useNetwork.ts`**: новая функция `applyCorrelationFocus(nodeId)` — toggle одиночного фокуса без затрагивания `currentFocus` (graph-mode state); повторный клик снимает фокус через `clearGraphFocus()`
- **`NetworkCanvas.vue`**: `applyCorrelationFocus` добавлен в `defineExpose`
- **`App.vue`**: `onSelectNode` обрабатывает correlations-режим (L2 only → `applyCorrelationFocus`); `onClickEmpty` guard снимает фокус в correlations-режиме; watcher на `correlationAge` → `net.updateCorrelationsForAge(age)` обновляет граф
- **`CorrelationPanel.vue`**: полная реализация — хедер с именем аттрактора + счётчиком связей, слайдер возраста 18–75, список корреляций отсортированных по силе (teal dot = усиление, red dot = конфликт, бар + %)
- **`FocusPanel.vue`**: граф-режим — только имя; корреляции — `Имя — N связей`; ситуации — скрыт
- **`GraphZone.vue`**: `focusVisible`/`focusName` адаптированы под все 3 режима (`correlationFocusId` в correlations-режиме, `currentFocus` в graph-режиме, `false` в situations-режиме)

---

## Фаза 4: Режим «Ситуации» — блокировка кликов ✅ DONE (2026-04-15)

**Цель:** В режиме «Ситуации» клики по графу ничего не делают.

### Результат

- **`App.vue`**: в `onSelectNode` и `onClickEmpty` добавлен guard `if (currentMode.value === 'situations') return` — любые клики по нодам и по пустому месту игнорируются. Клики по графу в situations-режиме были лишними: список ситуаций управляется через правую панель, а не через граф. Блокировка в App.vue (а не в useNetwork.ts) оказалась правильным местом — там же живут все остальные mode-guards для correlations.
- **`RightPanel.vue`**: `headerTitle` при `panelState === 'all-situations'` → «Анализ ситуаций» (вместо «Все ситуации»); `headerDesc` → «Выберите ситуацию для предиктивного анализа». Заголовок «Все ситуации» остался только как визуальный label внутри `AllSituationsPanel`.

### Отличия от плана

- Блокировка реализована в `App.vue`, а не в `useNetwork.ts`: обработчики `onSelectNode`/`onClickEmpty` — callback-и, зарегистрированные в App.vue, там и логичнее ставить guard. В `useNetwork.ts` нет `doubleClick`-обработчика — он не нужен.
- Курсор не меняется на `default` — визуально граф в situations-режиме остаётся интерактивным (pan/zoom работают), блокированы только клики по нодам.

---

## Фаза 5: Полировка ✅ DONE (2026-04-15)

**Цель:** Доводка UX — CoachMark-и, кнопка сброса в корреляциях.

### Результат

- **`GraphZone.vue`**: CoachMark `cm-graph` («Кликните на любой узел для анализа») скрывается вне graph-режима через `v-if="currentMode === 'graph'"`. Добавлен CoachMark `cm-correlations` («Кликните на аттрактор второго уровня, чтобы увидеть его корреляции») — показывается только в correlations-режиме. В situations-режиме подсказки на графе не появляются (клики заблокированы).
- **`CorrelationPanel.vue`**: в хедере выбранного узла появилась кнопка `×` (emit `reset`) — снимает выделение с L2-ноды. Стиль: ghost-кнопка 20×20 с border, hover → accent-цвет.
- **`RightPanel.vue`**: прокидывает emit `reset-correlation` от CorrelationPanel наверх; уточнён текст CoachMark аттракторов — добавлено «(в режиме «Граф»)», чтобы убрать путаницу когда секция видна в situations-режиме.
- **`App.vue`**: обработчик `onResetCorrelation` — вызывает `net.applyCorrelationFocus(correlationFocusId.value)` (toggle = снять фокус) + `setFocusCount(0)`.

### Не реализовано (осознанно)

- **Hover-тултипы на рёбрах**: требуют включения `interaction.hover: true` в vis-network. Это меняет поведение всего графа (hover-стили на нодах), высокий риск регрессии. Отложено.
- **Transition-анимации между режимами**: `panel-fade` transition уже есть внутри режима; cross-mode анимация не добавляет ценности при текущем дизайне.

---

## Итоговая карта изменений

```
Фаза 0 (баги графа):
  src/composables/useNetworkLayout.ts    — L3_RADIUS, L3_MIN_SPAN, L3_PER_CHILD
  src/composables/useNetwork.ts          — avoidOverlap, springLength, toggleL1→expandL1,
                                           graphReady, stabilizationIterationsDone, breathe
  src/composables/useNetworkBreathe.ts   — watchdog, пропуск скрытых нод
  src/components/GraphZone.vue           — overlay «Построение графа…» + Transition
  src/components/NetworkCanvas.vue       — expose graphReady
  src/App.vue                            — expandL1 вместо toggleL1 при клике на L1

Фаза 1 (таксономия):
  src/types/situation.ts                 — интерфейс SituationCategory, поле category
  src/data/situations.ts                 — SITUATION_CATEGORIES + category у 33 ситуаций
  src/components/panels/AllSituationsPanel.vue — группировка по 6 категориям

Фаза 2 (режимы):
  src/composables/useAppState.ts         — currentMode расширен, correlationsVisible → computed,
                                           correlationFocusId, PanelState + 'correlations'
  src/components/AppHeader.vue           — pill-группа Граф/Корреляции/Ситуации
  src/components/RightPanel.vue          — условный рендер секций по режиму, headerTitle/Desc
  src/App.vue                            — onChangeMode, snapshot ситуаций, guard correlations
  src/components/panels/CorrelationPanel.vue  [NEW] — placeholder

Фаза 3 (корреляции):
  src/composables/useAppState.ts         — correlationAge = ref(42)
  src/composables/useNetwork.ts          — applyCorrelationFocus (toggle одиночного фокуса)
  src/components/NetworkCanvas.vue       — expose applyCorrelationFocus
  src/components/FocusPanel.vue          — режим корреляций: «Имя — N связей»
  src/components/GraphZone.vue           — focusVisible/focusName для 3 режимов
  src/components/panels/CorrelationPanel.vue  — полная реализация: слайдер + список
  src/App.vue                            — correlations-guard в onSelectNode/onClickEmpty,
                                           watcher correlationAge

Фаза 4 (ситуации):
  src/App.vue                            — situations-guard в onSelectNode/onClickEmpty
  src/components/RightPanel.vue          — headerTitle/Desc для situations-режима

Фаза 5 (полировка):
  src/components/GraphZone.vue           — cm-graph v-if graph, cm-correlations [NEW]
  src/components/panels/CorrelationPanel.vue  — кнопка × сброса, emit reset
  src/components/RightPanel.vue          — emit reset-correlation, текст CoachMark
  src/App.vue                            — onResetCorrelation
```
