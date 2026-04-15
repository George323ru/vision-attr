<template>
  <div class="all-situations">
    <div v-for="group in groupedSituations" :key="group.category.id" class="category-group">
      <div class="category-header">
        <div class="category-title">{{ group.category.title }}</div>
        <div class="category-desc">{{ group.category.description }}</div>
      </div>
      <SituationCard
        v-for="s in group.situations"
        :key="s.id"
        :title="s.title"
        :description="getAttrLabel(s.attractorL2)"
        :domain-color="getDomainColor(s.attractorL2)"
        :has-data="hasMarkup(s.id)"
        @select="$emit('select-situation', s.attractorL2, s.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SITUATIONS, SITUATION_CATEGORIES } from '@/data/situations'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import SituationCard from '@/components/SituationCard.vue'
import type { Situation, SituationCategory } from '@/types/situation'

const { getAttractor, domains } = useAttractorStore()
const { getMarkupForSituation } = useMarkupStore()

defineEmits<{ 'select-situation': [attrId: string, sitId: string] }>()

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}

interface CategoryGroup {
  category: SituationCategory
  situations: Situation[]
}

const groupedSituations = computed<CategoryGroup[]>(() => {
  return SITUATION_CATEGORIES
    .map(cat => {
      const sits = SITUATIONS
        .filter(s => s.category === cat.id)
        .sort((a, b) => {
          const aHas = hasMarkup(a.id) ? 0 : 1
          const bHas = hasMarkup(b.id) ? 0 : 1
          return aHas - bHas
        })
      return { category: cat, situations: sits }
    })
    .filter(g => g.situations.length > 0)
})

function getAttrLabel(attrId: string): string {
  const attr = getAttractor(attrId)
  return attr?.label ?? ''
}

function getDomainColor(attrId: string): string {
  const attr = getAttractor(attrId)
  if (!attr) return '#888'
  const domain = domains.value[attr.domain]
  return domain?.color ?? '#888'
}
</script>

<style scoped>
.category-group {
  margin-bottom: 20px;
}
.category-group:last-child {
  margin-bottom: 0;
}
.category-header {
  margin-bottom: 8px;
  padding: 0 2px;
}
.category-title {
  font-size: var(--fs-sm, 13px);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}
.category-desc {
  font-size: var(--fs-xs, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
