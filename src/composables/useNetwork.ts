import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { Network, DataSet } from 'vis-network/standalone'
import type { Attractor } from '@/types/attractor'
import type { VisNodeData, VisEdgeData, OrigNodeSnapshot, OrigEdgeSnapshot, ExpansionSnapshot } from '@/types/network'
import { CORRELATIONS } from '@/data/correlations'
import { useAttractorStore } from './useAttractorStore'
import { useTheme } from './useTheme'
import { useAppState } from './useAppState'
import { getCorrelatedL2Ids, getCorrEdgesForNode } from './useCorrelations'
import { nc, nodeFont, nodeMass } from '@/utils/nodeStyles'
import { hierarchyEdge, correlationEdge } from '@/utils/edgeStyles'
import { useVisualSettings } from './useVisualSettings'

const expandedL1 = new Set<string>()
const expandedL2 = new Set<string>()
let isDragging = false
let dragStartPointer: { x: number; y: number } | null = null
const DRAG_THRESHOLD = 10 // px — если сдвиг указателя мыши меньше, считаем кликом
let graphFocus: string | null = null // визуальный фокус на графе (отдельно от panelState)
const graphFocusSet = new Set<string>() // мульти-фокус: набор всех выделенных L2-нод

let network: Network | null = null
let nodes: DataSet<VisNodeData> | null = null
let edges: DataSet<VisEdgeData> | null = null
let ORIG: Record<string, OrigNodeSnapshot> = {}
let ORIG_EDGE: Record<string, OrigEdgeSnapshot> = {}

function buildNodesData() {
  const { domains, attractors } = useAttractorStore()
  const { T, currentTheme } = useTheme()
  const { nodeSizeL1, nodeSizeL2, nodeSizeL3, fontSizeL1, fontSizeL2, fontSizeL3 } = useVisualSettings()
  return attractors.value.map((a: Attractor) => {
    const sz = a.level === 1 ? nodeSizeL1.value : a.level === 2 ? nodeSizeL2.value : nodeSizeL3.value
    const baseFont = nodeFont(domains.value, T.value, currentTheme.value, a.domain, a.level)
    const fs = a.level === 1 ? fontSizeL1.value : a.level === 2 ? fontSizeL2.value : fontSizeL3.value
    return {
      id: a.id,
      label: a.label,
      level: a.level,
      domain: a.domain,
      parent: a.parent,
      description: a.description || '',
      insights: a.insights || '',
      title: a.description || a.label,
      shape: 'dot',
      size: sz,
      mass: nodeMass(a.level),
      color: nc(domains.value, a.domain, a.level),
      borderWidth: a.level === 1 ? 2 : 1,
      font: { ...baseFont, size: fs },
      hidden: a.level !== 1,
    }
  })
}

function storeOrigNodes() {
  ORIG = {}
  if (!nodes) return
  nodes.forEach((n) => {
    ORIG[n.id] = {
      color: JSON.parse(JSON.stringify(n.color)),
      font: JSON.parse(JSON.stringify(n.font)),
      borderWidth: n.borderWidth,
      size: n.size,
      hidden: n.hidden,
    }
  })
}

function buildEdgesData() {
  const { attractors } = useAttractorStore()
  const { T } = useTheme()
  const { hierEdgeColor, hierEdgeOpacity, hierWidthL12, hierWidthL23, corrDefaultColor, corrDefaultOpacity, corrDefaultWidth } = useVisualSettings()
  const edgesArr: VisEdgeData[] = []

  // Override theme hierarchy color with settings values
  const themeWithSettings = {
    ...T.value,
    hierEdge: { color: hierEdgeColor.value, opacity: hierEdgeOpacity.value },
    corrDefault: { color: corrDefaultColor.value, opacity: corrDefaultOpacity.value },
  }

  attractors.value.forEach((a: Attractor) => {
    if (a.parent) {
      const edge = hierarchyEdge(themeWithSettings, a.id, a.parent, a.level)
      // Override width from settings
      edge.width = a.level === 2 ? hierWidthL12.value : hierWidthL23.value
      edgesArr.push(edge)
    }
  })

  CORRELATIONS.forEach(c => {
    const edge = correlationEdge(themeWithSettings, c)
    edge.width = corrDefaultWidth.value
    edgesArr.push(edge)
  })

  return edgesArr
}

