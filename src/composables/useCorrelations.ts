import type { Correlation, CorrelationAtAge } from '@/types/correlation'
import { CORRELATIONS } from '@/data/correlations'

/** Ширина возрастного «фейда» (в годах) у границы диапазона корреляции. */
const FADE_WIDTH = 3
/** Минимальная доля от базовой strength: даже на границе диапазона не падаем ниже этого множителя. */
const MIN_STRENGTH_FLOOR = 0.3

export function getCorrelationAtAge(corr: Correlation, age: number): CorrelationAtAge | null {
  for (const r of corr.ageRanges) {
    if (age >= r.min && age <= r.max) {
      const fade = Math.min((age - r.min) / FADE_WIDTH, (r.max - age) / FADE_WIDTH, 1)
      return { strength: r.strength * Math.max(fade, MIN_STRENGTH_FLOOR), type: r.type }
    }
  }
  return null
}

export function getCorrelatedL2Ids(nodeId: string, age: number): Set<string> {
  const s = new Set<string>()
  CORRELATIONS.forEach(c => {
    const atAge = getCorrelationAtAge(c, age)
    if (!atAge) return
    if (c.from === nodeId) s.add(c.to)
    if (c.to === nodeId) s.add(c.from)
  })
  return s
}

export function getCorrEdgesForNode(nodeId: string, age: number): Array<{ corrId: string } & CorrelationAtAge> {
  const arr: Array<{ corrId: string } & CorrelationAtAge> = []
  CORRELATIONS.forEach(c => {
    if (c.from === nodeId || c.to === nodeId) {
      const atAge = getCorrelationAtAge(c, age)
      if (atAge) arr.push({ corrId: c.id, ...atAge })
    }
  })
  return arr
}

export function useCorrelations() {
  return { getCorrelationAtAge, getCorrelatedL2Ids, getCorrEdgesForNode }
}
