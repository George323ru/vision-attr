<template>
  <header class="app-header">
    <h1>LOGOS</h1>
    <div class="header-right">
      <div class="expansion-group">
        <button
          class="header-btn-sm"
          :class="{ active: expansionMode === 'click' }"
          @click="$emit('change-expansion-mode', 'click')"
        >По клику</button>
        <button
          class="header-btn-sm"
          :class="{ active: expansionMode === 'allL2' }"
          @click="$emit('change-expansion-mode', 'allL2')"
        >Все 2 уровня</button>
        <button
          class="header-btn-sm"
          :class="{ active: expansionMode === 'allL3' }"
          @click="$emit('change-expansion-mode', 'allL3')"
        >Все 3 уровня</button>
      </div>
      <button
        class="header-btn"
        :class="{ active: correlationsVisible }"
        @click="$emit('toggle-correlations')"
      >Корреляции</button>
      <button
        class="header-btn"
        :class="{ active: currentMode === 'situations' }"
        @click="$emit('toggle-situations')"
      >Ситуации</button>
      <button class="settings-btn" title="Настройки графа" aria-label="Настройки графа" @click="$emit('toggle-settings')">⚙</button>
      <span class="version">v2.0</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAppState } from '@/composables/useAppState'

defineEmits<{
  'toggle-situations': []
  'toggle-correlations': []
  'change-expansion-mode': [mode: 'click' | 'allL2' | 'allL3']
  'toggle-settings': []
}>()

const { currentMode, correlationsVisible, expansionMode } = useAppState()
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
  .header-btn-sm { padding: 4px 8px; font-size: 10px; }
  .header-btn { padding: 5px 12px; font-size: 11px; }
}
.header-right .version {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 1px;
}
.settings-btn {
  font-size: 15px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  transition: color 0.2s;
  opacity: 0.6;
}
.settings-btn:hover {
  color: var(--text);
  opacity: 1;
}

.expansion-group {
  display: flex;
  gap: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px;
}

.header-btn-sm {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.header-btn-sm:hover {
  background: var(--card-hover);
  color: var(--text);
}
.header-btn-sm.active {
  background: var(--accent);
  color: #fff;
}

.header-btn {
  font-size: 12px;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  white-space: nowrap;
}
.header-btn:hover {
  background: var(--card-hover);
  color: var(--text);
  border-color: var(--accent);
}
.header-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  opacity: 1;
}
</style>
