<template>
  <Teleport to="body">
    <div v-if="visible" class="vsp-backdrop" @click.self="close" />
    <div v-if="visible" class="vsp-panel">
      <div class="vsp-header">
        <span>Настройки графа</span>
        <button class="vsp-close" @click="close">&times;</button>
      </div>

      <div class="vsp-body">

        <!-- Размеры нод -->
        <section class="vsp-section">
          <h3 class="vsp-section-title">Размеры нод</h3>
          <div class="vsp-row">
            <label class="vsp-label">Ур. 1 <span class="vsp-val">{{ nodeSizeL1 }}</span></label>
            <input type="range" v-model.number="nodeSizeL1" min="50" max="400" step="5" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Ур. 2 <span class="vsp-val">{{ nodeSizeL2 }}</span></label>
            <input type="range" v-model.number="nodeSizeL2" min="20" max="200" step="5" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Ур. 3 <span class="vsp-val">{{ nodeSizeL3 }}</span></label>
            <input type="range" v-model.number="nodeSizeL3" min="10" max="100" step="2" class="vsp-slider" @change="apply" />
          </div>
        </section>

        <!-- Размеры шрифтов -->
        <section class="vsp-section">
          <h3 class="vsp-section-title">Шрифты</h3>
          <div class="vsp-row">
            <label class="vsp-label">Ур. 1 <span class="vsp-val">{{ fontSizeL1 }}</span></label>
            <input type="range" v-model.number="fontSizeL1" min="30" max="120" step="2" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Ур. 2 <span class="vsp-val">{{ fontSizeL2 }}</span></label>
            <input type="range" v-model.number="fontSizeL2" min="20" max="90" step="2" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Ур. 3 <span class="vsp-val">{{ fontSizeL3 }}</span></label>
            <input type="range" v-model.number="fontSizeL3" min="15" max="70" step="2" class="vsp-slider" @change="apply" />
          </div>
        </section>

        <!-- Корреляционные рёбра -->
        <section class="vsp-section">
          <h3 class="vsp-section-title">Рёбра корреляций</h3>
          <div class="vsp-row">
            <label class="vsp-label">Усиливающие</label>
            <input type="color" v-model="corrReinforcingColor" class="vsp-color" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Конфликтующие</label>
            <input type="color" v-model="corrConflictingColor" class="vsp-color" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Нейтральные</label>
            <input type="color" v-model="corrDefaultColor" class="vsp-color" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Прозрачность нейтр. <span class="vsp-val">{{ Math.round(corrDefaultOpacity * 100) }}%</span></label>
            <input type="range" v-model.number="corrDefaultOpacity" min="0.05" max="1" step="0.05" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Толщина (default) <span class="vsp-val">{{ corrDefaultWidth }}</span></label>
            <input type="range" v-model.number="corrDefaultWidth" min="1" max="15" step="0.5" class="vsp-slider" @change="apply" />
          </div>
        </section>

        <!-- Иерархические рёбра -->
        <section class="vsp-section">
          <h3 class="vsp-section-title">Иерархические рёбра</h3>
          <div class="vsp-row">
            <label class="vsp-label">Цвет</label>
            <input type="color" v-model="hierEdgeColor" class="vsp-color" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Прозрачность <span class="vsp-val">{{ Math.round(hierEdgeOpacity * 100) }}%</span></label>
            <input type="range" v-model.number="hierEdgeOpacity" min="0.05" max="1" step="0.05" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Толщина 1–2 <span class="vsp-val">{{ hierWidthL12 }}</span></label>
            <input type="range" v-model.number="hierWidthL12" min="1" max="20" step="0.5" class="vsp-slider" @change="apply" />
          </div>
          <div class="vsp-row">
            <label class="vsp-label">Толщина 2–3 <span class="vsp-val">{{ hierWidthL23 }}</span></label>
            <input type="range" v-model.number="hierWidthL23" min="1" max="15" step="0.5" class="vsp-slider" @change="apply" />
          </div>
        </section>

      </div>

      <div class="vsp-footer">
        <button class="vsp-reset" @click="reset">Сбросить</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useVisualSettings } from '@/composables/useVisualSettings'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const {
  nodeSizeL1, nodeSizeL2, nodeSizeL3,
  fontSizeL1, fontSizeL2, fontSizeL3,
  corrReinforcingColor, corrConflictingColor, corrDefaultColor,
  corrDefaultOpacity, corrDefaultWidth,
  hierEdgeColor, hierEdgeOpacity, hierWidthL12, hierWidthL23,
  applySettings, resetToDefaults,
} = useVisualSettings()

function apply() { applySettings() }
function reset() { resetToDefaults() }
function close() { emit('close') }
</script>

<style scoped>
.vsp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}
.vsp-panel {
  position: fixed;
  top: 48px;
  left: 0;
  bottom: 0;
  width: 260px;
  z-index: 1000;
  background: var(--right-bg, rgba(255,255,255,0.97));
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 16px rgba(0,0,0,0.08);
}
.vsp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  flex-shrink: 0;
}
.vsp-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.15s;
}
.vsp-close:hover { color: var(--text); }

.vsp-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.vsp-body::-webkit-scrollbar { width: 3px; }
.vsp-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.vsp-section {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}
.vsp-section:last-child { border-bottom: none; }

.vsp-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
}

.vsp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.vsp-row:last-child { margin-bottom: 0; }

.vsp-label {
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vsp-val {
  color: var(--text-muted);
  margin-left: 4px;
}
.vsp-slider {
  width: 90px;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.vsp-color {
  width: 32px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

.vsp-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.vsp-reset {
  width: 100%;
  padding: 6px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.vsp-reset:hover {
  background: var(--card-hover);
  color: var(--text);
}
</style>
