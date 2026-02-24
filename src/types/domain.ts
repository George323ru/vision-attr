export interface Domain {
  name: string
  hue: number
  sat: number
  color: string
}

export type DomainMap = Record<string, Domain>
