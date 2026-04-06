import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { Network, DataSet } from 'vis-network/standalone'
import type { Attractor } from '@/types/attractor'
import type { VisNodeData, VisEdgeData, OrigNodeSnapshot, OrigEdgeSnapshot, ExpansionSnapshot } from '@/types/network'
import { CORRELATIONS } from '@/data/correlations'
import { useAttractorStore } from './useAttractorStore'
import { useTheme } from './useTheme'
import { useAppState } from './useAppState'
import { getCorrelatedL2Ids, getCorrEdgesForNode } from './useCorrelations'
import { nc, nodeFont, nodeMass, wrapLabel } from '@/utils/nodeStyles'
import { hierarchyEdge, correlationEdge } from '@/utils/edgeStyles'
import { useVisualSettings } from './useVisualSettings'
import { computeInitialPositions } from './useNetworkLayout'
import {
  startBreatheAnimation, stopBreatheAnimation, updateBreatheBase,
  setBreatheBasePositions, getBreatheBasePositions, resetBreatheState,
} from './useNetworkBreathe'

const expandedL1 = new Set<string>()
const expandedL2 = new Set<string>()
let isDragging = false
let dragStartPointer: { x: number; y: number } | null = null
let lastDragNodePos: { x: number; y: number } | null = null
let draggedNodeId: string | null = null
const DRAG_THRESHOLD = 10 // px — если сдвиг указателя мыши меньше, считаем кликом
const graphFocusSet = new Set<string>() // мульти-фокус: набор всех выделенных L2-нод

let network: Network | null = null
let nodes: DataSet<VisNodeData> | null = null
let edges: DataSet<VisEdgeData> | null = null
let ORIG: Record<string, OrigNodeSnapshot> = {}
let ORIG_EDGE: Record<string, OrigEdgeSnapshot> = {}

interface DropdownCorrLine {
  from: string
  to: string
  color: string
  width: number
  label: string
  labelStroke: string
}
let dropdownCorrLines: DropdownCorrLine[] = []

