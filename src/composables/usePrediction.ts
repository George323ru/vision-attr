import type { Prediction } from '@/types/situation'
import { STRATEGIES } from '@/data/strategies'

export function predictBehavior(situationId: string, age: number): Prediction[] {
  const strats = STRATEGIES[situationId]
  if (!strats) return []

  const adjusted = strats.map(s => ({
    name: s.name,
    raw: Math.max(0.01, s.baseProb + s.ageModifier(age)),
  }))

  const total = adjusted.reduce((sum, s) => sum + s.raw, 0)

  // Largest Remainder Method — гарантирует сумму = 100%
  const withFrac = adjusted.map(s => {
    const exact = (s.raw / total) * 100
    return { name: s.name, floored: Math.floor(exact), frac: exact - Math.floor(exact) }
  })
  let remainder = 100 - withFrac.reduce((s, r) => s + r.floored, 0)
  withFrac.sort((a, b) => b.frac - a.frac)
  const result: Prediction[] = withFrac.map(s => ({
    name: s.name,
    probability: s.floored + (remainder-- > 0 ? 1 : 0),
  }))

  return result.sort((a, b) => b.probability - a.probability)
}

export function usePrediction() {
  return { predictBehavior }
}
