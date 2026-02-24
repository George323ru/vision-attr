import type { DomainMap } from '@/types/domain'
import type { ThemeColors } from '@/types/theme'
import type { VisNodeColor, VisNodeFont } from '@/types/network'
import { domainColor, domainBorder } from './colors'

export function nc(domains: DomainMap, domain: string, lvl: number): VisNodeColor {
  const bg = domainColor(domains, domain, lvl)
  const border = domainBorder(domains, domain, lvl)
  return { background: bg, border, highlight: { background: bg, border } }
}

export function nodeFont(domains: DomainMap, theme: ThemeColors, themeName: string, domain: string, level: number): VisNodeFont {
  const d = domains[domain]
  if (level === 1) {
    return { size: 120, color: theme.l12font, bold: true, strokeWidth: 5, strokeColor: theme.fontStrokeL1 }
  }
  if (level === 2) {
    return { size: 78, color: theme.l12font, bold: false, strokeWidth: 4, strokeColor: theme.fontStrokeL1 }
  }
  // L3 заметно серее L1/L2: светлоту поднимаем до ~40%, насыщенность снижена
  const fontLightness = themeName === 'dark' ? 60 : 40
  const fontSat = d ? Math.max(4, Math.min(16, Math.round(d.sat * 0.15))) : 8
  const hue = d ? d.hue : 0
  return { size: 49, color: `hsl(${hue}, ${fontSat}%, ${fontLightness}%)`, strokeWidth: 3, strokeColor: theme.fontStroke }
}

export function nodeSize(level: number): number {
  if (level === 1) return 335
  if (level === 2) return 140
  return 48
}

export function nodeMass(level: number): number {
  if (level === 1) return 10
  if (level === 2) return 4
  return 1.5
}
