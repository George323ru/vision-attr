import type { Ref } from 'vue'
import type { Effect } from './state/types'
import type { D3ZoomApi } from './useD3Zoom'
import type { NodePosition } from './useGraphLayout'

export interface GraphEffectsApi {
  execute(effects: readonly Effect[]): void
}

export function useGraphEffects(
  expandedNodes: Ref<Set<string>>,
  hoveredNodeId: Ref<string | null>,
  d3Zoom: D3ZoomApi,
  positionsMap: Ref<Map<string, NodePosition>>,
): GraphEffectsApi {

  function execute(effects: readonly Effect[]): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'EXPAND_NODE': {
          const next = new Set(expandedNodes.value)
          if (next.has(effect.nodeId)) {
            // Toggle: collapse если уже раскрыт
            next.delete(effect.nodeId)
          } else {
            next.add(effect.nodeId)
          }
          expandedNodes.value = next
          break
        }

        case 'COLLAPSE_NODE': {
          const next = new Set(expandedNodes.value)
          next.delete(effect.nodeId)
          expandedNodes.value = next
          break
        }

        case 'ZOOM_TO_FIT': {
          const positions: NodePosition[] = []
          for (const id of effect.nodeIds) {
            const pos = positionsMap.value.get(id)
            if (pos) positions.push(pos)
          }
          if (positions.length > 0) {
            d3Zoom.zoomTo(positions)
          }
          break
        }

        case 'HOVER_VISUAL': {
          hoveredNodeId.value = effect.nodeId
          break
        }

        case 'ANIMATE_EXPAND': {
          const next = new Set(expandedNodes.value)
          next.add(effect.parentId)
          expandedNodes.value = next
          break
        }

        case 'ANIMATE_COLLAPSE': {
          const next = new Set(expandedNodes.value)
          next.delete(effect.parentId)
          expandedNodes.value = next
          break
        }

        // HIGHLIGHT_NODE, CLEAR_HIGHLIGHT, SHOW_CORRELATIONS, HIDE_CORRELATIONS
        // обрабатываются через reactive state в store (focusedNodeId computed)
        // — не нужен императивный effect
        case 'HIGHLIGHT_NODE':
        case 'CLEAR_HIGHLIGHT':
        case 'SHOW_CORRELATIONS':
        case 'HIDE_CORRELATIONS':
          break
      }
    }
  }

  return { execute }
}
