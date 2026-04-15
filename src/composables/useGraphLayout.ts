import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3'
import type { Attractor } from '@/types/attractor'

export interface NodePosition {
  readonly x: number
  readonly y: number
}

interface SimNode {
  id: string
  level: 1 | 2 | 3
  parent?: string
  x: number
  y: number
  fx?: number | null  // фиксированная позиция (для L1)
  fy?: number | null
}

interface SimLink {
  source: string
  target: string
}

/**
 * Расчёт позиций нод через d3-force simulation.
 *
 * 1. Геометрический seed: L1 по кругу, L2 веером, L3 веером
 * 2. Force simulation: отталкивание + collision avoidance + link springs
 * 3. L1 зафиксированы (fx/fy), L2/L3 свободно двигаются
 *
 * Simulation запускается синхронно (~300 ticks) и возвращает финальные позиции.
 */
export function computeLayout(attractors: readonly Attractor[]): Map<string, NodePosition> {
  const nodes: SimNode[] = []
  const links: SimLink[] = []

  // ── Шаг 1: геометрический seed ──

  const l1Nodes = attractors.filter(a => a.level === 1)
  const L1_RADIUS = 2000
  const L2_RADIUS = 600
  const L3_RADIUS = 350
  const SECTOR_SPAN = (2 * Math.PI / Math.max(l1Nodes.length, 1)) * 0.75

  // L1 — по кругу, зафиксированы
  l1Nodes.forEach((a, i) => {
    const angle = (2 * Math.PI * i) / l1Nodes.length - Math.PI / 2
    const x = Math.cos(angle) * L1_RADIUS
    const y = Math.sin(angle) * L1_RADIUS
    nodes.push({ id: a.id, level: 1, x, y, fx: x, fy: y })
  })

  // L2 — seed позиции
  const childrenOfL1 = new Map<string, Attractor[]>()
  for (const a of attractors) {
    if (a.level !== 2 || !a.parent) continue
    const list = childrenOfL1.get(a.parent) ?? []
    list.push(a)
    childrenOfL1.set(a.parent, list)
  }

  for (const [parentId, children] of childrenOfL1) {
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) continue
    const domainAngle = Math.atan2(parentNode.y, parentNode.x)

    children.forEach((a, i) => {
      const t = children.length === 1 ? 0 : (i / (children.length - 1) - 0.5)
      const angle = domainAngle + t * SECTOR_SPAN
      nodes.push({
        id: a.id,
        level: 2,
        parent: a.parent,
        x: parentNode.x + Math.cos(angle) * L2_RADIUS,
        y: parentNode.y + Math.sin(angle) * L2_RADIUS,
      })
      links.push({ source: parentId, target: a.id })
    })
  }

  // L3 — seed позиции
  const childrenOfL2 = new Map<string, Attractor[]>()
  for (const a of attractors) {
    if (a.level !== 3 || !a.parent) continue
    const list = childrenOfL2.get(a.parent) ?? []
    list.push(a)
    childrenOfL2.set(a.parent, list)
  }

  for (const [parentId, children] of childrenOfL2) {
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) continue
    const l2Angle = Math.atan2(parentNode.y, parentNode.x)
    const l3Span = Math.min(0.5 + children.length * 0.15, Math.PI * 0.6)

    children.forEach((a, i) => {
      const t = children.length === 1 ? 0 : (i / (children.length - 1) - 0.5)
      const angle = l2Angle + t * l3Span
      nodes.push({
        id: a.id,
        level: 3,
        parent: a.parent,
        x: parentNode.x + Math.cos(angle) * L3_RADIUS,
        y: parentNode.y + Math.sin(angle) * L3_RADIUS,
      })
      links.push({ source: parentId, target: a.id })
    })
  }

  // ── Шаг 2: force simulation ──

  const simulation = forceSimulation(nodes)
    .force('charge', forceManyBody<SimNode>()
      .strength(n => {
        if (n.level === 1) return -800
        if (n.level === 2) return -400
        return -150
      })
    )
    .force('link', forceLink<SimNode, SimLink>(links)
      .id(n => n.id)
      .distance(link => {
        const src = link.source as unknown as SimNode
        const tgt = link.target as unknown as SimNode
        if (src.level === 1 || tgt.level === 1) return L2_RADIUS
        return L3_RADIUS
      })
      .strength(0.6)
    )
    .force('collision', forceCollide<SimNode>()
      .radius(n => collisionRadius(n.level))
      .strength(0.8)
    )
    // Мягкая гравитация к центру — не даёт графу разлететься
    .force('x', forceX<SimNode>(0).strength(0.01))
    .force('y', forceY<SimNode>(0).strength(0.01))
    .stop()

  // Синхронный прогон: 300 ticks достаточно для стабилизации
  for (let i = 0; i < 300; i++) {
    simulation.tick()
  }

  // ── Шаг 3: собрать результат ──

  const positions = new Map<string, NodePosition>()
  for (const node of nodes) {
    positions.set(node.id, { x: node.x, y: node.y })
  }

  return positions
}

/** Радиус collision avoidance (больше визуального, чтобы учесть лейблы) */
function collisionRadius(level: 1 | 2 | 3): number {
  if (level === 1) return 250   // L1 ноды крупные + текст
  if (level === 2) return 120   // L2 + лейбл ~2 строки
  return 50                     // L3 маленькие
}

/** Радиус ноды для SVG отрисовки */
export function nodeRadius(level: 1 | 2 | 3): number {
  if (level === 1) return 120
  if (level === 2) return 50
  return 20
}

/** Размер шрифта для SVG */
export function nodeFontSize(level: 1 | 2 | 3): number {
  if (level === 1) return 64
  if (level === 2) return 28
  return 14
}
