<template>
  <aside class="graph-sidebar">
    <!-- Контент зависит от panelRoute -->
    <div class="sidebar-panel">
      <Transition name="slide-fade" mode="out-in">
        <!-- Фокус на узле -->
        <AttractorPanel
          v-if="panelRoute === 'graph-attractor' && focusedNodeId"
          :key="focusedNodeId"
          :node-id="focusedNodeId"
        />

        <!-- Пустое состояние -->
        <div v-else key="empty" class="sidebar-empty">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          </div>
          <p class="empty-title">Выберите узел на графе</p>
          <p class="empty-hint">Кликните на аттрактор для просмотра деталей.<br>Двойной клик раскрывает/сворачивает дочерние.</p>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useStore } from '@/composables/state/useStore'
import AttractorPanel from '@/components/panels/AttractorPanel.vue'

const { panelRoute, focusedNodeId } = useStore()
</script>

<style scoped>
.graph-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border-left: 1px solid var(--border);
  overflow-y: auto;
  background: var(--right-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.sidebar-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 8px;
}

/* Пустое состояние */
.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 20px;
}
.empty-icon {
  color: var(--text-muted-soft);
  margin-bottom: 16px;
  opacity: 0.4;
}
.empty-title {
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}
.empty-hint {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

/* Transition */
.slide-fade-enter-active { transition: all var(--duration-base) var(--ease-out-expo); }
.slide-fade-leave-active { transition: all var(--duration-fast) ease-in; }
.slide-fade-enter-from { opacity: 0; transform: translateY(8px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
