import type { ThemeColors } from '@/types/theme'
import type { Correlation } from '@/types/correlation'

export const L1_L2_LENGTH = 900
export const L2_L3_LENGTH = 720

export function hierarchyEdge(theme: ThemeColors, childId: string, parentId: string, level: number) {
  const len = level === 2 ? L1_L2_LENGTH : L2_L3_LENGTH
  const w = level === 2 ? 17.5 : 6.0
  return {
    id: `h_${childId}`,
    from: parentId,
    to: childId,
    type: 'hierarchy' as const,
    color: theme.hierEdge,
    width: w,
    length: len,
    smooth: { enabled: true, type: 'continuous' },
    arrows: { to: false },
    hidden: true,
  }
}

export function correlationEdge(theme: ThemeColors, corr: Correlation) {
  return {
    id: corr.id,
    from: corr.from,
    to: corr.to,
    type: 'correlation' as const,
    corrData: corr,
    color: theme.corrDefault,
    width: 7.0,
    smooth: { enabled: true, type: 'curvedCW', roundness: 0.15 },
    arrows: { to: false },
    hidden: false,
    physics: false,
  }
}
