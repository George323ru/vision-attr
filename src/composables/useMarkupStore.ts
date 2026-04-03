import { ref, readonly } from 'vue'
import type { MarkupSituation } from '@/types/situation'

const markupSituations = ref<MarkupSituation[]>([])
const loaded = ref(false)

async function loadMarkupData(): Promise<void> {
  if (loaded.value) return
  const resp = await fetch('./data/markup.json')
  markupSituations.value = await resp.json()
  loaded.value = true
}

function getMarkupForSituation(situationId: string): MarkupSituation | null {
  return markupSituations.value.find(m => m.linkedSituationId === situationId) ?? null
}

function getMarkupById(markupId: string): MarkupSituation | null {
  return markupSituations.value.find(m => m.id === markupId) ?? null
}

function getMarkupForAttractor(attractorL2: string): MarkupSituation[] {
  return markupSituations.value.filter(m => m.attractorL2 === attractorL2)
}

export function useMarkupStore() {
  return {
    markupSituations: readonly(markupSituations),
    loaded: readonly(loaded),
    loadMarkupData,
    getMarkupForSituation,
    getMarkupById,
    getMarkupForAttractor,
  }
}
