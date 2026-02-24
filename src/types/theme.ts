export type ThemeName = 'light'

export interface EdgeColor {
  color: string
  opacity: number
}

export interface DimColors {
  node: { bg: string; border: string }
  font: string
}

export interface FontHighlight {
  color: string
  stroke: string
}

export interface ThemeColors {
  canvasBg: string
  hierEdge: EdgeColor
  hierEdgeDim: EdgeColor
  fontStroke: string
  fontStrokeL1: string
  l12font: string
  dim: DimColors
  corrReinforcing: EdgeColor
  corrConflicting: EdgeColor
  corrDefault: EdgeColor
  focusFont: FontHighlight
  corrFont: FontHighlight
  legHier: string
}
