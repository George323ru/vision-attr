export type AttractorLevel = 1 | 2 | 3

export interface Attractor {
  id: string
  label: string
  level: AttractorLevel
  domain: string
  parent?: string
  description?: string
  insights?: string
}
