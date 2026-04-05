import { ref, computed } from 'vue'

const STORAGE_KEY = 'logos-coach-marks'

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
  }

  const allDismissed = computed(() => dismissed.value.size > 0)

  return { isDismissed, dismiss, resetAll, allDismissed }
}
