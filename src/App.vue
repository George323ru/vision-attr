<template>
  <div v-if="loading" class="app-loading">Загрузка данных…</div>
  <template v-else>
    <AppHeader
      @toggle-situations="onToggleSituations"
      @toggle-correlations="onToggleCorrelations"
      @change-expansion-mode="onChangeExpansionMode"
      @toggle-settings="settingsPanelVisible = !settingsPanelVisible"
    />
    <VisualSettingsPanel :visible="settingsPanelVisible" @close="settingsPanelVisible = false" />
    <div class="main-grid">
      <GraphZone ref="graphZoneRef" />
      <RightPanel
        @select-situation="onSelectSituation"
        @show-all-situations="onShowAllSituations"
        @back-to-attractor="onBackToAttractor"
        @focus-node="onFocusNode"
        @age-change="onAgeChange"
        @close-panel="onClosePanel"
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import GraphZone from '@/components/GraphZone.vue'
import RightPanel from '@/components/RightPanel.vue'
import VisualSettingsPanel from '@/components/VisualSettingsPanel.vue'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useAppState } from '@/composables/useAppState'

const { loadData } = useAttractorStore()
const {
  midAge,
  correlationsVisible,
  currentFocus,
  currentSituation,
  currentMode,
  currentStrategy,
  expansionMode,
  l3NodeId,
} = useAppState()

const loading = ref(true)
const graphZoneRef = ref<InstanceType<typeof GraphZone> | null>(null)
const backSnapshot = ref<{ l1: string[]; l2: string[] } | null>(null)
const settingsPanelVisible = ref(false)
const situationsSnapshot = ref<{ l1: string[]; l2: string[] } | null>(null)

function getNetwork() {
  return graphZoneRef.value?.networkRef
}

onMounted(async () => {
  await loadData()
  loading.value = false

  await nextTick()

  const net = getNetwork()
  if (!net) return

  net.onSelectNode((nodeId: string, level: number) => {
    l3NodeId.value = null

    if (level === 1) {
      currentMode.value = 'graph'
      currentStrategy.value = null
      net.clearGraphFocus()
      net.toggleL1(nodeId)
      currentFocus.value = nodeId
      showAttractorPanel(nodeId)
    } else if (level === 2) {
      currentMode.value = 'graph'
      currentStrategy.value = null
      net.toggleL2(nodeId)
      backSnapshot.value = net.snapshotExpansionState()
      const result = net.addFocusNode(nodeId)
      if (result) graphZoneRef.value?.setFocusCount(result.correlated)
      if (!currentSituation.value) {
        showAttractorPanel(nodeId)
      } else {
        currentFocus.value = nodeId
      }
    } else if (level === 3) {
      l3NodeId.value = nodeId
      setTimeout(() => net.unselectAll(), 0)
    }
  })

  net.onClickEmpty(() => {
    l3NodeId.value = null
    if (currentFocus.value || currentSituation.value) {
      net.clearFocusVisualsPreserveVisibility()
      if (backSnapshot.value) {
        net.restoreExpansionState(backSnapshot.value)
        backSnapshot.value = null
      }
    } else {
      onResetDefault()
    }
  })
})

function showAttractorPanel(nodeId: string) {
  currentSituation.value = null
  currentFocus.value = nodeId
}

function resetRightPanel() {
  currentFocus.value = null
  currentSituation.value = null
  currentStrategy.value = null
  l3NodeId.value = null
}

function onResetDefault() {
  currentMode.value = 'graph'
  expansionMode.value = 'click'
  l3NodeId.value = null
  const net = getNetwork()
  net?.collapseAllL2()
  net?.resetGraphVisuals()
  resetRightPanel()
}

function onToggleSituations() {
  if (currentMode.value === 'situations') {
    const net = getNetwork()
    currentMode.value = 'graph'
    currentSituation.value = null
    currentStrategy.value = null
    l3NodeId.value = null
    net?.clearGraphFocus()
    resetRightPanel()
    if (situationsSnapshot.value && net) {
      net.restoreExpansionState(situationsSnapshot.value)
      situationsSnapshot.value = null
    }
  } else {
    onShowAllSituations()
  }
}

function onShowAllSituations() {
  const net = getNetwork()
  if (net) situationsSnapshot.value = net.snapshotExpansionState()
  currentMode.value = 'situations'
  currentSituation.value = null
  currentStrategy.value = null
  l3NodeId.value = null
  net?.resetGraphVisuals()
}

function onSelectSituation(attrId: string, sitId: string) {
  const net = getNetwork()
  if (net) backSnapshot.value = net.snapshotExpansionState()
  // Граф не затемняется при выборе ситуации — пользователь продолжает кликать аттракторы
  currentSituation.value = { attrId, sitId }
  currentStrategy.value = null
}

function onBackToAttractor(attrId: string) {
  if (currentMode.value === 'situations') {
    onShowAllSituations()
  } else {
    const net = getNetwork()
    net?.clearGraphFocus()
    currentSituation.value = null
    currentStrategy.value = null
    currentFocus.value = attrId
  }
}

function onFocusNode(nodeId: string) {
  const net = getNetwork()
  if (net) backSnapshot.value = net.snapshotExpansionState()
  const result = net?.applyFocus(nodeId)
  if (result) graphZoneRef.value?.setFocusCount(result.correlated)
  l3NodeId.value = null
}

function onToggleCorrelations() {
  const net = getNetwork()
  if (!net) return
  correlationsVisible.value = !correlationsVisible.value
  if (correlationsVisible.value) {
    net.updateVisibleCorrelations()
  } else {
    net.hideAllCorrelations()
  }
}

function onChangeExpansionMode(mode: 'click' | 'allL2' | 'allL3') {
  const net = getNetwork()
  if (!net) return

  expansionMode.value = mode
  net.resetGraphVisuals()
  resetRightPanel()
  backSnapshot.value = null

  if (mode === 'allL2') net.expandAllL2()
  else if (mode === 'allL3') net.expandAllL3()
}

function onClosePanel() {
  const net = getNetwork()
  if (net) {
    net.clearFocusVisualsPreserveVisibility()
    if (backSnapshot.value) {
      net.restoreExpansionState(backSnapshot.value)
      backSnapshot.value = null
    }
  }
  resetRightPanel()
}

function onAgeChange() {
  const net = getNetwork()
  const count = net?.updateCorrelationsForAge(midAge.value)
  if (count !== undefined) graphZoneRef.value?.setFocusCount(count)
}
</script>

<style scoped>
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--text-muted);
  font-size: 16px;
}
.main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 380px;
  overflow: hidden;
}
</style>