function buildNodesData() {
  const { domains, attractors } = useAttractorStore()
  const { T, currentTheme } = useTheme()
  const { nodeSizeL1, nodeSizeL2, nodeSizeL3, fontSizeL1, fontSizeL2, fontSizeL3 } = useVisualSettings()
  const initialPositions = computeInitialPositions(attractors.value)
  return attractors.value.map((a: Attractor) => {
    const sz = a.level === 1 ? nodeSizeL1.value : a.level === 2 ? nodeSizeL2.value : nodeSizeL3.value
    const baseFont = nodeFont(domains.value, T.value, currentTheme.value, a.domain, a.level)
    const fs = a.level === 1 ? fontSizeL1.value : a.level === 2 ? fontSizeL2.value : fontSizeL3.value
    const pos = initialPositions[a.id]
    return {
      id: a.id,
      label: a.level === 2 ? wrapLabel(a.label, 2) : a.level === 3 ? wrapLabel(a.label) : a.label,
      level: a.level,
      domain: a.domain,
      parent: a.parent,
      description: a.description || '',
      insights: a.insights || '',
      shape: 'dot',
      size: sz,
      mass: nodeMass(a.level),
      color: nc(domains.value, a.domain, a.level),
      borderWidth: a.level === 1 ? 2 : 1,
      font: { ...baseFont, size: fs },
      hidden: a.level !== 1,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      fixed: a.level === 1 ? { x: true, y: true } : false,
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
  if (!nodes || !edges) return
  const { attractors } = useAttractorStore()
  attractors.value.forEach((a: Attractor) => {
    if (a.level === 1) expandL1(a.id)
  })
}

function expandAllL3() {
  expandAllL2()
  if (!nodes || !edges) return
  const { attractors } = useAttractorStore()
  attractors.value.forEach((a: Attractor) => {
    if (a.level === 2) expandL2(a.id)
  })
  // Принудительно показать все иерархические рёбра
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hierUpdates: any[] = []
  edges.forEach((e) => {
    if (e.type === 'hierarchy') hierUpdates.push({ id: e.id, hidden: false })
  })
  if (hierUpdates.length) edges.update(hierUpdates)
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

// ── DRAG: СДВИГ ДЕТЕЙ ПО ДЕЛЬТЕ ─────────────────────────────

function moveChildrenByDelta(nodeId: string, dx: number, dy: number) {
  if (!nodes || !network) return
  const { getChildren } = useAttractorStore()
  const node = nodes.get(nodeId) as unknown as VisNodeData | null
  if (!node) return

  const childIds: string[] = []
  if (node.level === 1) {
    const l2s = getChildren(nodeId)
    for (const l2Id of l2s) {
      childIds.push(l2Id)
      childIds.push(...getChildren(l2Id))
    }
  } else if (node.level === 2) {
    childIds.push(...getChildren(nodeId))
  }

  if (!childIds.length) return
  const positions = network.getPositions(childIds)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any[] = []
  for (const id of childIds) {
    if (positions[id]) {
      updates.push({ id, x: positions[id].x + dx, y: positions[id].y + dy, fixed: { x: true, y: true } })
    }
  }
  if (updates.length) nodes.update(updates)
}

// ── FOCUS / DIM ─────────────────────────────────────────────

function FOCUS_NODE(origSize: number, origFont: OrigNodeSnapshot['font'], origColor?: OrigNodeSnapshot['color']) {
  const { T } = useTheme()
  const bg = origColor?.background ?? '#ffffff'
  const bgHighlight = origColor?.highlight?.background ?? bg
  return {
    color: { background: bg, border: '#fbbf24', highlight: { background: bgHighlight, border: '#f59e0b' } },
    font: { ...origFont, color: T.value.focusFont.color, strokeWidth: 3, strokeColor: T.value.focusFont.stroke },
    borderWidth: 5,
    size: Math.max(origSize, 28),
  }
}

function CORR_NODE() {
  return {
    color: { background: '#eff6ff', border: '#60a5fa', highlight: { background: '#dbeafe', border: '#3b82f6' } },
    font: { color: '#1e40af', strokeWidth: 2, strokeColor: '#ffffff' },
    borderWidth: 3,
  }
}

// ── МУЛЬТИ-ФОКУС (без димминга) ─────────────────────────────

function applyMultiFocusVisuals() {
  if (!nodes || !edges) return
  const { midAge } = useAppState()
  const { corrReinforcingColor, corrConflictingColor } = useVisualSettings()

  // Очищаем dropdown overlay — клик-фокус и dropdown-подсветка взаимоисключающие
  dropdownCorrLines = []

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
    const orig = ORIG[nid]
    if (!orig) return
    if (graphFocusSet.has(nid)) {
      nu.push({ id: nid, ...FOCUS_NODE(orig.size, orig.font, orig.color) })
    } else if (allCorrelated.has(nid)) {
      nu.push({ id: nid, ...CORR_NODE() })
    } else {
      nu.push({ id: nid, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size })
    }
  })
  nodes.update(nu)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    const origE = ORIG_EDGE[e.id]
    if (!origE) return
    if (e.type === 'hierarchy') {
      eu.push({ id: e.id, color: origE.color, width: origE.width })
    } else if (e.type === 'correlation') {
      const corrInfo = allCorrEdgeMap.get(e.id as string)
      if (corrInfo) {
        const corrColor = corrInfo.type === 'reinforcing'
          ? { color: corrReinforcingColor.value, opacity: 0.9 }
          : { color: corrConflictingColor.value, opacity: 0.9 }
        eu.push({ id: e.id, hidden: false, color: corrColor, width: 5 + corrInfo.strength * 16 })
      } else {
        eu.push({ id: e.id, color: origE.color, width: origE.width })
      }
    }
  })
  edges.update(eu)

  network?.redraw()
  return { correlated: allCorrelated.size }
}

function applyFocus(nodeId: string) {
  if (!nodes || !edges) return
  const { currentFocus } = useAppState()

  currentFocus.value = nodeId
  graphFocusSet.clear()
  graphFocusSet.add(nodeId)

  return applyMultiFocusVisuals()
}

