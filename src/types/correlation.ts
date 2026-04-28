export type CorrelationType = 'reinforcing' | 'conflicting'

export interface Correlation {
  id: string
  from: string
  to: string
  type: CorrelationType
  /** Оригинальный коэффициент Пирсона (со знаком). */
  r: number
  /** Нормированная сила: |r| / max(|r|), диапазон 0..1. */
  strength: number
}

export interface CorrelationData {
  /** Максимум |r| по выборке (для нормировки). */
  maxAbsR: number
  correlations: Correlation[]
}
