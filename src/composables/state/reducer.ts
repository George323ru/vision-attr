import type { AppState, Action, ReducerResult, ViewState, Effect, ProfileState } from './types'

const MAX_HISTORY = 10

function viewStateEquals(a: ViewState, b: ViewState): boolean {
  if (a.view !== b.view) return false
  if (a.view === 'scenarios' && b.view === 'scenarios') {
    if (a.focus.type !== b.focus.type) return false
    if (a.focus.type === 'detail' && b.focus.type === 'detail') {
      return a.focus.sitId === b.focus.sitId
        && a.focus.attrId === b.focus.attrId
        && a.focus.strategyIdx === b.focus.strategyIdx
    }
    return true
  }
  if (a.view === 'graph' && b.view === 'graph') {
    if (a.focus.type !== b.focus.type) return false
    if (a.focus.type === 'node' && b.focus.type === 'node') {
      return a.focus.nodeId === b.focus.nodeId && a.focus.level === b.focus.level
    }
    if (a.focus.type === 'correlations' && b.focus.type === 'correlations') {
      return a.focus.nodeId === b.focus.nodeId
    }
    return true
  }
  return false
}

function pushNav(history: readonly ViewState[], current: ViewState): readonly ViewState[] {
  const last = history[history.length - 1]
  if (last && viewStateEquals(last, current)) return history
  return [...history.slice(-(MAX_HISTORY - 1)), current]
}

function popNav(history: readonly ViewState[]): { entry: ViewState; rest: readonly ViewState[] } | null {
  if (history.length === 0) return null
  return { entry: history[history.length - 1], rest: history.slice(0, -1) }
}

function updateProfile(state: AppState, patch: Partial<ProfileState>): AppState {
  return { ...state, profile: { ...state.profile, ...patch } }
}