function addFocusNode(nodeId: string) {
  if (!nodes || !edges) return

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
  graphFocusSet.clear()
  resetExpansionState()

  nodes.update(nodes.map((n) => {
    const orig = ORIG[n.id]
    if (!orig) return { id: n.id }
    return { id: n.id, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size, hidden: orig.hidden }
  }))

  edges.update(edges.map((e) => {
    const origE = ORIG_EDGE[e.id]
    if (!origE) return { id: e.id }
    return { id: e.id, hidden: origE.hidden, color: origE.color, width: origE.width }
  }))
}

function clearFocusVisualsPreserveVisibility() {
  if (!nodes || !edges) return
  const { currentFocus, currentSituation, currentStrategy, correlationsVisible } = useAppState()
  currentFocus.value = null
  currentSituation.value = null
  currentStrategy.value = null
  graphFocusSet.clear()

  nodes.update(nodes.map((n) => {
    const orig = ORIG[n.id]
    if (!orig) return { id: n.id }
    return { id: n.id, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size }
  }))

  edges.update(edges.map((e) => {
    const origE = ORIG_EDGE[e.id]
    if (!origE) return { id: e.id }
    return { id: e.id, color: origE.color, width: origE.width }
  }))

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
  graphFocusSet.clear()

  nodes.update(nodes.map((n) => {
    const orig = ORIG[n.id]
    if (!orig) return { id: n.id }
    return { id: n.id, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size }
  }))

  edges.update(edges.map((e) => {
    const origE = ORIG_EDGE[e.id]
    if (!origE) return { id: e.id }
    return { id: e.id, color: origE.color, width: origE.width }
  }))

  if (correlationsVisible.value) {
    updateVisibleCorrelations()
  } else {
    hideAllCorrelations()
  }
}

function updateCorrelationsForAge(age: number) {
  if (!nodes || !edges) return
  if (graphFocusSet.size === 0) return 0

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
      eu.push({ id: e.id, hidden: false, color: corrColor, width: 5 + corrInfo.strength * 16 })
    } else {
      const origE = ORIG_EDGE[e.id]
      if (origE) eu.push({ id: e.id, color: origE.color, width: origE.width })
    }
  })
  edges.update(eu)

  return allCorrelated.size
}

