import { ref, computed } from 'vue'
import type { AppState, Action, Effect } from './types'
import { reduce } from './reducer'
import {
  derivePanelRoute, deriveFocusedNodeId,
  deriveStrategyIdx, deriveSituationInfo,
  deriveActiveAttractorIds, deriveCanGoBack,
} from './selectors'

const INITIAL_STATE: AppState = {
  viewState: { view: 'graph', focus: { type: 'none' }, graphMode: 'correlations' },
  profile: {
    demographics: {
      ageMin: 18,
      ageMax: 75,
      gender: 'any',
      maritalStatus: 'any',
      childrenCount: 'any',
    },
    selectedAttractors: [null, null, null],
    highlightedIdx: null,
  },
  chrome: { profileCollapsed: false },
  navHistory: [],
}

// Singleton state
const state = ref<AppState>(INITIAL_STATE)

// Effect handler — устанавливается D3Graph при монтировании
let effectHandler: ((effects: readonly Effect[]) => void) | null = null
// Буфер эффектов — для кросс-навигации (scenarios→graph), когда D3Graph ещё не смонтирован
let pendingEffects: readonly Effect[] = []

export function useStore() {
  function dispatch(action: Action): void {
    const result = reduce(state.value, action)
    state.value = result.state
    if (result.effects.length > 0) {
      if (effectHandler) {
        effectHandler(result.effects)
      } else {
        pendingEffects = [...pendingEffects, ...result.effects]
      }
    }
  }

  function setEffectHandler(handler: (effects: readonly Effect[]) => void): void {
    effectHandler = handler
    if (pendingEffects.length > 0) {
      handler(pendingEffects)
      pendingEffects = []
    }
  }

  function clearEffectHandler(): void {
    effectHandler = null
  }

  // Computed selectors
  const viewState = computed(() => state.value.viewState)
  const profile = computed(() => state.value.profile)
  const chrome = computed(() => state.value.chrome)
  const panelRoute = computed(() => derivePanelRoute(state.value.viewState))
  const focusedNodeId = computed(() => deriveFocusedNodeId(state.value.viewState))
  const strategyIdx = computed(() => deriveStrategyIdx(state.value.viewState))
  const situationInfo = computed(() => deriveSituationInfo(state.value.viewState))
  const activeAttractorIds = computed(() => deriveActiveAttractorIds(state.value.profile))
  const canGoBack = computed(() => deriveCanGoBack(state.value))
  const currentView = computed(() => state.value.viewState.view)

  return {
    dispatch,
    setEffectHandler,
    clearEffectHandler,

    // State slices
    viewState,
    profile,
    chrome,

    // Derived
    panelRoute,
    focusedNodeId,
    strategyIdx,
    situationInfo,
    activeAttractorIds,
    canGoBack,
    currentView,
  }
}
