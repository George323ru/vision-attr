import { ref, readonly } from 'vue'
import type { MarkupSituation, MarkupData, RespondentRecord } from '@/types/situation'

const markupSituations = ref<MarkupSituation[]>([])
const respondents = ref<RespondentRecord[]>([])
const loaded = ref(false)

async function loadMarkupData(): Promise<void> {
  if (loaded.value) return
  const resp = await fetch('./data/markup.json')
  const data: MarkupData = await resp.json()
  markupSituations.value = data.situations
  respondents.value = data.respondents
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

function getRespondents(): readonly RespondentRecord[] {
  return respondents.value
}

export function useMarkupStore() {
  return {
    markupSituations: readonly(markupSituations),
    respondents: readonly(respondents),
    loaded: readonly(loaded),
    loadMarkupData,
    getMarkupForSituation,
    getMarkupById,
    getMarkupForAttractor,
    getRespondents,
  }
}
