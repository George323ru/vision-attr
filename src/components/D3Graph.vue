<template>
  <svg
    ref="svgRef"
    class="d3-graph"
  >
    <g :transform="zoomTransform">
      <!-- Фон для клика по пустому месту -->
      <rect
        x="-50000" y="-50000" width="100000" height="100000"
        fill="transparent"
        @click="dispatch({ type: 'CLICK_EMPTY' })"
      />
      <!-- Иерархические рёбра -->
      <line
        v-for="edge in visibleHierarchyEdges"
        :key="edge.id"
        :x1="edge.x1" :y1="edge.y1"
        :x2="edge.x2" :y2="edge.y2"
        class="edge-hierarchy"
        :class="{ faded: hasFocus && !edge.relevant }"
      />

      <!-- Корреляционные рёбра -->
      <path
        v-for="edge in visibleCorrEdges"
        :key="edge.id"
        :d="edge.path"
        class="edge-correlation"
        :class="edge.type"
        :stroke-width="2 + edge.strength * 4"
      />

      <!-- Ноды -->
      <g
        v-for="node in visibleNodes"
        :key="node.id"
        :transform="`translate(${node.x},${node.y})`"
        class="graph-node"
        :class="[
          `level-${node.level}`,
          {
            focused: node.id === focusedNodeId,
            hovered: node.id === hoveredNodeId,
            faded: hasFocus && !node.relevant,
            'corr-target': corrTargetIds.has(node.id),
          },
        ]"
        @click.stop="onNodeClick(node)"
        @dblclick.stop="dispatch({ type: 'DBLCLICK_NODE', nodeId: node.id })"
        @mouseenter="hoveredNodeId = node.id"
        @mouseleave="hoveredNodeId = null"
      >
        <circle
          :r="node.radius"
          :fill="node.color"
          :stroke="node.borderColor"
          :stroke-width="node.level === 1 ? 4 : 2"
        />
        <!-- L1: лейбл внутри круга -->
        <text
          v-if="node.level === 1"
          :font-size="node.fontSize"
          text-anchor="middle"
          dominant-baseline="central"
          :fill="node.fontColor"
          class="node-label"
        >
          <tspan
            v-for="(line, li) in node.labelLines"
            :key="li"
            :x="0"
            :dy="li === 0 ? `${-(node.labelLines.length - 1) * 0.5}em` : '1.1em'"
          >{{ line }}</tspan>
        </text>
        <!-- L2/L3: лейбл под нодой -->
        <text
          v-else
          :font-size="node.fontSize"
          text-anchor="middle"
          :y="node.radius + node.fontSize * 0.4"
          dominant-baseline="hanging"
          :fill="node.fontColor"
          class="node-label"
        >
          <tspan
            v-for="(line, li) in node.labelLines"
            :key="li"
            :x="0"
            :dy="li === 0 ? 0 : '1.15em'"
          >{{ line }}</tspan>
        </text>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStore } from '@/composables/state/useStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { computeLayout, nodeRadius, nodeFontSize } from '@/composables/useGraphLayout'
import { useD3Zoom } from '@/composables/useD3Zoom'
import { useGraphEffects } from '@/composables/useGraphEffects'
import { domainColor, domainBorder } from '@/utils/colors'
import { wrapLabel } from '@/utils/nodeStyles'
import { CORRELATIONS } from '@/data/correlations'
import { getCorrelationAtAge } from '@/composables/useCorrelations'

const { dispatch, viewState, focusedNodeId, correlationAge, activeAttractorIds, setEffectHandler, clearEffectHandler } = useStore()
const { attractors, domains } = useAttractorStore()

const svgRef = ref<SVGSVGElement | null>(null)
const expandedNodes = ref(new Set<string>())
const hoveredNodeId = ref<string | null>(null)

// Layout
const positionsMap = computed(() => computeLayout(attractors.value))

