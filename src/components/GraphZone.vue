<template>
  <div class="graph-zone">
    <NetworkCanvas ref="networkRef" />
    <Transition name="fade">
      <div v-if="!graphIsReady" class="graph-loading-overlay">
        <div class="graph-spinner" />
        <span>Построение графа…</span>
      </div>
    </Transition>
    <GraphLegend />
    <FocusPanel
      :visible="focusVisible"
      :name="focusName"
      :count="focusCount"
    />
    <CoachMark
      v-if="currentMode === 'graph'"
      id="cm-graph"
      text="Кликните на любой узел для анализа"
      position="bottom"
      class="graph-coach"
    />
    <CoachMark
      v-if="currentMode === 'correlations'"
      id="cm-correlations"
      text="Кликните на аттрактор второго уровня, чтобы увидеть его корреляции"
      position="bottom"
      class="graph-coach"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import NetworkCanvas from './NetworkCanvas.vue'
import GraphLegend from './GraphLegend.vue'
import FocusPanel from './FocusPanel.vue'
import CoachMark from './CoachMark.vue'
import { useAppState } from '@/composables/useAppState'
import { useAttractorStore } from '@/composables/useAttractorStore'

const networkRef = ref<InstanceType<typeof NetworkCanvas> | null>(null)

const { currentFocus, currentMode, correlationFocusId } = useAppState()
const { getAttractor } = useAttractorStore()

const graphIsReady = computed(() => networkRef.value?.graphReady ?? false)

const focusVisible = computed(() => {
  if (currentMode.value === 'situations') return false
  if (currentMode.value === 'correlations') return correlationFocusId.value !== null
  return currentFocus.value !== null
})

const focusName = computed(() => {
  const id = currentMode.value === 'correlations'
    ? correlationFocusId.value
    : currentFocus.value
  if (!id) return ''
  const attr = getAttractor(id)
  return attr?.label?.replace(/\n/g, ' ') ?? ''
})
const focusCount = ref(0)

function setFocusCount(count: number) {
  focusCount.value = count
}

defineExpose({
  networkRef,
  setFocusCount,
})
</script>

<style scoped>
.graph-zone {
  position: relative;
  overflow: hidden;
}
.graph-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--bg, #fff);
  color: var(--text-muted);
  font-size: 14px;
}
.graph-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border, #e0e0e0);
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.graph-coach {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
