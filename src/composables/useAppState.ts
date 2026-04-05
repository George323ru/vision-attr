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
const selectedAttractors = ref<(string | null)[]>(['l2_rabota_01', 'l2_semya_04', 'l2_nezav_02'])
const highlightedAttractorIdx = ref<number | null>(0)
const activeSelectedIds = computed(() => {
  const ids = new Set<string>()
  selectedAttractors.value.forEach(id => { if (id) ids.add(id) })
  return ids
})

function clearSelectedAttractors() {
  selectedAttractors.value = [null, null, null]
}

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
    panelState,
    resetState,
  }
}
