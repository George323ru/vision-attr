<template>
  <div v-if="attr">
    <PanelBreadcrumb :crumbs="breadcrumbs" />
    <div v-if="attr.description" class="rp-description">{{ attr.description }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useAttractorDisplay } from '@/composables/useAttractorDisplay'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'

const props = defineProps<{ nodeId: string }>()

const emit = defineEmits<{ 'focus-parent': [parentId: string] }>()

const { attr, parentLabel } = useAttractorDisplay(toRef(props, 'nodeId'))

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (!attr.value) return []
  const crumbs: BreadcrumbItem[] = []
  if (attr.value.parent) {
    crumbs.push({ label: parentLabel.value, action: () => emit('focus-parent', attr.value!.parent!) })
  }
  crumbs.push({ label: attr.value.label })
  return crumbs
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
}
</style>
