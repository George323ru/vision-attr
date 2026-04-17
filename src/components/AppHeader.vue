<template>
  <header class="app-header">
    <h1>LOGOS</h1>
    <div class="mode-group" role="tablist" aria-label="Переключатель режима">
      <button
        class="mode-btn"
        role="tab"
        :aria-selected="currentView === 'scenarios'"
        :class="{ active: currentView === 'scenarios' }"
        @click="dispatch({ type: 'SWITCH_VIEW', view: 'scenarios' })"
      >Анализ</button>
      <button
        class="mode-btn"
        role="tab"
        :aria-selected="currentView === 'graph'"
        :class="{ active: currentView === 'graph' }"
        @click="dispatch({ type: 'SWITCH_VIEW', view: 'graph' })"
      >Граф</button>
    </div>
    <span class="version">v3.0</span>
  </header>
</template>

<script setup lang="ts">
import { useStore } from '@/composables/state/useStore'

const { currentView, dispatch } = useStore()
</script>

<style scoped>
.app-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 28px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: background var(--duration-base) var(--ease-out-quad);
}
.app-header h1 {
  font-family: var(--font-display);
  font-size: var(--fs-brand);
  font-weight: 700;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: #111;
}

.version {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 1.5px;
  font-weight: 500;
}

/* Pill — главный навигационный элемент, центрирован абсолютно
   относительно header, чтобы LOGOS / version не сдвигали его. */
.mode-group {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;
  box-shadow: var(--shadow-sm);
}
.mode-btn {
  font-size: 13px;
  font-weight: 600;
  padding: 9px 26px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.4px;
  transition: background var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast),
              box-shadow var(--duration-fast);
  white-space: nowrap;
  font-family: inherit;
}
.mode-btn:hover {
  background: var(--card-hover);
  color: var(--text);
}
.mode-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.mode-btn.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 6px rgba(192,138,62,0.30);
}

@media (max-width: 1024px) {
  .app-header { padding: 10px 16px; }
  .mode-btn { font-size: 12px; padding: 8px 20px; }
}

/* Узкие экраны: возврат к компактной кнопке у правого края, чтобы
   LOGOS не наехал на pill. */
@media (max-width: 640px) {
  .mode-group {
    position: static;
    transform: none;
    padding: 2px;
    gap: 2px;
  }
  .mode-btn { font-size: 11px; padding: 6px 14px; }
  .version { display: none; }
}
</style>