function storeOrigEdges() {
  ORIG_EDGE = {}
  if (!edges) return
  edges.forEach((e) => {
    ORIG_EDGE[e.id] = {
      hidden: e.hidden,
      color: JSON.parse(JSON.stringify(e.color)),
      width: e.width,
    }
  })
}

// ── EXPAND / COLLAPSE ───────────────────────────────────────

function updateVisibleCorrelations() {
  if (!nodes || !edges) return
  const { correlationsVisible } = useAppState()
  const { T } = useTheme()

  if (!correlationsVisible.value) {
    hideAllCorrelations()
    return
  }

  const visibleL2 = new Set<string>()
  nodes.forEach((n) => {
    if (!n.hidden && n.level === 2) visibleL2.add(n.id as string)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    if (e.type !== 'correlation') return
    const bothVisible = visibleL2.has(e.from as string) && visibleL2.has(e.to as string)
    eu.push({
      id: e.id,
      hidden: !bothVisible,
      color: ORIG_EDGE[e.id]?.color ?? T.value.corrDefault,
      width: ORIG_EDGE[e.id]?.width ?? 7,
    })
  })
  if (eu.length) edges.update(eu)
}

function hideAllCorrelations() {
  if (!edges) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    if (e.type === 'correlation') eu.push({ id: e.id, hidden: true })
  })
  if (eu.length) edges.update(eu)
}

function expandL1(nodeId: string) {
  if (expandedL1.has(nodeId) || !nodes || !edges) return
  expandedL1.add(nodeId)
  const { getChildren } = useAttractorStore()
  const children = getChildren(nodeId)
  if (!children.length) return
  nodes.update(children.map(id => ({ id, hidden: false })))
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: false })))
  updateVisibleCorrelations()
}

function collapseL2(nodeId: string) {
  if (!expandedL2.has(nodeId) || !nodes || !edges) return
  expandedL2.delete(nodeId)
  const { getChildren } = useAttractorStore()
  const children = getChildren(nodeId)
  nodes.update(children.map(id => ({ id, hidden: true })))
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: true })))
}

function collapseL1(nodeId: string) {
  if (!expandedL1.has(nodeId) || !nodes || !edges) return
  expandedL1.delete(nodeId)
  const { getChildren } = useAttractorStore()
  const children = getChildren(nodeId)
  if (!children.length) return
  children.forEach(collapseL2)
  nodes.update(children.map(id => ({ id, hidden: true })))
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: true })))
  updateVisibleCorrelations()
}

function toggleL1(nodeId: string) {
  if (expandedL1.has(nodeId)) collapseL1(nodeId)
  else expandL1(nodeId)
}

function expandL2(nodeId: string) {
  if (expandedL2.has(nodeId) || !nodes || !edges) return
  expandedL2.add(nodeId)
  const { getChildren } = useAttractorStore()
  const children = getChildren(nodeId)
  if (!children.length) return
  nodes.update(children.map(id => ({ id, hidden: false })))
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: false })))
}

function toggleL2(nodeId: string) {
  if (expandedL2.has(nodeId)) collapseL2(nodeId)
  else expandL2(nodeId)
}

function collapseAllL2() {
  Array.from(expandedL1).forEach(collapseL1)
}

function expandAllL2() {
  if (!nodes) return
  const { attractors } = useAttractorStore()
  attractors.value.forEach((a: Attractor) => {
    if (a.level === 1) expandL1(a.id)
  })
}

function expandAllL3() {
  expandAllL2()
  if (!nodes) return
  const { attractors } = useAttractorStore()
  attractors.value.forEach((a: Attractor) => {
    if (a.level === 2) expandL2(a.id)
  })
}

function resetExpansionState() {
  expandedL1.clear()
  expandedL2.clear()
}

