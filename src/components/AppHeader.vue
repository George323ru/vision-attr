<template>
  <header class="app-header">
    <h1>LOGOS</h1>
    <div class="header-right">
      <div class="mode-group">
        <button
          class="mode-btn"
          :class="{ active: currentView === 'scenarios' }"
          @click="dispatch({ type: 'SWITCH_VIEW', view: 'scenarios' })"
        >Analyse</button>
        <button
          class="mode-btn"
          :class="{ active: currentView === 'graph' }"
          @click="dispatch({ type: 'SWITCH_VIEW', view: 'graph' })"
        >Graph</button>
      </div>
      <span class="version">v3.0</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useStore } from '@/composables/state/useStore'

const { currentView, dispatch } = useStore()
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: background 0.3s;
}
.app-header h1 {
  font-family: var(--font-display);
  font-size: var(--fs-brand);
  font-weight: 700;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: #111;
  opacity: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
@media (max-width: 1024px) {
  .header-right { gap: 8px; }
  .app-header { padding: 10px 16px; }
}
.header-right .version {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

.mode-group {
  display: flex;
  gap: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px;
}
.mode-btn {
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.mode-btn:hover {
  background: var(--card-hover);
  color: var(--text);
}
.mode-btn.active {
  background: var(--accent);
  color: #fff;
}
</style>
