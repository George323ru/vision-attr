import type { Prediction, RespondentRecord, MarkupSituation } from '@/types/situation'
import { useMarkupStore } from './useMarkupStore'

const markupStore = useMarkupStore()

export interface DemoFilter {
  ageMin: number
  ageMax: number
  gender: 'male' | 'female' | 'any'
  maritalStatus: string
  childrenCount: string
  education: string
  livingWith: string
  settlementType?: string
  employmentType?: string
  grewInCompleteFamily?: string
  hasSiblings?: string
  hadDivorces?: string
  doesSports?: string
}

const AGE_GROUP_RANGES: Record<string, [number, number]> = {
  '18-25': [18, 25],
  '26-35': [26, 35],
  '36-45': [36, 45],
  '46-55': [46, 55],
  '56+': [56, 200],
}

function ageGroupOverlaps(group: string, min: number, max: number): boolean {
  const range = AGE_GROUP_RANGES[group]
  if (!range) return true
  return range[0] <= max && range[1] >= min
}

function matchesTextFilter(value: string | undefined | null, filter: string | undefined): boolean {
  if (!filter || filter === 'any') return true
  return (value ?? '') === filter
}

export function matchesRespondentDemographics(r: RespondentRecord, f: DemoFilter): boolean {
  if (typeof r.age === 'number') {
    if (r.age < f.ageMin || r.age > f.ageMax) return false
  } else if (r.ageGroup && !ageGroupOverlaps(r.ageGroup, f.ageMin, f.ageMax)) {
    return false
  }
  if (f.gender !== 'any' && r.gender !== f.gender) return false
  if (f.maritalStatus !== 'any' && r.maritalStatus !== f.maritalStatus) return false
  if (f.education !== 'any' && r.education !== f.education) return false
  if (f.livingWith !== 'any' && !(r.livingWith ?? []).includes(f.livingWith)) return false
  if (!matchesTextFilter(r.settlementType, f.settlementType)) return false
  if (!matchesTextFilter(r.employmentType, f.employmentType)) return false
  if (!matchesTextFilter(r.grewInCompleteFamily, f.grewInCompleteFamily)) return false
  if (!matchesTextFilter(r.hasSiblings, f.hasSiblings)) return false
  if (!matchesTextFilter(r.hadDivorces, f.hadDivorces)) return false
  if (!matchesTextFilter(r.doesSports, f.doesSports)) return false
  if (f.childrenCount !== 'any') {
    if (f.childrenCount === 'has_children') {
      if (r.childrenCount <= 0) return false
    } else if (f.childrenCount === '5+') {
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
  const markup: MarkupSituation | null = markupStore.getMarkupForSituation(situationId)
  if (!markup) return []

  const allRespondents = markupStore.getRespondents()
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
    if (!matchesRespondentDemographics(r, filters)) continue

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

  if (filteredCount === 0 || totalWeight === 0) return []

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
