export type CorrelationType = 'reinforcing' | 'conflicting'

export interface Correlation {
  id: string
  from: string
  to: string
  type: CorrelationType
  /** Оригинальный коэффициент Пирсона (со знаком). */
  r: number
  /** Сила корреляции: |r| в шкале коэффициента Пирсона, диапазон 0..1. */
  strength: number
}

export interface CorrelationData {
  /** Максимум |r| по выборке (метаданные для аудита датасета). */
  maxAbsR: number
  correlations: Correlation[]
}
