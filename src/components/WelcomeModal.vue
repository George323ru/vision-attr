<template>
  <Teleport to="body">
    <div v-if="visible" class="wm-overlay" @click.self="onSkip">
      <div class="wm-card" role="dialog" aria-modal="true" aria-labelledby="wm-title">
        <div class="wm-logo">LOGOS</div>
        <h2 id="wm-title" class="wm-title">Добро пожаловать</h2>
        <p class="wm-subtitle">BI-инструмент для анализа жизненных аттракторов</p>

        <div class="wm-modes">
          <div class="wm-mode">
            <div class="wm-mode-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div>
              <div class="wm-mode-name">Анализ</div>
              <div class="wm-mode-desc">100 жизненных ситуаций с предиктивными прогнозами поведения по реальным данным интервью</div>
            </div>
          </div>
          <div class="wm-mode">
            <div class="wm-mode-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="5" cy="19" r="2"/>
                <circle cx="19" cy="19" r="2"/>
                <line x1="12" y1="7" x2="5" y2="17"/>
                <line x1="12" y1="7" x2="19" y2="17"/>
              </svg>
            </div>
            <div>
              <div class="wm-mode-name">Граф</div>
              <div class="wm-mode-desc">Визуальная иерархия аттракторов трёх уровней с корреляционным анализом</div>
            </div>
          </div>
        </div>

        <div class="wm-actions">
          <button class="wm-btn-primary" @click="onStartTour">Начать тур</button>
          <button class="wm-btn-secondary" @click="onSkip">Пропустить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCoachMarks } from '@/composables/useCoachMarks'

const emit = defineEmits<{
  'start-tour': []
  'skip': []
}>()

const { welcomeSeen } = useCoachMarks()

const visible = computed(() => !welcomeSeen.value)

function onStartTour() {
  emit('start-tour')
}

function onSkip() {
  emit('skip')
}
</script>

<style scoped>
.wm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: overlay-in var(--duration-base) var(--ease-out-quad);
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wm-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 44px;
  max-width: 440px;
  width: calc(100% - 32px);
  box-shadow: var(--shadow-lg);
  animation: card-in var(--duration-base) var(--ease-out-expo);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: left;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

.wm-logo {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  opacity: 0.8;
}

.wm-title {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0;
  margin-bottom: 6px;
}

.wm-subtitle {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  margin-bottom: 28px;
  line-height: 1.5;
}

.wm-modes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-bottom: 28px;
}

.wm-mode {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  text-align: left;
}

.wm-mode-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-subtle, rgba(138,98,40,0.1));
  border-radius: var(--radius-md);
  color: var(--accent);
}

.wm-mode-name {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}

.wm-mode-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.5;
}

.wm-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.wm-btn-primary {
  width: 100%;
  padding: 13px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: var(--fs-sm);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0;
  transition: filter var(--duration-fast) var(--ease-out-quad),
              box-shadow var(--duration-fast),
              transform var(--duration-fast);
  box-shadow: 0 2px 8px rgba(var(--accent-rgb),0.26);
}

.wm-btn-primary:hover {
  filter: brightness(1.07);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(var(--accent-rgb),0.32);
}

.wm-btn-primary:active {
  transform: translateY(0);
}

.wm-btn-secondary {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: var(--fs-sm);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-quad),
              color var(--duration-fast);
}

.wm-btn-secondary:hover {
  background: var(--card-hover);
  color: var(--text);
}

@media (max-width: 480px) {
  .wm-card {
    padding: 28px 20px;
    border-radius: 16px;
  }
}
</style>