// Zoom
const d3Zoom = useD3Zoom(svgRef)
const zoomTransform = computed(() => d3Zoom.transformStr.value)

// Effects
const graphEffects = useGraphEffects(expandedNodes, hoveredNodeId, d3Zoom, positionsMap)

// Подключить effect handler к store при монтировании
onMounted(() => {
  setEffectHandler((effects) => graphEffects.execute(effects))
})
onBeforeUnmount(() => {
  clearEffectHandler()
})

// ── Computed: видимые ноды ──

interface VisibleNode {
  id: string
  x: number
  y: number
  level: 1 | 2 | 3
  domain: string
  parent?: string
  radius: number
  fontSize: number
  color: string
  borderColor: string
  fontColor: string
  labelLines: string[]
  relevant: boolean
}

const visibleNodes = computed<VisibleNode[]>(() => {
  const nodes: VisibleNode[] = []
  const expanded = expandedNodes.value
  const positions = positionsMap.value
  const doms = domains.value
  const focused = focusedNodeId.value
  const activeIds = activeAttractorIds.value

  for (const a of attractors.value) {
    // Видимость: L1 всегда, L2 если parent expanded, L3 если parent expanded
    if (a.level === 2 && (!a.parent || !expanded.has(a.parent))) continue
    if (a.level === 3 && (!a.parent || !expanded.has(a.parent))) continue

    const pos = positions.get(a.id)
    if (!pos) continue

    const level = a.level as 1 | 2 | 3
    const label = level === 1 ? a.label : wrapLabel(a.label, level === 2 ? 2 : 3)

    // Нода "relevant" если: она сама в фокусе, связана с фокусом, или один из selected attractors
    const isRelevant = !focused
      || a.id === focused
      || a.parent === focused
      || (a.level === 2 && activeIds.has(a.id))
      || corrTargetIds.value.has(a.id)

    nodes.push({
      id: a.id,
      x: pos.x,
      y: pos.y,
      level,
      domain: a.domain,
      parent: a.parent,
      radius: nodeRadius(level),
      fontSize: nodeFontSize(level),
      color: domainColor(doms, a.domain, level),
      borderColor: domainBorder(doms, a.domain, level),
      fontColor: level <= 2 ? '#333' : '#666',
      labelLines: label.split('\n'),
      relevant: isRelevant,
    })
  }

  return nodes
})

// ── Computed: узлы-цели корреляций ──

const corrTargetIds = computed<Set<string>>(() => {
  const vs = viewState.value
  if (vs.view !== 'graph') return new Set()
  if (vs.focus.type !== 'correlations') return new Set()

  const nodeId = vs.focus.nodeId
  const age = vs.focus.age
  const ids = new Set<string>()

  for (const corr of CORRELATIONS) {
    if (corr.from !== nodeId && corr.to !== nodeId) continue
    const atAge = getCorrelationAtAge(corr, age)
    if (!atAge) continue
    ids.add(corr.from === nodeId ? corr.to : corr.from)
  }

  return ids
})

const hasFocus = computed(() => focusedNodeId.value !== null)

// ── Computed: иерархические рёбра ──

interface HierEdge {
  id: string
  x1: number; y1: number
  x2: number; y2: number
  relevant: boolean
}

const visibleHierarchyEdges = computed<HierEdge[]>(() => {
  const edges: HierEdge[] = []
  const visibleSet = new Set(visibleNodes.value.map(n => n.id))
  const positions = positionsMap.value
  const focused = focusedNodeId.value

  for (const a of attractors.value) {
    if (!a.parent) continue
    if (!visibleSet.has(a.id) || !visibleSet.has(a.parent)) continue

    const from = positions.get(a.parent)!
    const to = positions.get(a.id)!

    const relevant = !focused
      || a.id === focused
      || a.parent === focused

    edges.push({
      id: `hier-${a.parent}-${a.id}`,
      x1: from.x, y1: from.y,
      x2: to.x, y2: to.y,
      relevant,
    })
  }

  return edges
})

