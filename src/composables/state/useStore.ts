import { ref, computed } from 'vue'
import type { AppState, Action, Effect } from './types'
import { reduce } from './reducer'
import {
  derivePanelRoute, deriveFocusedNodeId, deriveCorrelationAge,
  deriveStrategyIdx, deriveSituationInfo, deriveMidAge,
  deriveActiveAttractorIds, deriveCanGoBack,
} from './selectors'

const INITIAL_STATE: AppState = {
  viewState: { view: 'scenarios', focus: { type: 'grid' } },
  profile: {
    demographics: {
      ageMin: 30,
      ageMax: 44,
      gender: 'female',
      maritalStatus: 'married',
      childrenCount: '1',
    },
    selectedAttractors: [null, null, null],
    highlightedIdx: null,
  },
  chrome: { profileCollapsed: false },
  navHistory: [],
}

// Singleton state
const state = ref<AppState>(INITIAL_STATE)

// Effect handler — устанавливается GraphView при монтировании
let effectHandler: ((effects: readonly Effect[]) => void) | null = null

export function useStore() {
  function dispatch(action: Action): void {
    const result = reduce(state.value, action)
    state.value = result.state
    if (result.effects.length > 0 && effectHandler) {
      effectHandler(result.effects)
    }
  }

  function setEffectHandler(handler: (effects: readonly Effect[]) => void): void {
    effectHandler = handler
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
  const correlationAge = computed(() => deriveCorrelationAge(state.value.viewState))
  const strategyIdx = computed(() => deriveStrategyIdx(state.value.viewState))
  const situationInfo = computed(() => deriveSituationInfo(state.value.viewState))
  const midAge = computed(() => deriveMidAge(state.value.profile))
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
    correlationAge,
    strategyIdx,
    situationInfo,
    midAge,
    activeAttractorIds,
    canGoBack,
    currentView,
  }
}