function snapshotExpansionState(): ExpansionSnapshot {
  return { l1: Array.from(expandedL1), l2: Array.from(expandedL2) }
}

function restoreExpansionState(snapshot: ExpansionSnapshot) {
  if (!snapshot || !nodes || !edges) return
  const { attractors } = useAttractorStore()

  resetExpansionState()

  nodes.update(
    attractors.value.filter(a => a.level !== 1).map(a => ({ id: a.id, hidden: true }))
  )
  edges.update(
    attractors.value.filter(a => a.parent).map(a => ({ id: `h_${a.id}`, hidden: true }))
  )

  snapshot.l1.forEach(expandL1)
  snapshot.l2.forEach(expandL2)
}

// ── FOCUS / DIM ─────────────────────────────────────────────

function DIM_NODE() {
  const { T } = useTheme()
  const d = T.value.dim
  return {
    color: { background: d.node.bg, border: d.node.border, highlight: { background: d.node.bg, border: d.node.border } },
    font: { color: d.font, strokeWidth: 0 },
    borderWidth: 1,
  }
}

function FOCUS_NODE(origSize: number) {
  const { T } = useTheme()
  return {
    color: { background: '#ffffff', border: '#fbbf24', highlight: { background: '#fffde7', border: '#f59e0b' } },
    font: { color: T.value.focusFont.color, strokeWidth: 3, strokeColor: T.value.focusFont.stroke, size: 14 },
    borderWidth: 5,
    size: Math.max(origSize, 28),
  }
}

function CORR_NODE() {
  const { T } = useTheme()
  return {
    color: { background: '#fffde7', border: '#fbbf24', highlight: { background: '#fff9c4', border: '#f59e0b' } },
    font: { color: T.value.corrFont.color, strokeWidth: 2, strokeColor: T.value.corrFont.stroke },
    borderWidth: 3,
  }
}

// ── МУЛЬТИ-ФОКУС (без димминга) ─────────────────────────────

