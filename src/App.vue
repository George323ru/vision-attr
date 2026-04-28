<template>
  <div v-if="loading" class="app-loading">Загрузка данных…</div>
  <template v-else>
    <AppHeader />
    <main class="main-content">
      <Transition name="view-fade" mode="out-in">
        <ScenarioView v-if="currentView === 'scenarios'" key="scenarios" />
        <GraphView v-else key="graph" />
      </Transition>
    </main>

    <WelcomeModal @start-tour="onWelcomeStartTour" @skip="onWelcomeSkip" />
    <OnboardingTour @tour-ended="onTourEnded" />
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ScenarioView from '@/views/ScenarioView.vue'
import GraphView from '@/views/GraphView.vue'
import WelcomeModal from '@/components/WelcomeModal.vue'
import OnboardingTour from '@/components/OnboardingTour.vue'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useCorrelationStore } from '@/composables/useCorrelationStore'
import { useSituationStore } from '@/composables/useSituationStore'
import { useStore } from '@/composables/state/useStore'
import { useCoachMarks } from '@/composables/useCoachMarks'

const { loadData } = useAttractorStore()
const { loadMarkupData } = useMarkupStore()
const { loadCorrelations } = useCorrelationStore()
const { loadRegistry } = useSituationStore()
const { currentView, dispatch } = useStore()
const { markWelcomeSeen, startTour, isTourDone } = useCoachMarks()

const loading = ref(true)

onMounted(async () => {
  await Promise.all([loadData(), loadMarkupData(), loadCorrelations(), loadRegistry()])
  loading.value = false
})

function onWelcomeStartTour() {
  markWelcomeSeen()
  startTour('scenarios')
}

function onWelcomeSkip() {
  markWelcomeSeen()
}

function onTourEnded() {
  // После тура Анализ — предложить тур Граф автоматически не нужно;
  // пользователь может запустить его через «?»
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
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* View transition */
.view-fade-enter-active { transition: opacity var(--duration-base) var(--ease-out-quad); }
.view-fade-leave-active { transition: opacity var(--duration-fast) ease-in; }
.view-fade-enter-from,
.view-fade-leave-to { opacity: 0; }
</style>
