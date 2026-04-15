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

/** Светлый центр radial gradient для L1 нод — «блик» */
export function domainGradientCenter(domains: DomainMap, domain: string): string {
  const d = domains[domain]
  if (!d) return '#ccc'
  const sat = Math.max(20, Math.min(40, Math.round(d.sat * 0.5)))
  return `hsl(${d.hue}, ${sat}%, 90%)`
}

/** Приглушённый доменный цвет для шрифта L2 */
export function domainFontColor(domains: DomainMap, domain: string): string {
  const d = domains[domain]
  if (!d) return '#555'
  const sat = Math.max(12, Math.min(30, Math.round(d.sat * 0.4)))
  return `hsl(${d.hue}, ${sat}%, 32%)`
}
