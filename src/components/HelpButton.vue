<template>
  <div class="help-wrap" ref="wrapRef">
    <button
      class="help-btn"
      aria-label="Помощь и обучение"
      :aria-expanded="menuOpen"
      @click="toggleMenu"
    >?</button>
    <Teleport to="body">
      <div
        v-if="menuOpen"
        class="help-menu"
        :style="menuStyle"
        @click.stop
      >
        <button class="hm-item" @click="onStartScenariosTour">
          <span class="hm-icon">▶</span>
          Тур: режим Анализ
        </button>
        <button class="hm-item" @click="onStartGraphTour">
          <span class="hm-icon">▶</span>
          Тур: режим Граф
        </button>
        <div class="hm-divider"/>
        <button class="hm-item hm-reset" @click="onReset">
          <span class="hm-icon">↺</span>
          Сбросить подсказки
        </button>
      </div>
    </Teleport>
    <div v-if="menuOpen" class="help-backdrop" @click="closeMenu"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useCoachMarks } from '@/composables/useCoachMarks'

const emit = defineEmits<{
  'start-tour': [flow: 'scenarios' | 'graph']
}>()

const { resetAll, startTour } = useCoachMarks()

const wrapRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuPos = ref<{ top: number; right: number } | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value && wrapRef.value) {
    const rect = wrapRef.value.getBoundingClientRect()
    menuPos.value = {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    }
  }
}

function closeMenu() {
  menuOpen.value = false
}

const menuStyle = computed(() => {
  if (!menuPos.value) return {}
  return {
    top: `${menuPos.value.top}px`,
    right: `${menuPos.value.right}px`,
  }
})

function onStartScenariosTour() {
  closeMenu()
  startTour('scenarios')
  emit('start-tour', 'scenarios')
}

function onStartGraphTour() {
  closeMenu()
  startTour('graph')
  emit('start-tour', 'graph')
}

function onReset() {
  resetAll()
  closeMenu()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

window.addEventListener('keydown', onKey)
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.help-wrap {
  position: relative;
}

.help-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--duration-fast), border-color var(--duration-fast),
              background var(--duration-fast);
  line-height: 1;
}

.help-btn:hover,
.help-btn[aria-expanded="true"] {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-subtle, rgba(192,138,62,0.08));
}

.help-backdrop {
  position: fixed;
  inset: 0;
  z-index: 990;
}

.help-menu {
  position: fixed;
  z-index: 995;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 6px;
  min-width: 200px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  animation: menu-in 120ms var(--ease-out-expo);
}

@keyframes menu-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

.hm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  transition: background var(--duration-fast);
}

.hm-item:hover {
  background: var(--card-hover);
}

.hm-icon {
  font-size: 10px;
  color: var(--accent);
  flex-shrink: 0;
  width: 12px;
}

.hm-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 6px;
}

.hm-reset {
  color: var(--text-muted);
}

.hm-reset:hover {
  color: var(--text);
}
</style>
