<template>
  <div class="graph-layout">
    <div class="graph-area">
      <D3Graph />
      <GraphLegend />
      <div class="graph-mode-toggle">
        <button
          class="gm-btn"
          :class="{ active: graphMode === 'explore' }"
          @click="dispatch({ type: 'SET_GRAPH_MODE', mode: 'explore' })"
        >Обзор</button>
        <button
          class="gm-btn"
          :class="{ active: graphMode === 'correlations' }"
          @click="dispatch({ type: 'SET_GRAPH_MODE', mode: 'correlations' })"
        >Корреляции</button>
      </div>
    </div>
    <GraphSidebar class="graph-sidebar" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import D3Graph from '@/components/D3Graph.vue'
import GraphSidebar from '@/components/GraphSidebar.vue'
import GraphLegend from '@/components/GraphLegend.vue'
import { useStore } from '@/composables/state/useStore'

const { viewState, dispatch } = useStore()

const graphMode = computed(() =>
  viewState.value.view === 'graph' ? viewState.value.graphMode : 'explore'
)
</script>

<style scoped>
.graph-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr var(--sidebar-width, 360px);
  overflow: hidden;
}

.graph-area {
  position: relative;
  overflow: hidden;
}

.graph-sidebar {
  overflow-y: auto;
}

/* Переключатель режима графа */
.graph-mode-toggle {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  background: var(--legend-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px;
  z-index: 10;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.gm-btn {
  font-size: 11px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.4px;
  transition: background var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast);
  white-space: nowrap;
}
.gm-btn:hover {
  background: var(--card-hover);
  color: var(--text);
}
.gm-btn.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 1px 4px rgba(192,138,62,0.25);
}

@media (max-width: 1280px) {
  .graph-layout {
    --sidebar-width: 320px;
  }
}
@media (max-width: 1024px) {
  .graph-layout {
    --sidebar-width: 280px;
  }
}
</style>