// ── Computed: корреляционные рёбра ──

interface CorrEdge {
  id: string
  path: string
  type: 'reinforcing' | 'conflicting'
  strength: number
}

const visibleCorrEdges = computed<CorrEdge[]>(() => {
  const vs = viewState.value
  if (vs.view !== 'graph') return []
  if (vs.focus.type !== 'correlations') return []

  const nodeId = vs.focus.nodeId
  const age = vs.focus.age
  const positions = positionsMap.value
  const visibleSet = new Set(visibleNodes.value.map(n => n.id))
  const edges: CorrEdge[] = []

  for (const corr of CORRELATIONS) {
    if (corr.from !== nodeId && corr.to !== nodeId) continue

    const atAge = getCorrelationAtAge(corr, age)
    if (!atAge) continue

    const otherId = corr.from === nodeId ? corr.to : corr.from
    // Рёбро видимо даже если другой узел скрыт — просто до его позиции
    const fromPos = positions.get(nodeId)
    const toPos = positions.get(otherId)
    if (!fromPos || !toPos) continue

    // Quadratic bezier с контрольной точкой, смещённой перпендикулярно
    const mx = (fromPos.x + toPos.x) / 2
    const my = (fromPos.y + toPos.y) / 2
    const dx = toPos.x - fromPos.x
    const dy = toPos.y - fromPos.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const offset = len * 0.15
    const cx = mx + (-dy / len) * offset
    const cy = my + (dx / len) * offset

    edges.push({
      id: `corr-${corr.id}`,
      path: `M ${fromPos.x},${fromPos.y} Q ${cx},${cy} ${toPos.x},${toPos.y}`,
      type: atAge.type as 'reinforcing' | 'conflicting',
      strength: atAge.strength,
    })
  }

  return edges
})

// ── Handlers ──

function onNodeClick(node: VisibleNode) {
  dispatch({ type: 'CLICK_NODE', nodeId: node.id, level: node.level })
}

// Автоматически раскрыть L1 при первом рендере
watch(attractors, (list) => {
  if (list.length > 0 && expandedNodes.value.size === 0) {
    // Раскрыть все L1 сразу при инициализации
    const l1Ids = list.filter(a => a.level === 1).map(a => a.id)
    expandedNodes.value = new Set(l1Ids)
  }
}, { immediate: true })
</script>

<style scoped>
.d3-graph {
  width: 100%;
  height: 100%;
  cursor: grab;
  background: var(--bg, #fafafa);
}
.d3-graph:active {
  cursor: grabbing;
}

/* Рёбра иерархии */
.edge-hierarchy {
  stroke: rgba(0,0,0,0.15);
  stroke-width: 4;
  transition: opacity 0.3s ease;
}
.edge-hierarchy.faded {
  opacity: 0.06;
}

/* Рёбра корреляций */
.edge-correlation {
  fill: none;
  opacity: 0.85;
  transition: opacity 0.3s ease;
}
.edge-correlation.reinforcing {
  stroke: #0891b2;
}
.edge-correlation.conflicting {
  stroke: #dc2626;
}

/* Ноды */
.graph-node {
  cursor: pointer;
  transition: opacity 0.3s ease;
}
.graph-node:hover circle {
  filter: brightness(0.92);
}
.graph-node.focused circle {
  stroke: #c08a3e !important;
  stroke-width: 6 !important;
}
.graph-node.corr-target circle {
  stroke-width: 4 !important;
  filter: brightness(0.95);
}
.graph-node.faded {
  opacity: 0.2;
}
.graph-node.faded:hover {
  opacity: 0.6;
}

/* Лейблы */
.node-label {
  pointer-events: none;
  user-select: none;
  font-family: var(--font-display, 'Inter Tight', sans-serif);
  font-weight: 600;
}
.level-1 .node-label {
  font-weight: 700;
}
.level-3 .node-label {
  font-weight: 400;
}
</style>
