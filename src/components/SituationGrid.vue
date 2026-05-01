<template>
  <div class="situation-grid">
    <Transition name="slide-fade" mode="out-in">
      <!-- Detail view -->
      <SituationDetail
        v-if="situationInfo"
        :key="situationInfo.sitId"
        :sit-id="situationInfo.sitId"
        :attr-id="situationInfo.attrId"
      />

      <!-- Grid view -->
      <div v-else class="grid-content">
        <div class="grid-header">
          <h2 class="grid-title">Жизненные ситуации</h2>
          <p class="grid-subtitle">
            {{ situationsWithData }} из {{ totalSituations }} ситуаций имеют аналитические данные
          </p>
        </div>

        <div
          v-for="category in groupedSituations"
          :key="category.id"
          class="category-group"
        >
          <div class="category-header">
            <h3 class="category-title">{{ category.title }}</h3>
            <span class="category-desc">{{ category.description }}</span>
          </div>
          <div class="cards">
            <SituationCard
              v-for="sit in category.situations"
              :key="sit.id"
              :situation="sit"
              :has-markup="hasMarkup(sit.id)"
              :relevant="isRelevant(sit)"
              @open="dispatch({ type: 'OPEN_SITUATION', sitId: sit.id, attrId: sit.attractorL2 })"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Situation } from '@/types/situation'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useSituationStore } from '@/composables/useSituationStore'
import { useStore } from '@/composables/state/useStore'
import SituationCard from '@/components/SituationCard.vue'
import SituationDetail from '@/components/SituationDetail.vue'

const { getMarkupForSituation } = useMarkupStore()
const { situations, categories } = useSituationStore()
const { profile, situationInfo, activeAttractorIds, dispatch } = useStore()

const totalSituations = computed(() => situations.value.length)

const situationsWithData = computed(() =>
  situations.value.filter(s => getMarkupForSituation(s.id) !== null).length
)

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}

function isRelevant(sit: Situation): boolean {
  return activeAttractorIds.value.has(sit.attractorL2)
}

const groupedSituations = computed(() => {
  return categories.value.map(cat => {
    const catSituations = situations.value.filter(s => s.category === cat.id)
    // Ситуации с данными и релевантные — наверх
    const sorted = [...catSituations].sort((a, b) => {
      const aData = hasMarkup(a.id) ? 1 : 0
      const bData = hasMarkup(b.id) ? 1 : 0
      const aRel = isRelevant(a) ? 1 : 0
      const bRel = isRelevant(b) ? 1 : 0
      return (bData + bRel) - (aData + aRel)
    })
    return { ...cat, situations: sorted }
  }).filter(cat => cat.situations.length > 0)
})
</script>

<style scoped>
.situation-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px 30px;
}

.grid-header {
  margin-bottom: 24px;
  position: relative;
}
.grid-title {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0;
  margin-bottom: 4px;
}
.grid-subtitle {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.category-group {
  margin-bottom: 26px;
}
.category-header {
  margin-bottom: 12px;
}
.category-title {
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--text);
  letter-spacing: 0;
  margin-bottom: 2px;
}
.category-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  letter-spacing: 0;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

/* Transition */
.slide-fade-enter-active { transition: all var(--duration-base) var(--ease-out-expo); }
.slide-fade-leave-active { transition: all var(--duration-fast) ease-in; }
.slide-fade-enter-from { opacity: 0; transform: translateY(10px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
