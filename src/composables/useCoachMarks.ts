import { ref, computed } from 'vue'

const STORAGE_KEY = 'logos-coach-marks'
const WELCOME_KEY = 'logos-welcome-seen'
const TOUR_KEY = 'logos-tour-state'

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

const dismissed = ref(loadDismissed())

// Onboarding is opt-in: new users should not see the welcome flow automatically.
const welcomeSeen = ref(localStorage.getItem(WELCOME_KEY) !== 'false')

const tourActive = ref(false)
const tourStep = ref(0)
const tourFlow = ref<'scenarios' | 'graph' | null>(null)

export function useCoachMarks() {
  function isDismissed(id: string): boolean {
    return dismissed.value.has(id)
  }

  function dismiss(id: string) {
    dismissed.value = new Set([...dismissed.value, id])
    saveDismissed(dismissed.value)
  }

  function resetAll() {
    dismissed.value = new Set()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOUR_KEY)
    welcomeSeen.value = true
    localStorage.setItem(WELCOME_KEY, 'true')
  }

  const allDismissed = computed(() => dismissed.value.size > 0)

  // Welcome modal
  function markWelcomeSeen() {
    welcomeSeen.value = true
    localStorage.setItem(WELCOME_KEY, 'true')
  }

  // Tour management
  function startTour(flow: 'scenarios' | 'graph') {
    tourFlow.value = flow
    tourStep.value = 0
    tourActive.value = true
  }

  function nextStep(totalSteps: number) {
    if (tourStep.value < totalSteps - 1) {
      tourStep.value++
    } else {
      endTour()
    }
  }

  function prevStep() {
    if (tourStep.value > 0) {
      tourStep.value--
    }
  }

  function endTour() {
    tourActive.value = false
    tourStep.value = 0
    tourFlow.value = null
    localStorage.setItem(TOUR_KEY, 'done')
  }

  function isTourDone(): boolean {
    return localStorage.getItem(TOUR_KEY) === 'done'
  }

  return {
    isDismissed,
    dismiss,
    resetAll,
    allDismissed,
    welcomeSeen,
    markWelcomeSeen,
    tourActive,
    tourStep,
    tourFlow,
    startTour,
    nextStep,
    prevStep,
    endTour,
    isTourDone,
  }
}
