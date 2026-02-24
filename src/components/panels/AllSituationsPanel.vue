<template>
  <div>
    <SituationCard
      v-for="s in situations"
      :key="s.id"
      :title="s.title"
      :description="getAttrLabel(s.attractorL2)"
      :domain-color="getDomainColor(s.attractorL2)"
      @select="$emit('select-situation', s.attractorL2, s.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { SITUATIONS } from '@/data/situations'
import { useAttractorStore } from '@/composables/useAttractorStore'
import SituationCard from '@/components/SituationCard.vue'

const { getAttractor, domains } = useAttractorStore()

defineEmits<{ 'select-situation': [attrId: string, sitId: string] }>()

const situations = SITUATIONS

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
