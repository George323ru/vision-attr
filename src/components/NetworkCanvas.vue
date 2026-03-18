<template>
  <div ref="containerRef" class="network-canvas"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNetwork } from '@/composables/useNetwork'

const containerRef = ref<HTMLElement | null>(null)
const networkApi = useNetwork(containerRef)

defineExpose({
  applyFocus: networkApi.applyFocus,
  addFocusNode: networkApi.addFocusNode,
  resetGraphVisuals: networkApi.resetGraphVisuals,
  clearFocusVisualsPreserveVisibility: networkApi.clearFocusVisualsPreserveVisibility,
  clearGraphFocus: networkApi.clearGraphFocus,
  toggleL1: networkApi.toggleL1,
  toggleL2: networkApi.toggleL2,
  expandL1: networkApi.expandL1,
  expandAllL2: networkApi.expandAllL2,
  expandAllL3: networkApi.expandAllL3,
  collapseAllL2: networkApi.collapseAllL2,
  resetExpansionState: networkApi.resetExpansionState,
  snapshotExpansionState: networkApi.snapshotExpansionState,
  restoreExpansionState: networkApi.restoreExpansionState,
  updateCorrelationsForAge: networkApi.updateCorrelationsForAge,
  getNodeData: networkApi.getNodeData,
  unselectAll: networkApi.unselectAll,
  updateVisibleCorrelations: networkApi.updateVisibleCorrelations,
  hideAllCorrelations: networkApi.hideAllCorrelations,
  applyDropdownHighlight: networkApi.applyDropdownHighlight,
  clearDropdownHighlight: networkApi.clearDropdownHighlight,
  onSelectNode: networkApi.onSelectNode,
  onClickEmpty: networkApi.onClickEmpty,
})
</script>

<style scoped>
.network-canvas { width: 100%; height: 100%; }
</style>
