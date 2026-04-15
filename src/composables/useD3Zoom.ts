import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { zoom as d3Zoom, zoomIdentity, select, type ZoomBehavior, type D3ZoomEvent, easeExpOut as expOut } from 'd3'
import type { NodePosition } from './useGraphLayout'

export interface D3ZoomApi {
  readonly transformStr: Ref<string>
  readonly scale: Ref<number>
  zoomTo(positions: NodePosition[], padding?: number): void
  resetZoom(): void
}

export function useD3Zoom(svgRef: Ref<SVGSVGElement | null>): D3ZoomApi {
  const transformStr = ref('translate(0,0) scale(1)')
  const scale = ref(1)

  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null

  onMounted(() => {
    const svg = svgRef.value
    if (!svg) return

    zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.02, 4])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform
        transformStr.value = `translate(${t.x},${t.y}) scale(${t.k})`
        scale.value = t.k
      })

    select(svg).call(zoomBehavior)

    // Начальный fit: подождать один tick чтобы размеры SVG были известны
    requestAnimationFrame(() => fitAll(svg))
  })

  onBeforeUnmount(() => {
    const svg = svgRef.value
    if (svg) select(svg).on('.zoom', null)
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

  function zoomTo(positions: NodePosition[], padding = 300) {
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

    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const boxW = maxX - minX
    const boxH = maxY - minY
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const k = Math.min(width / boxW, height / boxH, 1.5)
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

  return { transformStr, scale, zoomTo, resetZoom }
}
