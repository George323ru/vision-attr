export interface Situation {
  id: string
  attractorL2: string
  title: string
  description: string
}

export interface Prediction {
  name: string
  probability: number
  count: number
  totalFiltered: number
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
  strategyNames: string[]
  strategies: MarkupStrategy[]
  totalRespondents: number
  linkedSituationId?: string
  demographics?: SituationDemographics
  attractorProfile?: Record<string, number>
}

export interface RespondentRecord {
  id: string
  gender: 'male' | 'female'
  ageGroup: string
  maritalStatus: string
  childrenCount: number
  attractors: Record<string, number>
  strategies: Record<string, number[]>
}

export interface MarkupData {
  situations: MarkupSituation[]
  respondents: RespondentRecord[]
}
