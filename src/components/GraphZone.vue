<template>
  <div class="graph-zone">
    <NetworkCanvas ref="networkRef" />
    <GraphLegend />
    <FocusPanel
      :visible="focusVisible"
      :name="focusName"
      :count="focusCount"
    />
    <CoachMark
      id="cm-graph"
      text="Кликните на любой узел для анализа"
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

const { currentFocus } = useAppState()
const { getAttractor } = useAttractorStore()

const focusVisible = computed(() => currentFocus.value !== null)
const focusName = computed(() => {
  if (!currentFocus.value) return ''
  const attr = getAttractor(currentFocus.value)
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
.graph-coach {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
