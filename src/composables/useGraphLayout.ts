import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3'
import type { Attractor } from '@/types/attractor'
import type { Correlation } from '@/types/correlation'

export interface NodePosition {
  readonly x: number
  readonly y: number
}

export type GraphLayoutMode = 'hierarchy' | 'proximity'

export interface GraphLayoutOptions {
  readonly mode?: GraphLayoutMode
  readonly correlations?: readonly Correlation[]
  readonly proximityFocusNodeId?: string | null
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
  distance: number
  strength: number
}

// ── Memo cache ──
// computeLayout детерминирован по идентификаторам/уровням/parent: пока набор
// аттракторов не меняется, симуляция возвращает те же позиции. Простой кэш
// (один прошлый ключ + результат) исключает повторный 300-tick прогон при
// каждом доступе computed-инвалидаций.
let cacheKey: string | null = null
let cacheValue: Map<string, NodePosition> | null = null

const REINFORCING_INNER_RADIUS = 520
const REINFORCING_OUTER_RADIUS = 1180
const CONFLICTING_INNER_RADIUS = 1180
const CONFLICTING_OUTER_RADIUS = 1780
const PROXIMITY_REFERENCE_STRENGTH = 0.63

function buildCacheKey(
  attractors: readonly Attractor[],
  mode: GraphLayoutMode,
  correlations: readonly Correlation[],
  proximityFocusNodeId: string | null,
): string {
  const parts: string[] = []
  parts.push(`mode:${mode}`)
  parts.push(`focus:${proximityFocusNodeId ?? ''}`)
  for (const a of attractors) {
    parts.push(`${a.id}:${a.level}:${a.parent ?? ''}`)
  }
  if (mode === 'proximity') {
    for (const c of correlations) {
      parts.push(`${c.id}:${c.from}:${c.to}:${c.strength}`)
    }
  }
  return parts.join('|')
}

function applyFocusedProximity(
  attractors: readonly Attractor[],
  positions: Map<string, NodePosition>,
  correlations: readonly Correlation[],
  focusNodeId: string | null,
): Map<string, NodePosition> {
  if (!focusNodeId) return positions

  const byId = new Map(attractors.map(a => [a.id, a]))
  const focus = byId.get(focusNodeId)
  const focusPos = positions.get(focusNodeId)
  if (!focus || focus.level !== 2 || !focusPos) return positions

  const related = correlations
    .filter(c => c.from === focusNodeId || c.to === focusNodeId)
    .map(c => {
      const otherId = c.from === focusNodeId ? c.to : c.from
      const other = byId.get(otherId)
      const otherPos = positions.get(otherId)
      if (!other || other.level !== 2 || !otherPos) return null
      return { corr: c, otherId, otherPos }
    })
    .filter((item): item is { corr: Correlation; otherId: string; otherPos: NodePosition } => item !== null)

  if (related.length === 0) return positions

  const sorted = [...related].sort((a, b) => {
    const angleA = Math.atan2(a.otherPos.y - focusPos.y, a.otherPos.x - focusPos.x)
    const angleB = Math.atan2(b.otherPos.y - focusPos.y, b.otherPos.x - focusPos.x)
    return angleA - angleB || b.corr.strength - a.corr.strength
  })

  const next = new Map<string, NodePosition>()
  for (const [id, pos] of positions) {
    next.set(id, { x: pos.x, y: pos.y })
  }

  const movedL2 = new Map<string, { dx: number; dy: number }>()
  sorted.forEach((item, index) => {
    const baseAngle = Math.atan2(item.otherPos.y - focusPos.y, item.otherPos.x - focusPos.x)
    const angleOffset = ((index % 5) - 2) * 0.18
    const strengthT = Math.max(0, Math.min(1, item.corr.strength / PROXIMITY_REFERENCE_STRENGTH))
    const isConflicting = item.corr.type === 'conflicting'
    const radius = isConflicting
      ? CONFLICTING_INNER_RADIUS + strengthT * (CONFLICTING_OUTER_RADIUS - CONFLICTING_INNER_RADIUS)
      : REINFORCING_OUTER_RADIUS - strengthT * (REINFORCING_OUTER_RADIUS - REINFORCING_INNER_RADIUS)
    const angle = isConflicting ? baseAngle + Math.PI + angleOffset : baseAngle + angleOffset
    const x = focusPos.x + Math.cos(angle) * radius
    const y = focusPos.y + Math.sin(angle) * radius

    next.set(item.otherId, { x, y })
    movedL2.set(item.otherId, {
      dx: x - item.otherPos.x,
      dy: y - item.otherPos.y,
    })
  })

  for (const a of attractors) {
    if (a.level !== 3 || !a.parent) continue
    const delta = movedL2.get(a.parent)
    const pos = positions.get(a.id)
    if (!delta || !pos) continue
    next.set(a.id, { x: pos.x + delta.dx, y: pos.y + delta.dy })
  }

  return next
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
export function computeLayout(
  attractors: readonly Attractor[],
  options: GraphLayoutOptions = {},
): Map<string, NodePosition> {
  const mode = options.mode ?? 'hierarchy'
  const correlations = options.correlations ?? []
  const proximityFocusNodeId = options.proximityFocusNodeId ?? null
  const key = buildCacheKey(attractors, mode, correlations, proximityFocusNodeId)
  if (cacheKey === key && cacheValue !== null) return cacheValue

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
      links.push({
        source: parentId,
        target: a.id,
        distance: L2_RADIUS,
        strength: 0.6,
      })
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
      links.push({
        source: parentId,
        target: a.id,
        distance: L3_RADIUS,
        strength: 0.6,
      })
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
      .distance(link => link.distance)
      .strength(link => link.strength)
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

  const finalPositions = mode === 'proximity'
    ? applyFocusedProximity(attractors, positions, correlations, proximityFocusNodeId)
    : positions

  cacheKey = key
  cacheValue = finalPositions
  return finalPositions
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
