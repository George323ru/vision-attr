export interface TourStep {
  id: string
  flow: 'scenarios' | 'graph'
  /** CSS-селектор целевого элемента для spotlight */
  targetSelector: string
  /** Позиция карточки относительно таргета */
  placement: 'top' | 'bottom' | 'left' | 'right'
  title: string
  text: string
}

export const SCENARIOS_STEPS: TourStep[] = [
  {
    id: 'tour-header-nav',
    flow: 'scenarios',
    targetSelector: '.mode-group',
    placement: 'bottom',
    title: 'Два режима работы',
    text: 'Анализ — 100 жизненных ситуаций с предиктивными прогнозами. Граф — визуальная иерархия аттракторов с корреляциями.',
  },
  {
    id: 'tour-demographics',
    flow: 'scenarios',
    targetSelector: '.profile-sidebar .collapsible-section:first-child',
    placement: 'left',
    title: 'Демография',
    text: 'Настройте возраст, пол и семейное положение. Прогнозы пересчитываются только по этой группе респондентов.',
  },
  {
    id: 'tour-attractors',
    flow: 'scenarios',
    targetSelector: '.profile-sidebar .collapsible-section:nth-child(2)',
    placement: 'left',
    title: 'Аттракторы',
    text: 'Выберите до 3 аттракторов — жизненных ценностей. Ситуации, связанные с ними, выходят на первый план в сетке.',
  },
  {
    id: 'tour-situation-grid',
    flow: 'scenarios',
    targetSelector: '.grid-header',
    placement: 'bottom',
    title: 'Жизненные ситуации',
    text: '100 жизненных ситуаций в 6 категориях (экзистенциальные, реляционные, материальные и др.). Первыми идут ситуации с аналитическими данными и релевантные вашему профилю.',
  },
  {
    id: 'tour-analysis-badge',
    flow: 'scenarios',
    targetSelector: '.situation-card.has-data',
    placement: 'right',
    title: 'Карточки с АНАЛИЗ',
    text: 'Значок АНАЛИЗ — по ситуации есть данные. Кликните, чтобы увидеть прогноз стратегий.',
  },
]

export const GRAPH_STEPS: TourStep[] = [
  {
    id: 'tour-graph-canvas',
    flow: 'graph',
    targetSelector: '.graph-area',
    placement: 'bottom',
    title: 'Граф аттракторов',
    text: 'Иерархия трёх уровней: L1 — домены (крупные узлы), L2 — конкретные аттракторы, L3 — детализация. Цвет узла соответствует домену.',
  },
  {
    id: 'tour-graph-mode',
    flow: 'graph',
    targetSelector: '.graph-mode-toggle',
    placement: 'bottom',
    title: 'Обзор и Корреляции',
    text: 'Обзор — иерархическая структура. Корреляции — кликните по любому L2-аттрактору, чтобы увидеть его связи с другими.',
  },
  {
    id: 'tour-legend',
    flow: 'graph',
    targetSelector: '.legend',
    placement: 'right',
    title: 'Обозначения',
    text: 'Размер узла = уровень иерархии. Рёбра: бирюзовый — аттракторы усиливают друг друга, красный — конкурируют.',
  },
  {
    id: 'tour-graph-interaction',
    flow: 'graph',
    targetSelector: '.graph-area svg',
    placement: 'top',
    title: 'Взаимодействие с графом',
    text: 'Клик по узлу — детали в правой панели. Двойной клик — раскрыть или свернуть дочерние уровни. Колесо мыши — масштаб.',
  },
  {
    id: 'tour-graph-sidebar',
    flow: 'graph',
    targetSelector: '.graph-sidebar',
    placement: 'left',
    title: 'Панель деталей',
    text: 'После клика на узел здесь появляются: описание, инсайты, связанные ситуации, дочерние аттракторы. В режиме Корреляции — список связей со слайдером возраста.',
  },
]

export const ALL_STEPS = [...SCENARIOS_STEPS, ...GRAPH_STEPS]
