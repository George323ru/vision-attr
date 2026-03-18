import type { Correlation } from './correlation'

export interface VisNodeColor {
  background: string
  border: string
  highlight: { background: string; border: string }
}

export interface VisNodeFont {
  size: number
  color: string
  bold?: boolean
  strokeWidth: number
  strokeColor: string
}

export interface VisNodeData {
  id: string
  label: string
  level: number
  domain: string
  parent?: string
  description: string
  insights: string
  title?: string
  shape: string
  size: number
  mass: number
  color: VisNodeColor
  borderWidth: number
  font: VisNodeFont
  hidden: boolean
}

export interface VisEdgeData {
  id: string
  from: string
  to: string
  type: 'hierarchy' | 'correlation'
  corrData?: Correlation
  color: { color: string; opacity: number }
  width: number
  length?: number
  smooth: { enabled: boolean; type: string; roundness?: number }
  arrows: { to: boolean }
  hidden: boolean
  physics?: boolean
  label?: string
  font?: { size: number; color: string; strokeWidth: number; strokeColor: string }
}

export interface OrigNodeSnapshot {
  color: VisNodeColor
  font: VisNodeFont
  borderWidth: number
  size: number
  hidden: boolean
}

export interface OrigEdgeSnapshot {
  hidden: boolean
  color: { color: string; opacity: number }
  width: number
}

export interface ExpansionSnapshot {
  l1: string[]
  l2: string[]
}
