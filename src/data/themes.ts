import type { ThemeName, ThemeColors } from '@/types/theme'

export const THEMES: Record<ThemeName, ThemeColors> = {
  /* dark theme — commented out, not used
  dark: {
    canvasBg: '#0d0d1a',
    hierEdge: { color: '#3a3a5a', opacity: 0.7 },
    hierEdgeDim: { color: '#181830', opacity: 0.15 },
    fontStroke: '#0d0d1a',
    fontStrokeL1: '#000',
    l12font: '#fff',
    dim: {
      node: { bg: '#1a1a2e', border: '#252540' },
      font: '#2a2a45',
    },
    corrReinforcing: { color: '#34d399', opacity: 0.9 },
    corrConflicting: { color: '#f87171', opacity: 0.9 },
    corrDefault: { color: '#c4c4eeff', opacity: 0.75 },
    focusFont: { color: '#0d0d1a', stroke: '#fbbf24' },
    corrFont: { color: '#1a1400', stroke: '#fffde7' },
    legHier: '#3a3a5a',
  },
  */
  light: {
    canvasBg: '#fafafa',
    hierEdge: { color: '#b0b0c0', opacity: 0.95 },
    hierEdgeDim: { color: '#d8d8e0', opacity: 0.15 },
    fontStroke: '#fafafa',
    fontStrokeL1: '#fafafa',
    l12font: '#111',
    dim: {
      node: { bg: '#f0f0f4', border: '#e0e0e8' },
      font: '#c0c0d0',
    },
    corrReinforcing: { color: '#059669', opacity: 0.9 },
    corrConflicting: { color: '#dc2626', opacity: 0.9 },
    corrDefault: { color: '#7070a0', opacity: 0.55 },
    focusFont: { color: '#0d0d1a', stroke: '#fbbf24' },
    corrFont: { color: '#1a1400', stroke: '#fffde7' },
    legHier: '#b0b0c0',
  },
}
