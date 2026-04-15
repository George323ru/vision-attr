<template>
  <div v-if="loading" class="app-loading">Loading data...</div>
  <template v-else>
    <AppHeader />
    <main class="main-content">
      <ScenarioView v-if="currentView === 'scenarios'" />
      <GraphView v-else />
    </main>
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ScenarioView from '@/views/ScenarioView.vue'
import GraphView from '@/views/GraphView.vue'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useStore } from '@/composables/state/useStore'

const { loadData } = useAttractorStore()
const { loadMarkupData } = useMarkupStore()
const { currentView } = useStore()

const loading = ref(true)

onMounted(async () => {
  await Promise.all([loadData(), loadMarkupData()])
  loading.value = false
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
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
