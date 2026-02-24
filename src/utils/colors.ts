import type { DomainMap } from '@/types/domain'

export function domainColor(domains: DomainMap, domain: string, lvl: number): string {
  const d = domains[domain]
  if (!d) return '#888'
  const sat = Math.max(12, Math.min(36, Math.round(d.sat * 0.38)))
  const lightness = lvl === 1 ? 81 : lvl === 2 ? 87 : 93
  return `hsl(${d.hue}, ${sat}%, ${lightness}%)`
}

export function domainBorder(domains: DomainMap, domain: string, lvl: number): string {
  const d = domains[domain]
  if (!d) return '#666'
  const sat = Math.max(14, Math.min(40, Math.round(d.sat * 0.45)))
  const lightness = lvl === 1 ? 68 : lvl === 2 ? 75 : 81
  return `hsl(${d.hue}, ${sat}%, ${lightness}%)`
}
