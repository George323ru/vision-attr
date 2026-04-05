import type { Attractor } from '@/types/attractor'

export function computeInitialPositions(attractors: Attractor[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}

  // L1 — равномерно по кругу
  const l1Nodes = attractors.filter(a => a.level === 1)
  const L1_RADIUS = 4000
  l1Nodes.forEach((a, i) => {
    const angle = (2 * Math.PI * i) / l1Nodes.length - Math.PI / 2
    positions[a.id] = { x: Math.cos(angle) * L1_RADIUS, y: Math.sin(angle) * L1_RADIUS }
  })

  // L2 — веером наружу от центра (в секторе домена, не по кругу вокруг L1)
  const L2_RADIUS = 700
  const SECTOR_SPAN = (2 * Math.PI / l1Nodes.length) * 0.6 // 60% сектора домена
  const childrenOfL1: Record<string, Attractor[]> = {}
  attractors.filter(a => a.level === 2 && a.parent).forEach(a => {
    if (!childrenOfL1[a.parent!]) childrenOfL1[a.parent!] = []
    childrenOfL1[a.parent!].push(a)
  })
  for (const [parentId, children] of Object.entries(childrenOfL1)) {
    const parentPos = positions[parentId]
    if (!parentPos) continue
    const domainAngle = Math.atan2(parentPos.y, parentPos.x)
    children.forEach((a, i) => {
      const t = children.length === 1 ? 0 : (i / (children.length - 1) - 0.5)
      const angle = domainAngle + t * SECTOR_SPAN
      positions[a.id] = {
        x: parentPos.x + Math.cos(angle) * L2_RADIUS,
        y: parentPos.y + Math.sin(angle) * L2_RADIUS,
      }
    })
  }

  // L3 — веером наружу от L2 (в направлении от центра)
  const L3_RADIUS = 380
  const L3_MIN_SPAN = 0.5  // минимальный угловой размах (рад)
  const L3_PER_CHILD = 0.18 // доп. размах на каждого ребёнка (рад)
  const childrenOfL2: Record<string, Attractor[]> = {}
  attractors.filter(a => a.level === 3 && a.parent).forEach(a => {
    if (!childrenOfL2[a.parent!]) childrenOfL2[a.parent!] = []
    childrenOfL2[a.parent!].push(a)
  })
  for (const [parentId, children] of Object.entries(childrenOfL2)) {
    const parentPos = positions[parentId]
    if (!parentPos) continue
    const l3Span = Math.min(L3_MIN_SPAN + children.length * L3_PER_CHILD, Math.PI * 0.7)
    children.forEach((a, i) => {
      const l2Angle = Math.atan2(parentPos.y, parentPos.x)
      const t = children.length === 1 ? 0 : (i / (children.length - 1) - 0.5)
      const angle = l2Angle + t * l3Span
      positions[a.id] = {
        x: parentPos.x + Math.cos(angle) * L3_RADIUS,
        y: parentPos.y + Math.sin(angle) * L3_RADIUS,
      }
    })
  }

  return positions
}
