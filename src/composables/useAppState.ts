import { ref, computed } from 'vue'

export type PanelState = 'empty' | 'all-situations' | 'attractor' | 'situation' | 'l3'

const ageMin = ref(30)
const ageMax = ref(44)
const midAge = computed(() => Math.round((ageMin.value + ageMax.value) / 2))
const gender = ref<'male' | 'female' | 'any'>('female')
const childrenCount = ref<string>('1')
const maritalStatus = ref<'married' | 'not_married' | 'divorced' | 'widowed' | 'civil_union' | 'any'>('married')

const correlationsVisible = ref(true)
const expansionMode = ref<'click' | 'allL2' | 'allL3'>('click')
const currentFocus = ref<string | null>(null)
const currentSituation = ref<{ attrId: string; sitId: string } | null>(null)
const currentMode = ref<'graph' | 'situations'>('graph')
const currentStrategy = ref<number | null>(null)
const l3NodeId = ref<string | null>(null)

const rightPanelCollapsed = ref(false)
const selectedAttractors = ref<(string | null)[]>([null, null, null])
const highlightedAttractorIdx = ref<number | null>(null)
const activeSelectedIds = computed(() => {
  const ids = new Set<string>()
  selectedAttractors.value.forEach(id => { if (id) ids.add(id) })
  return ids
})

function clearSelectedAttractors() {
  selectedAttractors.value = [null, null, null]
  highlightedAttractorIdx.value = null
}

function addToSelectedAttractors(id: string) {
  if (activeSelectedIds.value.has(id)) return
  const copy = [...selectedAttractors.value]
  const emptyIdx = copy.findIndex(v => v === null)
  if (emptyIdx >= 0) {
    copy[emptyIdx] = id
  } else {
    copy[copy.length - 1] = id
  }
  selectedAttractors.value = copy
  highlightedAttractorIdx.value = emptyIdx >= 0 ? emptyIdx : copy.length - 1
}

interface NavEntry {
  focus: string | null
  situation: { attrId: string; sitId: string } | null
  l3: string | null
  mode: 'graph' | 'situations'
}

const navHistory = ref<NavEntry[]>([])
const MAX_HISTORY = 10

function pushNavState() {
  const entry: NavEntry = {
    focus: currentFocus.value,
    situation: currentSituation.value ? { ...currentSituation.value } : null,
    l3: l3NodeId.value,
    mode: currentMode.value,
  }
  // Не дублировать если состояние не изменилось
  const last = navHistory.value[navHistory.value.length - 1]
  if (last && last.focus === entry.focus && last.l3 === entry.l3 && last.mode === entry.mode
    && JSON.stringify(last.situation) === JSON.stringify(entry.situation)) return
  navHistory.value = [...navHistory.value.slice(-(MAX_HISTORY - 1)), entry]
}

function popNavState(): NavEntry | null {
  if (navHistory.value.length === 0) return null
  const copy = [...navHistory.value]
  const entry = copy.pop()!
  navHistory.value = copy
  return entry
}

function applyNavEntry(entry: NavEntry) {
  currentFocus.value = entry.focus
  currentSituation.value = entry.situation
  l3NodeId.value = entry.l3
  currentMode.value = entry.mode
  currentStrategy.value = null
}

const canGoBack = computed(() => navHistory.value.length > 0)

const panelState = computed<PanelState>(() => {
  if (currentSituation.value) return 'situation'
  if (l3NodeId.value) return 'l3'
  if (currentMode.value === 'situations') return 'all-situations'
  if (currentFocus.value) return 'attractor'
  return 'empty'
})

function resetState(): void {
  currentFocus.value = null
  currentSituation.value = null
  currentStrategy.value = null
  currentMode.value = 'graph'
  expansionMode.value = 'click'
  l3NodeId.value = null
  clearSelectedAttractors()
}

export function useAppState() {
  return {
    ageMin,
    ageMax,
    midAge,
    gender,
    childrenCount,
    maritalStatus,
    correlationsVisible,
    expansionMode,
    currentFocus,
    currentSituation,
    currentMode,
    currentStrategy,
    l3NodeId,
    selectedAttractors,
    activeSelectedIds,
    highlightedAttractorIdx,
    rightPanelCollapsed,
    clearSelectedAttractors,
    addToSelectedAttractors,
    pushNavState,
    popNavState,
    applyNavEntry,
    canGoBack,
    panelState,
    resetState,
  }
}