function rebuildForTheme() {
  if (!nodes || !edges) return

  const snap = snapshotExpansionState()
  resetExpansionState()

  // Сохраняем старые ORIG на случай ошибки
  const prevORIG = ORIG
  const prevORIG_EDGE = ORIG_EDGE

  try {
    const nodesData = buildNodesData()
    const edgesData = buildEdgesData()

    // Атомарное обновление ORIG
    const newORIG: Record<string, OrigNodeSnapshot> = {}
    nodesData.forEach((n) => {
      newORIG[n.id] = {
        color: JSON.parse(JSON.stringify(n.color)),
        font: JSON.parse(JSON.stringify(n.font)),
        borderWidth: n.borderWidth,
        size: n.size,
        hidden: n.hidden,
      }
    })
    const newORIG_EDGE: Record<string, OrigEdgeSnapshot> = {}
    edgesData.forEach((e) => {
      newORIG_EDGE[e.id] = {
        hidden: e.hidden,
        color: JSON.parse(JSON.stringify(e.color)),
        width: e.width,
      }
    })

    // Присваиваем только после успешного построения
    ORIG = newORIG
    ORIG_EDGE = newORIG_EDGE

    const { activeSelectedIds } = useAppState()

    if (graphFocusSet.size > 0) {
      const savedSet = new Set(graphFocusSet)
      nodes.update(nodes.map((n) => {
        const orig = ORIG[n.id]
        if (!orig) return { id: n.id }
        return { id: n.id, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size, hidden: orig.hidden }
      }))
      edges.update(edges.map((e) => {
        const origE = ORIG_EDGE[e.id]
        if (!origE) return { id: e.id }
        return { id: e.id, hidden: origE.hidden, color: origE.color, width: origE.width }
      }))
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

    if (activeSelectedIds.value.size > 0) {
      applyDropdownHighlight(activeSelectedIds.value)
    }
  } catch (err) {
    // Откатываем ORIG к предыдущему состоянию
    ORIG = prevORIG
    ORIG_EDGE = prevORIG_EDGE
    console.error('[useNetwork] rebuildForTheme failed:', err)
  }
}

function getNodeData(nodeId: string) {
  return nodes?.get(nodeId)
}

function unselectAll() {
  network?.unselectAll()
}

// ── DROPDOWN HIGHLIGHT ────────────────────────────────────────

function applyDropdownHighlight(selectedIds: Set<string>, corrSourceId: string | null = null) {
  if (!nodes || !edges) return
  const { midAge } = useAppState()
  const { corrReinforcingColor, corrConflictingColor } = useVisualSettings()

  // Очищаем предыдущий overlay
  dropdownCorrLines = []

  // Авто-раскрытие L1 для скрытых выбранных L2
  for (const nodeId of selectedIds) {
    const node = nodes.get(nodeId)
    if (node && node.hidden && node.parent) {
      expandL1(node.parent)
    }
  }

  // Источник корреляций: только активный аттрактор (corrSourceId) или никто
  const sourcesToDraw = corrSourceId ? new Set([corrSourceId]) : new Set<string>()

  // Собираем корреляции от sourcesToDraw
  const allCorrEdgeIds = new Set<string>()
  const allCorrEdges = new Map<string, { type: string; strength: number; from: string; to: string }>()
  for (const nodeId of sourcesToDraw) {
    getCorrEdgesForNode(nodeId, midAge.value).forEach(ce => {
      if (allCorrEdges.has(ce.corrId)) return
      const corr = CORRELATIONS.find(c => c.id === ce.corrId)
      if (!corr) return
      allCorrEdges.set(ce.corrId, { type: ce.type, strength: ce.strength, from: corr.from, to: corr.to })
      allCorrEdgeIds.add(ce.corrId)
    })
  }

  // Авто-раскрытие L1 для скоррелированных L2, которые скрыты
  allCorrEdges.forEach((info) => {
    for (const nid of [info.from, info.to]) {
      if (selectedIds.has(nid)) continue
      const node = nodes!.get(nid)
      if (node && node.hidden && node.parent) {
        expandL1(node.parent)
      }
    }
  })

  // Подсветка нод
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nu: any[] = []
  nodes.forEach((n) => {
    if (n.hidden) return
    const nid = n.id as string
    const orig = ORIG[nid]
    if (!orig) return
    if (selectedIds.has(nid)) {
      nu.push({ id: nid, ...FOCUS_NODE(orig.size, orig.font, orig.color) })
    } else {
      nu.push({ id: nid, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size })
    }
  })
  nodes.update(nu)

  // Рёбра: парные корреляции скрываем в DataSet (рисуем через afterDrawing поверх нод)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    const origE = ORIG_EDGE[e.id]
    if (!origE) return
    if (e.type !== 'correlation') {
      eu.push({ id: e.id, color: origE.color, width: origE.width })
      return
    }
    const eid = e.id as string
    if (allCorrEdgeIds.has(eid)) {
      eu.push({ id: e.id, hidden: true, label: undefined, font: undefined })
    } else {
      eu.push({ id: e.id, color: origE.color, width: origE.width, label: undefined, font: undefined })
    }
  })
  edges.update(eu)

  // Заполняем overlay для afterDrawing (все корреляции от выбранных нод)
  allCorrEdges.forEach((corrInfo, corrId) => {
    const corr = CORRELATIONS.find(c => c.id === corrId)
    if (!corr) return
    const isReinforcing = corrInfo.type === 'reinforcing'
    dropdownCorrLines.push({
      from: corr.from,
      to: corr.to,
      color: isReinforcing ? corrReinforcingColor.value : corrConflictingColor.value,
      width: 5 + corrInfo.strength * 16,
      label: (corrInfo.strength * 100).toFixed(0) + '%',
      labelStroke: isReinforcing ? '#166534' : '#991b1b',
    })
  })

  network?.redraw()
}

