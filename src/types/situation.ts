export interface Situation {
  id: string
  attractorL2: string
  title: string
  description: string
}

export interface Strategy {
  name: string
  baseProb: number
  ageModifier: (age: number) => number
}

export type StrategiesMap = Record<string, Strategy[]>

export interface Prediction {
  name: string
  probability: number
}

export interface AgeGroupStats {
  count: number
  frequency: number
}

export interface StrategyDemographics {
  avgAge: number | null
  genderSplit: Record<string, number>
  byAgeGroup: Record<string, AgeGroupStats>
}

export interface SituationDemographics {
  avgAge: number | null
  genderSplit: Record<string, number>
  ageRange: [number, number] | null
}

export interface MarkupStrategy {
  name: string
  frequency: number
  respondents: number
  count: number
  demographics?: StrategyDemographics
  attractorProfile?: Record<string, number>
}

export interface MarkupSituation {
  id: string
  title: string
  attractorL2: string
  strategies: MarkupStrategy[]
  totalRespondents: number
  linkedSituationId?: string
  demographics?: SituationDemographics
  attractorProfile?: Record<string, number>
}
