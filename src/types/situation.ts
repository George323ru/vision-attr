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
