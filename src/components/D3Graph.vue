<template>
  <svg
    ref="svgRef"
    class="d3-graph"
    :class="{ 'is-zooming': isZooming }"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <!-- Radial gradient для каждого L1 домена -->
      <radialGradient
        v-for="node in l1Nodes"
        :key="'grad-' + node.id"
        :id="'grad-' + node.id"
        cx="40%" cy="38%" r="60%"
      >
        <stop offset="0%" :stop-color="node.gradientCenter" />
        <stop offset="100%" :stop-color="node.color" />
      </radialGradient>
    </defs>

    <g ref="viewportRef" transform="translate(0,0) scale(1)">
      <!-- Фон для клика по пустому месту -->
      <rect
        x="-50000" y="-50000" width="100000" height="100000"
        fill="transparent"
        @click="dispatch({ type: 'CLICK_EMPTY' })"
      />

      <!-- Фоновый слой всех корреляций — лёгкий и некликабельный -->
      <path
        v-for="edge in backgroundCorrEdges"
        :key="edge.id"
        :d="edge.path"
        class="edge-correlation-bg"
      />

      <!-- Иерархические рёбра — curved, утончающиеся -->
      <path
        v-for="edge in visibleHierarchyEdges"
        :key="edge.id"
        :d="edge.path"
        class="edge-hierarchy"
        :class="{ faded: hasFocus && !edge.relevant }"
        :stroke-width="edge.strokeWidth"
        fill="none"
      />

      <!-- Корреляционные рёбра — подложка + основной stroke без SVG-фильтров -->
      <path
        v-for="edge in visibleCorrEdges"
        :key="'halo-' + edge.id"
        :d="edge.path"
        class="edge-correlation-halo"
        :class="edge.type"
        :stroke-width="4 + edge.strength * 5"
      />
      <path
        v-for="edge in visibleCorrEdges"
        :key="edge.id"
        :d="edge.path"
        class="edge-correlation"
        :class="edge.type"
        :stroke-width="1.5 + edge.strength * 3.5"
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
        tabindex="0"
        role="button"
        :aria-label="nodeAriaLabel(node)"
        :aria-pressed="node.id === focusedNodeId"
        @click.stop="onNodeClick(node)"
        @dblclick.stop="dispatch({ type: 'DBLCLICK_NODE', nodeId: node.id })"
        @keydown.enter.prevent="onNodeClick(node)"
        @keydown.space.prevent="onNodeClick(node)"
        @keydown.exact.alt.enter.prevent="dispatch({ type: 'DBLCLICK_NODE', nodeId: node.id })"
        @focus="setHoveredNode(node.id)"
        @blur="hoveredNodeId = null"
        @mouseenter="setHoveredNode(node.id)"
        @mouseleave="hoveredNodeId = null"
      >
        <!-- L1: plain halo + gradient fill -->
        <circle
          v-if="node.level === 1"
          class="l1-halo"
          :r="node.radius + 18"
          :fill="node.color"
        />
        <circle
          v-if="node.level === 1"
          :r="node.radius"
          :fill="`url(#grad-${node.id})`"
          :stroke="node.borderColor"
          stroke-width="3"
        />
        <!-- L2/L3: плоский круг с тонкой обводкой -->
        <circle
          v-else
          :r="node.radius"
          :fill="node.color"
          :stroke="node.borderColor"
          :stroke-width="node.level === 2 ? 1.5 : 1"
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
          v-if="node.level !== 1"
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
import { domainColor, domainBorder, domainGradientCenter, domainFontColor } from '@/utils/colors'
import { wrapLabel } from '@/utils/nodeStyles'
import { useCorrelationStore } from '@/composables/useCorrelationStore'

const props = defineProps<{
  showAllCorrelations?: boolean
}>()

const { dispatch, viewState, focusedNodeId, activeAttractorIds, setEffectHandler, clearEffectHandler } = useStore()
const { correlations } = useCorrelationStore()
const { attractors, domains } = useAttractorStore()

const svgRef = ref<SVGSVGElement | null>(null)
const viewportRef = ref<SVGGElement | null>(null)
const expandedNodes = ref(new Set<string>())
const hoveredNodeId = ref<string | null>(null)

// Layout
const positionsMap = computed(() => computeLayout(attractors.value))

// Zoom
const d3Zoom = useD3Zoom(svgRef, viewportRef)
const isZooming = computed(() => d3Zoom.isZooming.value)

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
  gradientCenter: string
  borderColor: string
  fontColor: string
  labelLines: string[]
  relevant: boolean
}

// L1 ноды для SVG defs (градиенты) — всегда все L1
const l1Nodes = computed(() =>
  attractors.value
    .filter(a => a.level === 1)
    .map(a => {
      const pos = positionsMap.value.get(a.id)
      return {
        id: a.id,
        color: domainColor(domains.value, a.domain, 1),
        gradientCenter: domainGradientCenter(domains.value, a.domain),
      }
    })
)

