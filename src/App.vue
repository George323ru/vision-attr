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
    <div class="main-grid" :class="{ 'panel-collapsed': rightPanelCollapsed }">
      <GraphZone ref="graphZoneRef" />
      <button class="collapse-toggle" @click="rightPanelCollapsed = !rightPanelCollapsed" :title="rightPanelCollapsed ? 'Показать панель' : 'Скрыть панель'" :aria-label="rightPanelCollapsed ? 'Показать панель' : 'Скрыть панель'">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path v-if="rightPanelCollapsed" d="M4 1l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path v-else d="M8 1L3 6l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <RightPanel
        @select-situation="onSelectSituation"
        @show-all-situations="onShowAllSituations"
        @back-to-attractor="onBackToAttractor"
        @focus-node="onFocusNode"
        @age-change="onAgeChange"
        @close-panel="onClosePanel"
        @go-back="onGoBack"
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import GraphZone from '@/components/GraphZone.vue'
import RightPanel from '@/components/RightPanel.vue'
import VisualSettingsPanel from '@/components/VisualSettingsPanel.vue'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useAppState } from '@/composables/useAppState'
import { useMarkupStore } from '@/composables/useMarkupStore'

const { loadData, getAttractor } = useAttractorStore()
const { loadMarkupData } = useMarkupStore()
const {
  midAge,
  correlationsVisible,
  currentFocus,
  currentSituation,
  currentMode,
  currentStrategy,
  expansionMode,
  l3NodeId,
  selectedAttractors,
  activeSelectedIds,
  highlightedAttractorIdx,
  rightPanelCollapsed,
  addToSelectedAttractors,
  pushNavState,
  popNavState,
  applyNavEntry,
  canGoBack,
} = useAppState()

const loading = ref(true)
const graphZoneRef = ref<InstanceType<typeof GraphZone> | null>(null)
const backSnapshot = ref<{ l1: string[]; l2: string[] } | null>(null)
const settingsPanelVisible = ref(false)
const situationsSnapshot = ref<{ l1: string[]; l2: string[] } | null>(null)

function getNetwork() {
  return graphZoneRef.value?.networkRef
}

function applyHighlightFromState() {
  const net = getNetwork()
  if (!net) return
  const ids = activeSelectedIds.value
  if (ids.size === 0) {
    net.clearDropdownHighlight()
    return
  }
  const idx = highlightedAttractorIdx.value
  const corrSourceId = (idx !== null ? selectedAttractors.value[idx] : null) ?? null
  net.applyDropdownHighlight(ids, corrSourceId)
}

onMounted(async () => {
  await Promise.all([loadData(), loadMarkupData()])
  loading.value = false

  await nextTick()

  const net = getNetwork()
  if (!net) return

  net.onSelectNode((nodeId: string, level: number) => {
    pushNavState()
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
      addToSelectedAttractors(nodeId)
      if (!currentSituation.value) {
        showAttractorPanel(nodeId)
      } else {
        currentFocus.value = nodeId
      }
    } else if (level === 3) {
      currentSituation.value = null
      currentStrategy.value = null
      l3NodeId.value = nodeId
      setTimeout(() => net.unselectAll(), 0)
    }
  })

  net.onClickEmpty(() => {
    const prev = popNavState()
    if (prev) {
      net.clearFocusVisualsPreserveVisibility()
      applyNavEntry(prev)
      applyHighlightFromState()
    } else {
      net.clearFocusVisualsPreserveVisibility()
      if (backSnapshot.value) {
        net.restoreExpansionState(backSnapshot.value)
        backSnapshot.value = null
      }
      resetRightPanel()
      applyHighlightFromState()
    }
  })

  // Дефолтный визуал при загрузке
  expansionMode.value = 'allL3'
  net.expandAllL3()
  net.updateVisibleCorrelations()
  applyHighlightFromState()
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
  applyHighlightFromState()
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
  pushNavState()
  const net = getNetwork()
  if (net) situationsSnapshot.value = net.snapshotExpansionState()
  currentMode.value = 'situations'
  currentSituation.value = null
  currentStrategy.value = null
  l3NodeId.value = null
  net?.resetGraphVisuals()
  applyHighlightFromState()
}

function onSelectSituation(attrId: string, sitId: string) {
  pushNavState()
  const net = getNetwork()
  if (net) {
    backSnapshot.value = net.snapshotExpansionState()
    // Подсветить связанный L2 на графе
    const l2 = getAttractor(attrId)
    if (l2?.parent) {
      net.toggleL1(l2.parent)
      net.toggleL2(attrId)
    }
    addToSelectedAttractors(attrId)
  }
  currentSituation.value = { attrId, sitId }
  currentStrategy.value = null
}

function onBackToAttractor(attrId: string) {
  if (currentMode.value === 'situations') {
    onShowAllSituations()
  } else {
    const net = getNetwork()
    net?.clearGraphFocus()
    applyHighlightFromState()
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

  applyHighlightFromState()
}

function onGoBack() {
  const prev = popNavState()
  if (prev) {
    const net = getNetwork()
    net?.clearFocusVisualsPreserveVisibility()
    applyNavEntry(prev)
    applyHighlightFromState()
  }
}

function onClosePanel() {
  const net = getNetwork()
  if (net) {
    net.clearFocusVisualsPreserveVisibility()
    if (backSnapshot.value) {
      net.restoreExpansionState(backSnapshot.value)
      backSnapshot.value = null
    }
    applyHighlightFromState()
  }
  resetRightPanel()
}

function onAgeChange() {
  const net = getNetwork()
  if (activeSelectedIds.value.size > 0) {
    applyHighlightFromState()
  } else {
    const count = net?.updateCorrelationsForAge(midAge.value)
    if (count !== undefined) graphZoneRef.value?.setFocusCount(count)
  }
}

// Единый watcher: dropdown-выбор + переключение кнопки корреляций
// Объединены чтобы избежать race condition при одновременном срабатывании
watch(
  [selectedAttractors, highlightedAttractorIdx],
  () => {
    if (loading.value) return
    const net = getNetwork()
    if (!net) return
    if (activeSelectedIds.value.size > 0) {
      net.clearGraphFocus()
      currentFocus.value = null
      currentSituation.value = null
      l3NodeId.value = null
      applyHighlightFromState()
    } else {
      net.clearDropdownHighlight()
    }
  },
  { deep: true },
)

// Перерисовка графа при сворачивании/разворачивании панели
watch(rightPanelCollapsed, () => {
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 370)
})
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
  position: relative;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr var(--right-panel-width, 456px);
  overflow: hidden;
  transition: grid-template-columns 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.main-grid.panel-collapsed {
  grid-template-columns: 1fr 0px;
}
.collapse-toggle {
  position: absolute;
  right: var(--right-panel-width, 456px);
  top: 50%;
  transform: translate(50%, -50%);
  z-index: 20;
  width: 28px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--right-bg);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.2s, background 0.2s, right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -2px 0 6px rgba(0,0,0,0.06);
}
.panel-collapsed .collapse-toggle {
  right: 0px;
}
.collapse-toggle:hover {
  color: var(--accent);
  background: var(--card-hover);
}
</style>
