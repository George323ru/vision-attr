<template>
  <div>
    <SituationCard
      v-for="s in sortedSituations"
      :key="s.id"
      :title="s.title"
      :description="getAttrLabel(s.attractorL2)"
      :domain-color="getDomainColor(s.attractorL2)"
      :has-data="hasMarkup(s.id)"
      @select="$emit('select-situation', s.attractorL2, s.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SITUATIONS } from '@/data/situations'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import SituationCard from '@/components/SituationCard.vue'

const { getAttractor, domains } = useAttractorStore()
const { getMarkupForSituation } = useMarkupStore()

defineEmits<{ 'select-situation': [attrId: string, sitId: string] }>()

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}

const sortedSituations = computed(() =>
  [...SITUATIONS].sort((a, b) => {
    const aHas = hasMarkup(a.id) ? 0 : 1
    const bHas = hasMarkup(b.id) ? 0 : 1
    return aHas - bHas
  })
)

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