function clearDropdownHighlight() {
  if (!nodes || !edges) return
  const { correlationsVisible } = useAppState()

  dropdownCorrLines = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nu: any[] = []
  nodes.forEach((n) => {
    if (n.hidden) return
    const nid = n.id as string
    const orig = ORIG[nid]
    if (!orig) return
    nu.push({ id: nid, color: orig.color, font: orig.font, borderWidth: orig.borderWidth, size: orig.size })
  })
  nodes.update(nu)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eu: any[] = []
  edges.forEach((e) => {
    const origE = ORIG_EDGE[e.id]
    if (!origE) return
    if (e.type === 'hierarchy') {
      // Не трогать hidden — управляется expand/collapse
      eu.push({ id: e.id, color: origE.color, width: origE.width })
    } else {
      eu.push({ id: e.id, hidden: origE.hidden, color: origE.color, width: origE.width, label: undefined, font: undefined })
    }
  })
  edges.update(eu)

  network?.redraw()

  if (correlationsVisible.value) {
    updateVisibleCorrelations()
  } else {
    hideAllCorrelations()
  }
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
          gravitationalConstant: -8000,
          centralGravity: 0.02,
          springLength: 350,
          springConstant: 0.01,
          damping: 0.4,
          avoidOverlap: 0.6,
        },
        stabilization: { enabled: true, iterations: 1000, fit: true },
        maxVelocity: 10,
        minVelocity: 0.75,
        timestep: 0.35,
      },
      interaction: {
        hover: false,
        zoomView: true,
        dragView: true,
        dragNodes: true,
      },
      nodes: { chosen: false, shadow: { enabled: false } },
      edges: { chosen: false, selectionWidth: 0 },
      autoResize: true,
    }

    network = new Network(containerRef.value, { nodes: nodes as any, edges: edges as any }, options)

    // Рисуем dropdown-корреляции поверх всего (nodes + edges)
    network.on('afterDrawing', (ctx: CanvasRenderingContext2D) => {
      if (!dropdownCorrLines.length || !network) return
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const line of dropdownCorrLines) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fromPos = (network as any).getPosition(line.from)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toPos = (network as any).getPosition(line.to)
          // Квадратичный безье — воспроизводим curvedCW roundness:0.15 из vis-network
          const x1 = fromPos.x, y1 = fromPos.y
          const x2 = toPos.x,   y2 = toPos.y
          const dx = x2 - x1, dy = y2 - y1
          const ROUNDNESS = 0.15
          // Контрольная точка: середина + перпендикуляр по часовой стрелке
          const cpx = (x1 + x2) / 2 + dy * ROUNDNESS
          const cpy = (y1 + y2) / 2 - dx * ROUNDNESS
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.quadraticCurveTo(cpx, cpy, x2, y2)
          ctx.globalAlpha = 0.95
          ctx.strokeStyle = line.color
          ctx.lineWidth = line.width
          ctx.stroke()
          if (line.label) {
            // Середина квадратичного безье при t=0.5: (p1 + 2*cp + p2) / 4
            const lx = (x1 + 2 * cpx + x2) / 4
            const ly = (y1 + 2 * cpy + y2) / 4
            ctx.font = 'bold 14px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.globalAlpha = 1
            ctx.lineWidth = 5
            ctx.strokeStyle = line.labelStroke
            ctx.strokeText(line.label, lx, ly)
            ctx.fillStyle = '#ffffff'
            ctx.fillText(line.label, lx, ly)
          }
        } catch (_) { /* нода может быть скрыта */ }
      }
      ctx.restore()
    })

    network.once('stabilized', () => {
      network?.fit({ animation: { duration: 200, easingFunction: 'easeInOutQuad' } })
      // Фиксируем все ноды после первоначальной стабилизации
      if (nodes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const positions = network!.getPositions()
        const updates: any[] = []
        const basePositions: Record<string, { x: number; y: number }> = {}
        nodes.forEach((n) => {
          const pos = positions[n.id as string]
          if (pos) {
            updates.push({ id: n.id, x: pos.x, y: pos.y, fixed: { x: true, y: true } })
            basePositions[n.id as string] = { x: pos.x, y: pos.y }
          }
        })
        nodes.update(updates)
        setBreatheBasePositions(basePositions)
        startBreatheAnimation(network, nodes)
      }
    })

    // ── DRAG: start → непрерывный drag → end ──────────────────
    // Паттерн: unfix только перетаскиваемую ноду, дети сдвигаются
    // непрерывно на каждом тике drag (без телепортации в dragEnd)

    network.on('dragStart', (params: any) => {
      const pointer = params.pointer?.DOM
      dragStartPointer = pointer ? { x: pointer.x, y: pointer.y } : null
      isDragging = false
      if (!params.nodes.length || !nodes || !network) return
      const nodeId = params.nodes[0]
      draggedNodeId = nodeId
      const pos = network.getPositions([nodeId])
      lastDragNodePos = pos[nodeId] ? { x: pos[nodeId].x, y: pos[nodeId].y } : null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes.update([{ id: nodeId, fixed: { x: false, y: false } } as any])
    })

    // Непрерывный сдвиг детей во время перетаскивания (плавное движение)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(network as any).on('drag', (params: any) => {
      if (!params.nodes.length || !nodes || !network || !lastDragNodePos || !draggedNodeId) return
      const nodeId = draggedNodeId
      const currentPos = network.getPositions([nodeId])
      if (!currentPos[nodeId]) return

      const dx = currentPos[nodeId].x - lastDragNodePos.x
      const dy = currentPos[nodeId].y - lastDragNodePos.y
      lastDragNodePos = { x: currentPos[nodeId].x, y: currentPos[nodeId].y }

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        moveChildrenByDelta(nodeId, dx, dy)
      }
    })

    network.on('dragEnd', (params: any) => {
      if (!params.nodes.length || !nodes || !network) return

      // Определяем по координатам МЫШИ (не нода!), был ли реальный drag
      const endPointer = params.pointer?.DOM
      if (dragStartPointer && endPointer) {
        const dx = endPointer.x - dragStartPointer.x
        const dy = endPointer.y - dragStartPointer.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        isDragging = dist > DRAG_THRESHOLD
      }
      dragStartPointer = null

      // Фиксируем перетаскиваемую ноду в текущей позиции
      const nodeId = params.nodes[0]
      const endPos = network.getPositions([nodeId])
      if (endPos[nodeId]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodes.update([{ id: nodeId, x: endPos[nodeId].x, y: endPos[nodeId].y, fixed: { x: true, y: true } } as any])
        updateBreatheBase(nodeId, endPos[nodeId].x, endPos[nodeId].y)
      }

      lastDragNodePos = null
      draggedNodeId = null

      // Сброс isDragging с задержкой — selectNode приходит после dragEnd
      setTimeout(() => { isDragging = false }, 50)
    })
  }

  function onSelectNode(callback: (nodeId: string, level: number) => void) {
    network?.on('selectNode', (params: any) => {
      if (isDragging) return
      if (!params.nodes.length || !nodes) return
      const nodeId = params.nodes[0]
      const node = nodes.get(nodeId) as unknown as VisNodeData | null
      if (node) callback(nodeId, node.level)
      // Сбрасываем selection vis-network чтобы повторный клик на ту же ноду снова файрил selectNode
      setTimeout(() => network?.unselectAll(), 0)
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
    resetBreatheState()
    network?.destroy()
    network = null
    nodes = null
    edges = null
    ORIG = {}
    ORIG_EDGE = {}
    dropdownCorrLines = []
    expandedL1.clear()
    expandedL2.clear()
    graphFocusSet.clear()
    lastDragNodePos = null
    draggedNodeId = null
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
    applyDropdownHighlight,
    clearDropdownHighlight,
    onSelectNode,
    onClickEmpty,
  }
}
