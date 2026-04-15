// ═══════════════════════════════════════════════════════════════
// State Machine Types — ядро оркестрации Vision Attractor
// Discriminated unions делают невалидные состояния невозможными
// ═══════════════════════════════════════════════════════════════

// ── Два экрана ──

export type ViewState =
  | { readonly view: 'scenarios'; readonly focus: ScenarioFocus }
  | { readonly view: 'graph'; readonly focus: GraphFocus; readonly graphMode: GraphMode }

export type ScenarioFocus =
  | { readonly type: 'grid' }
  | {
      readonly type: 'detail'
      readonly sitId: string
      readonly attrId: string
      readonly strategyIdx: number | null
    }

export type GraphFocus =
  | { readonly type: 'none' }
  | { readonly type: 'node'; readonly nodeId: string; readonly level: 1 | 2 | 3 }
  | { readonly type: 'correlations'; readonly nodeId: string; readonly age: number }

export type GraphMode = 'explore' | 'correlations'

// ── Профиль (ортогонален экранам) ──

export interface ProfileState {
  readonly demographics: DemographicsState
  readonly selectedAttractors: readonly [string | null, string | null, string | null]
  readonly highlightedIdx: number | null
}

export interface DemographicsState {
  readonly ageMin: number
  readonly ageMax: number
  readonly gender: 'male' | 'female' | 'any'
  readonly maritalStatus: 'married' | 'not_married' | 'divorced' | 'widowed' | 'civil_union' | 'any'
  readonly childrenCount: string
}

// ── UI Chrome ──

export interface ChromeState {
  readonly profileCollapsed: boolean
}

// ── Полный стейт ──

export interface AppState {
  readonly viewState: ViewState
  readonly profile: ProfileState
  readonly chrome: ChromeState
  readonly navHistory: readonly ViewState[]
}

// ── Panel Route (derived) ──

export type PanelRoute =
  | 'situation-grid'
  | 'situation-detail'
  | 'graph-empty'
  | 'graph-attractor'
  | 'graph-correlations'

// ── Actions ──

export type Action =
  // Навигация между экранами
  | { readonly type: 'SWITCH_VIEW'; readonly view: 'scenarios' | 'graph' }
  | { readonly type: 'GO_BACK' }

  // Scenarios view
  | { readonly type: 'OPEN_SITUATION'; readonly sitId: string; readonly attrId: string }
  | { readonly type: 'CLOSE_SITUATION' }
  | { readonly type: 'TOGGLE_STRATEGY'; readonly index: number }

  // Graph view
  | { readonly type: 'CLICK_NODE'; readonly nodeId: string; readonly level: 1 | 2 | 3 }
  | { readonly type: 'DBLCLICK_NODE'; readonly nodeId: string }
  | { readonly type: 'CLICK_EMPTY' }
  | { readonly type: 'SET_GRAPH_MODE'; readonly mode: GraphMode }
  | { readonly type: 'SET_CORR_AGE'; readonly age: number }

  // Hover (визуальный, без навигации)
  | { readonly type: 'HOVER_NODE'; readonly nodeId: string | null }

  // Кросс-навигация
  | {
      readonly type: 'NAVIGATE_TO_GRAPH_NODE'
      readonly nodeId: string
      readonly level: 1 | 2 | 3
      readonly parentL1: string | null
    }

  // Профиль
  | { readonly type: 'SET_AGE_RANGE'; readonly min: number; readonly max: number }
  | { readonly type: 'SET_GENDER'; readonly value: DemographicsState['gender'] }
  | { readonly type: 'SET_MARITAL'; readonly value: DemographicsState['maritalStatus'] }
  | { readonly type: 'SET_CHILDREN'; readonly value: string }
  | { readonly type: 'SET_ATTRACTOR_SLOT'; readonly slot: number; readonly id: string | null }
  | { readonly type: 'ADD_ATTRACTOR'; readonly id: string }
  | { readonly type: 'TOGGLE_HIGHLIGHT'; readonly idx: number }
  | { readonly type: 'CLEAR_ATTRACTORS' }

  // Chrome
  | { readonly type: 'TOGGLE_PROFILE' }

// ── Effects (команды для графа) ──

export type Effect =
  | { readonly type: 'EXPAND_NODE'; readonly nodeId: string }
  | { readonly type: 'COLLAPSE_NODE'; readonly nodeId: string }
  | { readonly type: 'HIGHLIGHT_NODE'; readonly nodeId: string }
  | { readonly type: 'CLEAR_HIGHLIGHT' }
  | { readonly type: 'SHOW_CORRELATIONS'; readonly nodeId: string; readonly age: number }
  | { readonly type: 'HIDE_CORRELATIONS' }
  | { readonly type: 'ZOOM_TO_FIT'; readonly nodeIds: string[] }
  | { readonly type: 'HOVER_VISUAL'; readonly nodeId: string | null }
  | { readonly type: 'ANIMATE_EXPAND'; readonly parentId: string; readonly childIds: string[] }
  | { readonly type: 'ANIMATE_COLLAPSE'; readonly parentId: string; readonly childIds: string[] }

// ── Reducer Result ──

export interface ReducerResult {
  readonly state: AppState
  readonly effects: readonly Effect[]
}
