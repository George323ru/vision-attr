import type { Prediction, RespondentRecord, MarkupSituation } from '@/types/situation'
import { useMarkupStore } from './useMarkupStore'

interface DemoFilter {
  ageMin: number
  ageMax: number
  gender: 'male' | 'female' | 'any'
  maritalStatus: string
  childrenCount: string
}

function matchesFilter(r: RespondentRecord, f: DemoFilter): boolean {
  if (r.age !== null && (r.age < f.ageMin || r.age > f.ageMax)) return false
  if (f.gender !== 'any' && r.gender !== f.gender) return false
  if (f.maritalStatus !== 'any' && r.maritalStatus !== f.maritalStatus) return false
  if (f.childrenCount !== 'any') {
    if (f.childrenCount === '5+') {
      if (r.childrenCount < 5) return false
    } else {
      if (r.childrenCount !== parseInt(f.childrenCount)) return false
    }
  }
  return true
}

function attractorWeight(
  r: RespondentRecord,
  selectedAttractors: (string | null)[],
): number {
  const active = selectedAttractors.filter((id): id is string => id !== null)
  if (active.length === 0) return 1.0
  let sum = 0
  for (const attrId of active) {
    sum += r.attractors[attrId] ?? 0
  }
  const similarity = sum / (3 * active.length)
  return 0.5 + 0.5 * similarity
}

export function predictBehavior(
  situationId: string,
  filters: DemoFilter,
  selectedAttractors: (string | null)[],
): Prediction[] {
  const { getMarkupForSituation, getRespondents } = useMarkupStore()

  const markup: MarkupSituation | null = getMarkupForSituation(situationId)
  if (!markup) return []

  const allRespondents = getRespondents()
  const markupId = markup.id
  const strategyNames = markup.strategyNames

  // Фильтрация и взвешивание
  let totalWeight = 0
  const strategySums = new Array<number>(strategyNames.length).fill(0)
  const strategyCounts = new Array<number>(strategyNames.length).fill(0)
  let filteredCount = 0

  for (const r of allRespondents) {
    const answers = r.strategies[markupId]
    if (!answers) continue
    if (!matchesFilter(r, filters)) continue

    filteredCount++
    const w = attractorWeight(r, selectedAttractors)
    totalWeight += w

    for (let i = 0; i < strategyNames.length && i < answers.length; i++) {
      if (answers[i] === 1) {
        strategySums[i] += w
        strategyCounts[i]++
      }
    }
  }

  if (filteredCount === 0) return []

  const result: Prediction[] = strategyNames.map((name, i) => ({
    name,
    probability: Math.round((strategySums[i] / totalWeight) * 100),
    count: strategyCounts[i],
    totalFiltered: filteredCount,
  }))

  return result.sort((a, b) => b.probability - a.probability)
}

export function usePrediction() {
  return { predictBehavior }
}
