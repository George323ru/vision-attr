<template>
  <header class="app-header">
    <button
      class="brand-button"
      type="button"
      aria-label="LOGOS: вернуться к сценариям"
      @click="dispatch({ type: 'GO_HOME' })"
    >
      LOGOS
    </button>
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
    <div class="header-right">
      <HelpButton />
      <span class="version">v3.0</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useStore } from '@/composables/state/useStore'
import HelpButton from '@/components/HelpButton.vue'

const { currentView, dispatch } = useStore()
</script>

<style scoped>
.app-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 28px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: background var(--duration-base) var(--ease-out-quad);
}
.brand-button {
  font-family: var(--font-display);
  font-size: var(--fs-brand);
  font-weight: 700;
  letter-spacing: 5px;
  line-height: 1;
  text-transform: uppercase;
  color: var(--text);
  border: none;
  border-radius: 8px;
  background: transparent;
  margin: 0;
  padding: 8px 10px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast),
              transform var(--duration-fast);
}
.brand-button:hover {
  background: var(--card-hover);
  color: var(--accent);
}
.brand-button:active {
  transform: translateY(1px);
}
.brand-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
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
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px;
  box-shadow: var(--shadow-sm);
}
.mode-btn {
  font-size: 13px;
  font-weight: 500;
  padding: 8px 24px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0;
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
  background: var(--control-active);
  color: #fff;
  box-shadow: 0 1px 4px rgba(var(--control-active-rgb),0.18);
}

@media (max-width: 1024px) {
  .app-header { padding: 10px 16px; }
  .mode-btn { font-size: 12px; padding: 8px 20px; }
}

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
