export type CorrelationType = 'reinforcing' | 'conflicting'

export interface AgeRange {
  min: number
  max: number
  strength: number
  type: CorrelationType
}

export interface Correlation {
  id: string
  from: string
  to: string
  baseType: CorrelationType
  ageRanges: AgeRange[]
}

export interface CorrelationAtAge {
  strength: number
  type: CorrelationType
}
