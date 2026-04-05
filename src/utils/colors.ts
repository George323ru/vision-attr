import type { DomainMap } from '@/types/domain'

export function domainColor(domains: DomainMap, domain: string, lvl: number): string {
  const d = domains[domain]
  if (!d) return '#888'
  const sat = Math.max(30, Math.min(55, Math.round(d.sat * 0.75)))
  const lightness = lvl === 1 ? 75 : lvl === 2 ? 82 : 89
  return `hsl(${d.hue}, ${sat}%, ${lightness}%)`
}

export function domainBorder(domains: DomainMap, domain: string, lvl: number): string {
  const d = domains[domain]
  if (!d) return '#666'
  const sat = Math.max(35, Math.min(60, Math.round(d.sat * 0.85)))
  const lightness = lvl === 1 ? 62 : lvl === 2 ? 70 : 78
  return `hsl(${d.hue}, ${sat}%, ${lightness}%)`
}
