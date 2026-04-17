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
          @click="onCorrelationsClick"
        >Корреляции</button>
      </div>

      <!-- Контекстная подсказка: первый вход в режим корреляций -->
      <div v-if="showCorrHint" class="ctx-hint-wrap">
        <CoachMark
          id="ctx-correlations-mode"
          text="Кликните по любому L2-аттрактору на графе, чтобы увидеть его связи с другими"
          position="bottom"
          @dismissed="showCorrHint = false"
        />
      </div>
    </div>
    <GraphSidebar class="graph-sidebar" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import D3Graph from '@/components/D3Graph.vue'
import GraphSidebar from '@/components/GraphSidebar.vue'
import GraphLegend from '@/components/GraphLegend.vue'
import CoachMark from '@/components/CoachMark.vue'
import { useStore } from '@/composables/state/useStore'
import { useCoachMarks } from '@/composables/useCoachMarks'

const { viewState, dispatch } = useStore()
const { isDismissed } = useCoachMarks()

const graphMode = computed(() =>
  viewState.value.view === 'graph' ? viewState.value.graphMode : 'explore'
)

const showCorrHint = ref(false)

function onCorrelationsClick() {
  dispatch({ type: 'SET_GRAPH_MODE', mode: 'correlations' })
  if (!isDismissed('ctx-correlations-mode')) {
    showCorrHint.value = true
  }
}

watch(graphMode, (mode) => {
  if (mode !== 'correlations') showCorrHint.value = false
})
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

.ctx-hint-wrap {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
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

@media (max-width: 768px) {
  .graph-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  .graph-sidebar {
    border-left: none;
    border-top: 1px solid var(--border);
    max-height: 40vh;
  }
  .graph-mode-toggle {
    top: 8px;
  }
}
</style>