export function reduce(state: AppState, action: Action): ReducerResult {
  switch (action.type) {

    // ── Навигация между экранами ──

    case 'SWITCH_VIEW': {
      if (action.view === state.viewState.view) return { state, effects: [] }
      const newView: ViewState = action.view === 'scenarios'
        ? { view: 'scenarios', focus: { type: 'grid' } }
        : { view: 'graph', focus: { type: 'none' } }
      return {
        state: {
          ...state,
          viewState: newView,
          navHistory: pushNav(state.navHistory, state.viewState),
        },
        effects: [],
      }
    }

    case 'GO_HOME': {
      const effects: Effect[] = state.viewState.view === 'graph' && state.viewState.focus.type !== 'none'
        ? [{ type: 'CLEAR_HIGHLIGHT' }, { type: 'HIDE_CORRELATIONS' }]
        : []

      return {
        state: {
          ...state,
          viewState: { view: 'scenarios', focus: { type: 'grid' } },
          navHistory: [],
        },
        effects,
      }
    }

    case 'GO_BACK': {
      const prev = popNav(state.navHistory)
      if (!prev) return { state, effects: [] }
      return {
        state: { ...state, viewState: prev.entry, navHistory: prev.rest },
        effects: [],
      }
    }

    // ── Scenarios view ──

    case 'OPEN_SITUATION': {
      // Если мы в graph view — переключаемся на scenarios
      const newView: ViewState = {
        view: 'scenarios',
        focus: { type: 'detail', sitId: action.sitId, attrId: action.attrId, strategyIdx: null },
      }
      return {
        state: {
          ...state,
          viewState: newView,
          navHistory: pushNav(state.navHistory, state.viewState),
        },
        effects: [],
      }
    }

    case 'CLOSE_SITUATION': {
      if (state.viewState.view !== 'scenarios') return { state, effects: [] }
      return {
        state: {
          ...state,
          viewState: { view: 'scenarios', focus: { type: 'grid' } },
        },
        effects: [],
      }
    }

    case 'TOGGLE_STRATEGY': {
      if (state.viewState.view !== 'scenarios' || state.viewState.focus.type !== 'detail') {
        return { state, effects: [] }
      }
      const current = state.viewState.focus.strategyIdx
      const newIdx = current === action.index ? null : action.index
      return {
        state: {
          ...state,
          viewState: {
            view: 'scenarios',
            focus: { ...state.viewState.focus, strategyIdx: newIdx },
          },
        },
        effects: [],
      }
    }

    // ── Graph view ──

    case 'CLICK_NODE': {
      if (state.viewState.view !== 'graph') return { state, effects: [] }

      // Для L1 не зумим: single-node focus на крупный узел делает лейбл
      // доминирующим поверх соседних L2. Overview сохраняет контекст.
      const effects: Effect[] = [
        { type: 'HIGHLIGHT_NODE', nodeId: action.nodeId },
        ...(action.level === 1 ? [] : [{ type: 'ZOOM_TO_FIT' as const, nodeIds: [action.nodeId] }]),
      ]

      return {
        state: {
          ...state,
          viewState: {
            ...state.viewState,
            focus: { type: 'node', nodeId: action.nodeId, level: action.level },
          },
          navHistory: pushNav(state.navHistory, state.viewState),
        },
        effects,
      }
    }

    case 'SHOW_NODE_CORRELATIONS': {
      if (state.viewState.view !== 'graph') return { state, effects: [] }
      if (
        state.viewState.focus.type === 'correlations'
        && state.viewState.focus.nodeId === action.nodeId
      ) {
        return {
          state: {
            ...state,
            viewState: {
              ...state.viewState,
              focus: { type: 'node', nodeId: action.nodeId, level: 2 },
            },
          },
          effects: [
            { type: 'HIGHLIGHT_NODE', nodeId: action.nodeId },
            { type: 'HIDE_CORRELATIONS' },
          ],
        }
      }

      const effects: Effect[] = [
        { type: 'HIGHLIGHT_NODE', nodeId: action.nodeId },
        { type: 'ZOOM_TO_FIT', nodeIds: [action.nodeId] },
        { type: 'ANIMATE_EXPAND', parentId: action.nodeId, childIds: [] },
        { type: 'SHOW_CORRELATIONS', nodeId: action.nodeId },
      ]

      return {
        state: {
          ...state,
          viewState: {
            ...state.viewState,
            focus: { type: 'correlations', nodeId: action.nodeId },
          },
          navHistory: pushNav(state.navHistory, state.viewState),
        },
        effects,
      }
    }

    case 'DBLCLICK_NODE': {
      if (state.viewState.view !== 'graph') return { state, effects: [] }
      // Double-click раскрывает/сворачивает дочерние (toggle)
      // Effect executor определит, раскрыт ли узел
      return {
        state,
        effects: [{ type: 'EXPAND_NODE', nodeId: action.nodeId }],
      }
    }

    case 'TOGGLE_GRAPH_NODES': {
      if (state.viewState.view !== 'graph') return { state, effects: [] }
      return {
        state,
        effects: [{
          type: 'TOGGLE_NODES',
          expandNodeIds: action.expandNodeIds,
          collapseNodeIds: action.collapseNodeIds,
        }],
      }
    }

    case 'CLICK_EMPTY': {
      if (state.viewState.view !== 'graph') return { state, effects: [] }
      if (state.viewState.focus.type === 'none') return { state, effects: [] }
      return {
        state: {
          ...state,
          viewState: { ...state.viewState, focus: { type: 'none' } },
        },
        effects: [{ type: 'CLEAR_HIGHLIGHT' }, { type: 'HIDE_CORRELATIONS' }],
      }
    }

    // ── Hover ──

    case 'HOVER_NODE': {
      return {
        state,
        effects: [{ type: 'HOVER_VISUAL', nodeId: action.nodeId }],
      }
    }

    // ── Кросс-навигация ──

    case 'NAVIGATE_TO_GRAPH_NODE': {
      const effects: Effect[] = []
      if (action.parentL1) {
        // ANIMATE_EXPAND гарантированно раскрывает (без toggle)
        effects.push({ type: 'ANIMATE_EXPAND', parentId: action.parentL1, childIds: [] })
      }
      effects.push({ type: 'HIGHLIGHT_NODE', nodeId: action.nodeId })
      effects.push({ type: 'ZOOM_TO_FIT', nodeIds: [action.nodeId] })
      return {
        state: {
          ...state,
          viewState: {
            view: 'graph',
            focus: { type: 'node', nodeId: action.nodeId, level: action.level },
          },
          navHistory: pushNav(state.navHistory, state.viewState),
        },
        effects,
      }
    }

    // ── Профиль ──

    case 'SET_AGE_RANGE': {
      return {
        state: updateProfile(state, {
          demographics: { ...state.profile.demographics, ageMin: action.min, ageMax: action.max },
        }),
        effects: [],
      }
    }

    case 'SET_GENDER': {
      return {
        state: updateProfile(state, {
          demographics: { ...state.profile.demographics, gender: action.value },
        }),
        effects: [],
      }
    }

    case 'SET_MARITAL': {
      return {
        state: updateProfile(state, {
          demographics: { ...state.profile.demographics, maritalStatus: action.value },
        }),
        effects: [],
      }
    }

    case 'SET_CHILDREN': {
      return {
        state: updateProfile(state, {
          demographics: { ...state.profile.demographics, childrenCount: action.value },
        }),
        effects: [],
      }
    }

    case 'SET_ATTRACTOR_SLOT': {
      const slots = [...state.profile.selectedAttractors] as [string | null, string | null, string | null]
      slots[action.slot] = action.id
      return {
        state: updateProfile(state, { selectedAttractors: slots }),
        effects: [],
      }
    }

    case 'ADD_ATTRACTOR': {
      const current = state.profile.selectedAttractors
      // Уже выбран?
      if (current.includes(action.id)) return { state, effects: [] }
      const slots = [...current] as [string | null, string | null, string | null]
      const emptyIdx = slots.findIndex(v => v === null)
      if (emptyIdx >= 0) {
        slots[emptyIdx] = action.id
      } else {
        slots[2] = action.id // перезаписать последний
      }
      const highlightedIdx = emptyIdx >= 0 ? emptyIdx : 2
      return {
        state: updateProfile(state, { selectedAttractors: slots, highlightedIdx }),
        effects: [],
      }
    }

    case 'TOGGLE_HIGHLIGHT': {
      const current = state.profile.highlightedIdx
      return {
        state: updateProfile(state, {
          highlightedIdx: current === action.idx ? null : action.idx,
        }),
        effects: [],
      }
    }

    case 'CLEAR_ATTRACTORS': {
      return {
        state: updateProfile(state, {
          selectedAttractors: [null, null, null],
          highlightedIdx: null,
        }),
        effects: [],
      }
    }

    // ── Chrome ──

    case 'TOGGLE_PROFILE': {
      return {
        state: { ...state, chrome: { ...state.chrome, profileCollapsed: !state.chrome.profileCollapsed } },
        effects: [],
      }
    }

    default: {
      const _exhaustive: never = action
      return { state, effects: [] }
    }
  }
}
