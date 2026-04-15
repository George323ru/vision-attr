import type { Network, DataSet } from 'vis-network/standalone'
import type { VisNodeData } from '@/types/network'

const BREATHE_AMPLITUDE = 1.8  // px макс. смещение
const BREATHE_SPEED = 0.0006   // скорость колебания

let breatheAnimId: number | null = null
let breatheBasePositions: Record<string, { x: number; y: number }> = {}

export function startBreatheAnimation(network: Network | null, nodes: DataSet<VisNodeData> | null) {
  stopBreatheAnimation()
  const phases: Record<string, { px: number; py: number }> = {}
  for (const id of Object.keys(breatheBasePositions)) {
    phases[id] = { px: Math.random() * Math.PI * 2, py: Math.random() * Math.PI * 2 }
  }

  function animate(time: number) {
    if (!nodes || !network) return
    for (const [id, base] of Object.entries(breatheBasePositions)) {
      const ph = phases[id]
      if (!ph) continue
      // Пропускаем скрытые ноды — moveNode на них бросает ошибку
      const node = nodes.get(id)
      if (!node || node.hidden) continue
      const dx = Math.sin(time * BREATHE_SPEED + ph.px) * BREATHE_AMPLITUDE
      const dy = Math.cos(time * BREATHE_SPEED * 0.7 + ph.py) * BREATHE_AMPLITUDE
      try {
        network!.moveNode(id, base.x + dx, base.y + dy)
      } catch (_) { /* нода может быть удалена из DataSet */ }
    }
    breatheAnimId = requestAnimationFrame(animate)
  }

  breatheAnimId = requestAnimationFrame(animate)
}

export function stopBreatheAnimation() {
  if (breatheAnimId !== null) {
    cancelAnimationFrame(breatheAnimId)
    breatheAnimId = null
  }
}

export function updateBreatheBase(nodeId: string, x: number, y: number) {
  breatheBasePositions[nodeId] = { x, y }
}

export function setBreatheBasePositions(positions: Record<string, { x: number; y: number }>) {
  breatheBasePositions = positions
}

export function getBreatheBasePositions(): Record<string, { x: number; y: number }> {
  return breatheBasePositions
}

export function isBreathRunning(): boolean {
  return breatheAnimId !== null
}

export function refreshBreatheFromNetwork(network: Network | null, nodes: DataSet<VisNodeData> | null) {
  if (!network || !nodes) return
  const positions = network.getPositions()
  const basePositions: Record<string, { x: number; y: number }> = {}
  nodes.forEach((n) => {
    const pos = positions[n.id as string]
    if (pos) {
      basePositions[n.id as string] = { x: pos.x, y: pos.y }
    }
  })
  setBreatheBasePositions(basePositions)
  startBreatheAnimation(network, nodes)
}

export function resetBreatheState() {
  stopBreatheAnimation()
  breatheBasePositions = {}
}
