<template>
  <div v-if="attr">
    <PanelBreadcrumb :crumbs="breadcrumbs" />
    <div v-if="attr.description" class="rp-description">{{ attr.description }}</div>

    <template v-if="parentSituations.length > 0">
      <div class="parent-situations-title">Ситуации ({{ parentLabel }})</div>
      <SituationCard
        v-for="s in parentSituations"
        :key="s.id"
        :title="s.title"
        :description="s.description"
        :domain-color="domainColor"
        :has-data="hasMarkup(s.id)"
        @select="emit('select-situation', attr!.parent!, s.id)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { SITUATIONS } from '@/data/situations'
import { useAttractorDisplay } from '@/composables/useAttractorDisplay'
import { useMarkupStore } from '@/composables/useMarkupStore'
import SituationCard from '@/components/SituationCard.vue'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'

const props = defineProps<{ nodeId: string }>()

const emit = defineEmits<{
  'focus-parent': [parentId: string]
  'select-situation': [attrId: string, sitId: string]
}>()

const { attr, parentLabel, domainColor } = useAttractorDisplay(toRef(props, 'nodeId'))
const { getMarkupForSituation } = useMarkupStore()

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (!attr.value) return []
  const crumbs: BreadcrumbItem[] = []
  if (attr.value.parent) {
    crumbs.push({ label: parentLabel.value, action: () => emit('focus-parent', attr.value!.parent!) })
  }
  crumbs.push({ label: attr.value.label })
  return crumbs
})

const parentSituations = computed(() => {
  if (!attr.value?.parent) return []
  return SITUATIONS.filter(s => s.attractorL2 === attr.value!.parent)
})
</script>

<style scoped>
.rp-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 6px;
  margin-bottom: 12px;
}
.parent-situations-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
</style>
