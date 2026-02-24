import { ref, computed } from 'vue'

export type PanelState = 'empty' | 'all-situations' | 'attractor' | 'situation' | 'l3'

const ageMin = ref(18)
const ageMax = ref(75)
const midAge = computed(() => Math.round((ageMin.value + ageMax.value) / 2))
const gender = ref<'male' | 'female' | 'any'>('any')
const childrenCount = ref<string>('any')
const maritalStatus = ref<'married' | 'not_married' | 'divorced' | 'widowed' | 'civil_union' | 'any'>('any')

const correlationsVisible = ref(false)
const expansionMode = ref<'click' | 'allL2' | 'allL3'>('click')
const currentFocus = ref<string | null>(null)
const currentSituation = ref<{ attrId: string; sitId: string } | null>(null)
const currentMode = ref<'graph' | 'situations'>('graph')
const currentStrategy = ref<number | null>(null)
const l3NodeId = ref<string | null>(null)

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
    panelState,
    resetState,
  }
}
