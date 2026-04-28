import { ref, readonly } from 'vue'
import type { Correlation, CorrelationData } from '@/types/correlation'

const correlations = ref<Correlation[]>([])
const maxAbsR = ref(0)
const loaded = ref(false)

async function loadCorrelations(): Promise<void> {
  if (loaded.value) return
  try {
    const resp = await fetch('./data/correlations.json')
    if (!resp.ok) {
      console.error(`Ошибка загрузки correlations.json: ${resp.status} ${resp.statusText}`)
      return
    }
    const data: CorrelationData = await resp.json()
    correlations.value = data.correlations ?? []
    maxAbsR.value = data.maxAbsR ?? 0
    loaded.value = true
  } catch (err) {
    console.error('Не удалось загрузить correlations.json:', err)
  }
}

/** Все L2-id, связанные с заданным nodeId (для подсветки рёбер). */
function getCorrelatedL2Ids(nodeId: string): Set<string> {
  const ids = new Set<string>()
  for (const c of correlations.value) {
    if (c.from === nodeId) ids.add(c.to)
    else if (c.to === nodeId) ids.add(c.from)
  }
  return ids
}

/** Все рёбра, инцидентные nodeId (без какой-либо фильтрации по возрасту). */
function getCorrEdgesForNode(nodeId: string): Correlation[] {
  return correlations.value.filter(c => c.from === nodeId || c.to === nodeId)
}

export function useCorrelationStore() {
  return {
    correlations: readonly(correlations),
    maxAbsR: readonly(maxAbsR),
    loaded: readonly(loaded),
    loadCorrelations,
    getCorrelatedL2Ids,
    getCorrEdgesForNode,
  }
}
