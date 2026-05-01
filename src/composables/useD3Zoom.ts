import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { zoom as d3Zoom, zoomIdentity, select, type ZoomBehavior, type D3ZoomEvent, easeExpOut as expOut } from 'd3'
import type { NodePosition } from './useGraphLayout'

export interface D3ZoomApi {
  readonly showL3: Ref<boolean>
  readonly isZooming: Ref<boolean>
  zoomTo(positions: NodePosition[], padding?: number): void
  resetZoom(): void
}

const L3_HIDE_SCALE = 0.22
const L3_SHOW_SCALE = 0.28

export function useD3Zoom(
  svgRef: Ref<SVGSVGElement | null>,
  viewportRef: Ref<SVGGElement | null>,
): D3ZoomApi {
  const showL3 = ref(true)
  const isZooming = ref(false)

  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null
  let zoomIdleTimer: number | null = null

  function markZooming(): void {
    if (!isZooming.value) isZooming.value = true
    if (zoomIdleTimer !== null) window.clearTimeout(zoomIdleTimer)
    zoomIdleTimer = window.setTimeout(() => {
      isZooming.value = false
      zoomIdleTimer = null
    }, 120)
  }

  function updateSemanticZoom(scale: number): void {
    if (showL3.value && scale < L3_HIDE_SCALE) {
      showL3.value = false
    } else if (!showL3.value && scale > L3_SHOW_SCALE) {
      showL3.value = true
    }
  }

  onMounted(() => {
    const svg = svgRef.value
    if (!svg) return

    zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.02, 4])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform
        markZooming()
        if (viewportRef.value) {
          select(viewportRef.value).attr('transform', t.toString())
        }
        updateSemanticZoom(t.k)
      })

    select(svg).call(zoomBehavior)

    // Начальный fit: подождать один tick чтобы размеры SVG были известны
    requestAnimationFrame(() => fitAll(svg))
  })

  onBeforeUnmount(() => {
    const svg = svgRef.value
    if (svg) select(svg).on('.zoom', null)
    if (zoomIdleTimer !== null) window.clearTimeout(zoomIdleTimer)
    zoomBehavior = null
  })

  function fitAll(svg: SVGSVGElement) {
    if (!zoomBehavior) return
    const { width, height } = svg.getBoundingClientRect()
    if (width === 0 || height === 0) return

    // Fit всех нод (L1 radius 2000 + L2/L3 force spread + margin)
    const extent = 3500
    const k = Math.min(width, height) / (extent * 2) * 0.85
    const tx = width / 2
    const ty = height / 2
    const t = zoomIdentity.translate(tx, ty).scale(k)

    select(svg)
      .transition()
      .duration(800)
      .ease(expOut)
      .call(zoomBehavior.transform, t)
  }

  function zoomTo(positions: NodePosition[], padding = 600) {
    const svg = svgRef.value
    if (!svg || !zoomBehavior || positions.length === 0) return
    const { width, height } = svg.getBoundingClientRect()
    if (width === 0 || height === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of positions) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    // Для одиночного узла padding должен вмещать радиус L1 (~120) + соседние L2 + их лейблы.
    // Тогда при фокусе на L1 соседние L2-лейблы не выползают за viewport.
    const effectivePad = positions.length === 1 ? Math.max(padding, 900) : padding
    minX -= effectivePad
    minY -= effectivePad
    maxX += effectivePad
    maxY += effectivePad

    const boxW = maxX - minX
    const boxH = maxY - minY
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    // Max k = 0.8 — предотвращает чрезмерное увеличение одиночного узла,
    // из-за которого L1-лейбл и соседние L2 выходили за границы SVG.
    const k = Math.min(width / boxW, height / boxH, 0.8)
    const tx = width / 2 - cx * k
    const ty = height / 2 - cy * k
    const t = zoomIdentity.translate(tx, ty).scale(k)

    select(svg)
      .transition()
      .duration(600)
      .ease(expOut)
      .call(zoomBehavior.transform, t)
  }

  function resetZoom() {
    const svg = svgRef.value
    if (svg) fitAll(svg)
  }

  return { showL3, isZooming, zoomTo, resetZoom }
}