const visibleNodes = computed<VisibleNode[]>(() => {
  const nodes: VisibleNode[] = []
  const expanded = expandedNodes.value
  const positions = positionsMap.value
  const doms = domains.value
  const focused = focusedNodeId.value
  const activeIds = activeAttractorIds.value
  const vs = viewState.value
  const isCorrelationFocus = vs.view === 'graph' && vs.focus.type === 'correlations'

  // Semantic zoom: скрывать L3 при отдалении
  const hideL3 = !d3Zoom.showL3.value

  for (const a of attractors.value) {
    // Видимость: L1 всегда, L2 если parent expanded, L3 если parent expanded + zoom достаточный
    if (a.level === 2 && (!a.parent || !expanded.has(a.parent))) continue
    if (a.level === 3 && (!a.parent || !expanded.has(a.parent))) continue
    if (a.level === 3 && hideL3) continue

    const pos = positions.get(a.id)
    if (!pos) continue

    const level = a.level as 1 | 2 | 3
    const label = level === 1 ? a.label : wrapLabel(a.label, level === 2 ? 2 : 3)

    // В режиме корреляций L1 — это контекстные домены, а не кандидаты
    // корреляций. Не затемняем их вместе с некоррелирующими L2.
    const isRelevant = isCorrelationFocus
      ? a.level === 1
        || a.id === focused
        || a.parent === focused
        || (a.level === 2 && activeIds.has(a.id))
        || corrTargetIds.value.has(a.id)
      : !focused
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
      gradientCenter: domainGradientCenter(doms, a.domain),
      borderColor: domainBorder(doms, a.domain, level),
      fontColor: level === 1 ? '#2a2a3a' : level === 2 ? domainFontColor(doms, a.domain) : '#888',
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
  const ids = new Set<string>()

  for (const corr of correlations.value) {
    if (corr.from !== nodeId && corr.to !== nodeId) continue
    ids.add(corr.from === nodeId ? corr.to : corr.from)
  }

  return ids
})

const hasFocus = computed(() => focusedNodeId.value !== null)

// ── Computed: иерархические рёбра ──

interface HierEdge {
  id: string
  path: string
  strokeWidth: number
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

    // Curved edge — subtle quad bezier perpendicular offset
    const mx = (from.x + to.x) / 2
    const my = (from.y + to.y) / 2
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const offset = len * 0.06
    const cx = mx + (-dy / len) * offset
    const cy = my + (dx / len) * offset

    // L1→L2 толще, L2→L3 тоньше
    const isL1Parent = a.level === 2
    const strokeWidth = isL1Parent ? 3 : 1.5

    edges.push({
      id: `hier-${a.parent}-${a.id}`,
      path: `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`,
      strokeWidth,
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

interface BackgroundCorrEdge {
  id: string
  path: string
}

function curvedPath(from: { x: number; y: number }, to: { x: number; y: number }, offsetRatio: number): string {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const offset = len * offsetRatio
  const cx = mx + (-dy / len) * offset
  const cy = my + (dx / len) * offset

  return `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`
}

const backgroundCorrEdges = computed<BackgroundCorrEdge[]>(() => {
  if (!props.showAllCorrelations) return []

  const visibleL2Ids = new Set(
    visibleNodes.value
      .filter(node => node.level === 2)
      .map(node => node.id)
  )
  if (visibleL2Ids.size === 0) return []

  const positions = positionsMap.value
  const edges: BackgroundCorrEdge[] = []

  for (const corr of correlations.value) {
    if (!visibleL2Ids.has(corr.from) || !visibleL2Ids.has(corr.to)) continue

    const fromPos = positions.get(corr.from)
    const toPos = positions.get(corr.to)
    if (!fromPos || !toPos) continue

    edges.push({
      id: `corr-bg-${corr.id}`,
      path: curvedPath(fromPos, toPos, 0.12),
    })
  }

  return edges
})

const visibleCorrEdges = computed<CorrEdge[]>(() => {
  const vs = viewState.value
  if (vs.view !== 'graph') return []
  if (vs.focus.type !== 'correlations') return []

  const nodeId = vs.focus.nodeId
  const positions = positionsMap.value
  const edges: CorrEdge[] = []

  for (const corr of correlations.value) {
    if (corr.from !== nodeId && corr.to !== nodeId) continue

    const otherId = corr.from === nodeId ? corr.to : corr.from
    // Рёбро видимо даже если другой узел скрыт — просто до его позиции
    const fromPos = positions.get(nodeId)
    const toPos = positions.get(otherId)
    if (!fromPos || !toPos) continue

    edges.push({
      id: `corr-${corr.id}`,
      path: curvedPath(fromPos, toPos, 0.15),
      type: corr.type,
      strength: corr.strength,
    })
  }

  return edges
})

// ── Handlers ──

function onNodeClick(node: VisibleNode) {
  dispatch({ type: 'CLICK_NODE', nodeId: node.id, level: node.level })
}

function setHoveredNode(nodeId: string) {
  if (!d3Zoom.isZooming.value) hoveredNodeId.value = nodeId
}

function nodeAriaLabel(node: VisibleNode): string {
  const flat = node.labelLines.join(' ')
  return `Уровень ${node.level}: ${flat}`
}

// Автоматически раскрыть L1/L2 при первом рендере, чтобы новые пользователи
// сразу видели L3-детализацию.
watch(attractors, (list) => {
  if (list.length > 0 && expandedNodes.value.size === 0) {
    expandedNodes.value = new Set(
      list
        .filter(a => a.level === 1 || a.level === 2)
        .map(a => a.id)
    )
  }
}, { immediate: true })

watch(isZooming, (zooming) => {
  if (zooming) hoveredNodeId.value = null
})
</script>

<style scoped>
.d3-graph {
  width: 100%;
  height: 100%;
  cursor: grab;
  background: var(--bg, #ffffff);
  overflow: hidden;
}
.d3-graph:active {
  cursor: grabbing;
}

/* ── Рёбра иерархии — curved, утончённые ── */
.edge-hierarchy {
  stroke: rgba(39,37,30,0.12);
  stroke-linecap: round;
  transition: opacity var(--duration-slow, 0.4s) var(--ease-out-expo, ease);
}
.edge-hierarchy.faded {
  opacity: 0.04;
}

/* ── Рёбра корреляций — подложка без SVG-фильтров ── */
.edge-correlation-bg {
  fill: none;
  stroke: rgba(83, 88, 96, 0.30);
  stroke-width: 1.1;
  stroke-linecap: round;
  pointer-events: none;
}
.edge-correlation-halo {
  fill: none;
  opacity: 0.18;
  stroke-linecap: round;
  pointer-events: none;
}
.edge-correlation {
  fill: none;
  opacity: 0.80;
  stroke-linecap: round;
  transition: opacity var(--duration-base, 0.25s) var(--ease-out-expo, ease);
}
.edge-correlation.reinforcing {
  stroke: #0891b2;
}
.edge-correlation-halo.reinforcing {
  stroke: #0891b2;
}
.edge-correlation.conflicting {
  stroke: #dc2626;
}
.edge-correlation-halo.conflicting {
  stroke: #dc2626;
}

/* ── Ноды ── */
.graph-node {
  cursor: pointer;
  transition: opacity var(--duration-slow, 0.4s) var(--ease-out-expo, ease);
  outline: none;
}
.graph-node:focus-visible circle {
  stroke: var(--accent, #8a6228);
  stroke-width: 4;
  filter: drop-shadow(0 0 6px rgba(var(--accent-rgb),0.46));
}
.l1-halo {
  opacity: 0.10;
  pointer-events: none;
}

/* Hover — масштабирование + мягкая тень */
.graph-node.level-1:hover {
  filter: brightness(1.03);
}
.graph-node.level-2 circle,
.graph-node.level-3 circle {
  transition: transform var(--duration-base, 0.25s) var(--ease-out-expo, ease),
              stroke-width var(--duration-fast, 0.15s);
}
.graph-node.level-2.hovered circle {
  transform: scale(1.12);
  stroke-width: 2.5;
}
.graph-node.level-3.hovered circle {
  transform: scale(1.2);
}

/* Focus — accent ring */
.graph-node.focused.level-1 circle {
  stroke: var(--accent, #8a6228) !important;
  stroke-width: 5 !important;
}
.graph-node.focused.level-2 circle {
  stroke: var(--accent, #8a6228) !important;
  stroke-width: 3.5 !important;
}
.graph-node.focused.level-3 circle {
  stroke: var(--accent, #8a6228) !important;
  stroke-width: 2.5 !important;
}

/* Correlation target */
.graph-node.corr-target circle {
  stroke-width: 3 !important;
}

/* Faded — плавное затухание */
.graph-node.faded {
  opacity: 0.15;
}
.graph-node.faded:hover {
  opacity: 0.5;
}

.d3-graph.is-zooming .edge-hierarchy,
.d3-graph.is-zooming .edge-correlation,
.d3-graph.is-zooming .graph-node,
.d3-graph.is-zooming .graph-node circle {
  transition: none !important;
}
.d3-graph.is-zooming .graph-node circle {
  filter: none;
}
.d3-graph.is-zooming .graph-node.hovered circle {
  transform: none;
}

/* ── Лейблы ── */
.node-label {
  pointer-events: none;
  user-select: none;
  font-family: var(--font-display, 'Inter Tight', sans-serif);
  font-weight: 500;
  letter-spacing: 0;
}
.level-1 .node-label {
  font-weight: 600;
  letter-spacing: 0.01em;
}
.level-2 .node-label {
  font-weight: 500;
}
.level-3 .node-label {
  font-weight: 400;
}
</style>