function applyMultiFocusVisuals() {
  if (!nodes || !edges) return
  const { midAge } = useAppState()
  const { corrReinforcingColor, corrConflictingColor } = useVisualSettings()

  // Собираем все связанные ноды и рёбра со всех узлов в фокусе
  const allCorrelated = new Set<string>()
  const allCorrEdgeMap = new Map<string, { type: string; strength: number }>()

  for (const nodeId of graphFocusSet) {
    getCorrelatedL2Ids(nodeId, midAge.value).forEach(id => allCorrelated.add(id))
    getCorrEdgesForNode(nodeId, midAge.value).forEach(ce => {
      if (!allCorrEdgeMap.has(ce.corrId)) {
        allCorrEdgeMap.set(ce.corrId, { type: ce.type, strength: ce.strength })
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nu: any[] = []
  nodes.forEach((n) => {
    if (n.hidden) return
    const nid = n.id as string
    if (graphFocusSet.has(nid)) {
      nu.push({ id: nid, ...FOCUS_NODE(ORIG[nid].size) })
    } else if (allCorrelated.has(nid)) {
      nu.push({ id: nid, ...CORR_NODE() })
    } else {
      // Без димминга — возвращаем оригинальный цвет
      nu.push({ id: nid, color: ORIG[nid].color, font: ORIG[nid].font, borderWidth: ORIG[nid].borderWidth, size: ORIG[nid].size })
    }
  })
  nodes.update(nu)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    if (e.type === 'hierarchy') {
      eu.push({ id: e.id, color: ORIG_EDGE[e.id].color, width: ORIG_EDGE[e.id].width })
    } else if (e.type === 'correlation') {
      const corrInfo = allCorrEdgeMap.get(e.id as string)
      if (corrInfo) {
        const corrColor = corrInfo.type === 'reinforcing'
          ? { color: corrReinforcingColor.value, opacity: 0.9 }
          : { color: corrConflictingColor.value, opacity: 0.9 }
        eu.push({ id: e.id, hidden: false, color: corrColor, width: 1 + corrInfo.strength * 4 })
      } else {
        eu.push({ id: e.id, color: ORIG_EDGE[e.id].color, width: ORIG_EDGE[e.id].width })
      }
    }
  })
  edges.update(eu)

  return { correlated: allCorrelated.size }
}

function applyFocus(nodeId: string) {
  if (!nodes || !edges) return
  const { currentFocus } = useAppState()

  graphFocus = nodeId
  currentFocus.value = nodeId
  graphFocusSet.clear()
  graphFocusSet.add(nodeId)

  return applyMultiFocusVisuals()
}

function addFocusNode(nodeId: string) {
  if (!nodes || !edges) return
  graphFocus = nodeId

  // Toggle: повторный клик снимает выделение
  if (graphFocusSet.has(nodeId)) {
    graphFocusSet.delete(nodeId)
  } else {
    graphFocusSet.add(nodeId)
  }

  if (graphFocusSet.size === 0) {
    clearGraphFocus()
    return { correlated: 0 }
  }

  return applyMultiFocusVisuals()
}

function resetGraphVisuals() {
  if (!nodes || !edges) return
  const { currentFocus, currentSituation, currentStrategy } = useAppState()
  currentFocus.value = null
  currentSituation.value = null
  currentStrategy.value = null
  graphFocus = null
  graphFocusSet.clear()
  resetExpansionState()

  nodes.update(nodes.map((n) => ({
    id: n.id,
    color: ORIG[n.id].color,
    font: ORIG[n.id].font,
    borderWidth: ORIG[n.id].borderWidth,
    size: ORIG[n.id].size,
    hidden: ORIG[n.id].hidden,
  })))

  edges.update(edges.map((e) => ({
    id: e.id,
    hidden: ORIG_EDGE[e.id].hidden,
    color: ORIG_EDGE[e.id].color,
    width: ORIG_EDGE[e.id].width,
  })))
}

function clearFocusVisualsPreserveVisibility() {
  if (!nodes || !edges) return
  const { currentFocus, currentSituation, currentStrategy, correlationsVisible } = useAppState()
  currentFocus.value = null
  currentSituation.value = null
  currentStrategy.value = null
  graphFocus = null
  graphFocusSet.clear()

  nodes.update(nodes.map((n) => ({
    id: n.id,
    color: ORIG[n.id].color,
    font: ORIG[n.id].font,
    borderWidth: ORIG[n.id].borderWidth,
    size: ORIG[n.id].size,
  })))

  // Восстановить стили edges (не трогая hidden для hierarchy)
  edges.update(edges.map((e) => ({
    id: e.id,
    color: ORIG_EDGE[e.id].color,
    width: ORIG_EDGE[e.id].width,
  })))

  // Привести корреляции в правильное состояние
  if (correlationsVisible.value) {
    updateVisibleCorrelations()
  } else {
    hideAllCorrelations()
  }
}

// Сбросить только визуальный фокус графа, не трогая state панели
function clearGraphFocus() {
  if (!nodes || !edges) return
  const { correlationsVisible } = useAppState()
  graphFocus = null
  graphFocusSet.clear()

  nodes.update(nodes.map((n) => ({
    id: n.id,
    color: ORIG[n.id].color,
    font: ORIG[n.id].font,
    borderWidth: ORIG[n.id].borderWidth,
    size: ORIG[n.id].size,
  })))

  edges.update(edges.map((e) => ({
    id: e.id,
    color: ORIG_EDGE[e.id].color,
    width: ORIG_EDGE[e.id].width,
  })))

  if (correlationsVisible.value) {
    updateVisibleCorrelations()
  } else {
    hideAllCorrelations()
  }
}

function updateCorrelationsForAge(age: number) {
  if (!nodes || !edges) return
  if (graphFocusSet.size === 0) return

  const allCorrelated = new Set<string>()
  const allCorrEdgeMap = new Map<string, { type: string; strength: number }>()

  for (const nodeId of graphFocusSet) {
    getCorrelatedL2Ids(nodeId, age).forEach(id => allCorrelated.add(id))
    getCorrEdgesForNode(nodeId, age).forEach(ce => {
      if (!allCorrEdgeMap.has(ce.corrId)) {
        allCorrEdgeMap.set(ce.corrId, { type: ce.type, strength: ce.strength })
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nu: any[] = []
  nodes.forEach((n) => {
    if (n.hidden) return
    const nid = n.id as string
    if (graphFocusSet.has(nid)) return
    if (allCorrelated.has(nid)) {
      nu.push({ id: nid, ...CORR_NODE() })
    } else if (ORIG[nid]) {
      nu.push({ id: nid, color: ORIG[nid].color, font: ORIG[nid].font, borderWidth: ORIG[nid].borderWidth, size: ORIG[nid].size })
    }
  })
  nodes.update(nu)

  const { corrReinforcingColor: rColor, corrConflictingColor: cColor } = useVisualSettings()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    if (e.type !== 'correlation') return
    const corrInfo = allCorrEdgeMap.get(e.id as string)
    if (corrInfo) {
      const corrColor = corrInfo.type === 'reinforcing'
        ? { color: rColor.value, opacity: 0.9 }
        : { color: cColor.value, opacity: 0.9 }
      eu.push({ id: e.id, hidden: false, color: corrColor, width: 1 + corrInfo.strength * 4 })
    } else {
      eu.push({ id: e.id, color: ORIG_EDGE[e.id].color, width: ORIG_EDGE[e.id].width })
    }
  })
  edges.update(eu)

  return allCorrelated.size
}

function rebuildForTheme() {
  if (!nodes || !edges) return

  const snap = snapshotExpansionState()
  resetExpansionState()
  const nodesData = buildNodesData()
  const edgesData = buildEdgesData()

  // Update ORIG from new data
  ORIG = {}
  nodesData.forEach((n) => {
    ORIG[n.id] = {
      color: JSON.parse(JSON.stringify(n.color)),
      font: JSON.parse(JSON.stringify(n.font)),
      borderWidth: n.borderWidth,
      size: n.size,
      hidden: n.hidden,
    }
  })
  ORIG_EDGE = {}
  edgesData.forEach((e) => {
    ORIG_EDGE[e.id] = {
      hidden: e.hidden,
      color: JSON.parse(JSON.stringify(e.color)),
      width: e.width,
    }
  })

  if (graphFocusSet.size > 0) {
    const savedSet = new Set(graphFocusSet)
    nodes.update(nodes.map((n) => ({
      id: n.id,
      color: ORIG[n.id].color,
      font: ORIG[n.id].font,
      borderWidth: ORIG[n.id].borderWidth,
      size: ORIG[n.id].size,
      hidden: ORIG[n.id].hidden,
    })))
    edges.update(edges.map((e) => ({
      id: e.id,
      hidden: ORIG_EDGE[e.id].hidden,
      color: ORIG_EDGE[e.id].color,
      width: ORIG_EDGE[e.id].width,
    })))
    graphFocusSet.clear()
    savedSet.forEach(id => graphFocusSet.add(id))
    applyMultiFocusVisuals()
  } else {
    nodes.update(nodesData.map((n) => ({ ...n })))
    edges.update(edgesData.map((e) => ({ ...e })))
  }

  if (snap.l1.length || snap.l2.length) {
    restoreExpansionState(snap)
  }
}

function getNodeData(nodeId: string) {
  return nodes?.get(nodeId)
}

function unselectAll() {
  network?.unselectAll()
}

// ── INIT ────────────────────────────────────────────────────

export function useNetwork(containerRef: Ref<HTMLElement | null>) {
  const { currentTheme } = useTheme()

  function init() {
    if (!containerRef.value) return

    const nodesData = buildNodesData()
    const edgesData = buildEdgesData()

    nodes = new DataSet(nodesData)
    edges = new DataSet(edgesData)

    storeOrigNodes()
    storeOrigEdges()

    const options = {
      layout: { randomSeed: 42 },
      physics: {
        enabled: true,
        solver: 'barnesHut' as const,
        barnesHut: {
          gravitationalConstant: -5000,
          centralGravity: 0.2,
          springLength: 80,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.3,
        },
        stabilization: { enabled: true, iterations: 1500, fit: true },
        maxVelocity: 30,
        minVelocity: 0.75,
        timestep: 0.5,
      },
      interaction: {
        hover: true,
        tooltipDelay: 300,
        zoomView: true,
        dragView: true,
        dragNodes: true,
      },
      nodes: { chosen: false, shadow: { enabled: false } },
      edges: { chosen: false, selectionWidth: 0 },
      autoResize: true,
    }

    network = new Network(containerRef.value, { nodes: nodes as any, edges: edges as any }, options)

    network.once('stabilized', () => {
      network?.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } })
      // Фиксируем все ноды после первоначальной стабилизации
      if (nodes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const positions = network!.getPositions()
        const updates: any[] = []
        nodes.forEach((n) => {
          const pos = positions[n.id as string]
          if (pos) updates.push({ id: n.id, x: pos.x, y: pos.y, fixed: { x: true, y: true } })
        })
        nodes.update(updates)
      }
    })

    // Фиксируем ноду в точке отпускания, чтобы она не продолжала двигаться
    network.on('dragEnd', (params: any) => {
      if (!params.nodes.length || !nodes || !network) return
      const positions = network.getPositions(params.nodes)

      // Определяем по координатам МЫШИ (не нода!), был ли реальный drag
      const endPointer = params.pointer?.DOM
      if (dragStartPointer && endPointer) {
        const dx = endPointer.x - dragStartPointer.x
        const dy = endPointer.y - dragStartPointer.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        isDragging = dist > DRAG_THRESHOLD
      }
      dragStartPointer = null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any[] = params.nodes.map((id: string) => ({
        id,
        x: positions[id].x,
        y: positions[id].y,
        fixed: { x: true, y: true },
      }))
      nodes.update(updates)
      // Сброс isDragging с задержкой — selectNode приходит после dragEnd
      setTimeout(() => { isDragging = false }, 50)
    })

    // Снимаем фиксацию перед перетаскиванием и запоминаем позицию указателя мыши
    network.on('dragStart', (params: any) => {
      const pointer = params.pointer?.DOM
      dragStartPointer = pointer ? { x: pointer.x, y: pointer.y } : null
      isDragging = false
      if (!params.nodes.length || !nodes) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any[] = params.nodes.map((id: string) => ({ id, fixed: { x: false, y: false } }))
      nodes.update(updates)
    })
  }

  function onSelectNode(callback: (nodeId: string, level: number) => void) {
    network?.on('selectNode', (params: any) => {
      if (isDragging) return
      if (!params.nodes.length || !nodes) return
      const nodeId = params.nodes[0]
      const node = nodes.get(nodeId) as unknown as VisNodeData | null
      if (node) callback(nodeId, node.level)
    })
  }

  function onClickEmpty(callback: () => void) {
    network?.on('click', (params: any) => {
      if (params.nodes.length === 0 && params.edges.length === 0) {
        callback()
      }
    })
  }

  onMounted(() => init())
  onBeforeUnmount(() => {
    network?.destroy()
    network = null
    nodes = null
    edges = null
    ORIG = {}
    ORIG_EDGE = {}
    expandedL1.clear()
    expandedL2.clear()
    graphFocus = null
    graphFocusSet.clear()
  })

  const { settingsVersion } = useVisualSettings()
  watch(currentTheme, () => rebuildForTheme())
  watch(settingsVersion, () => rebuildForTheme())

  return {
    applyFocus,
    addFocusNode,
    resetGraphVisuals,
    clearFocusVisualsPreserveVisibility,
    clearGraphFocus,
    toggleL1,
    toggleL2,
    expandL1,
    expandAllL2,
    expandAllL3,
    collapseAllL2,
    resetExpansionState,
    snapshotExpansionState,
    restoreExpansionState,
    updateCorrelationsForAge,
    getNodeData,
    unselectAll,
    updateVisibleCorrelations,
    hideAllCorrelations,
    onSelectNode,
    onClickEmpty,
  }
}
