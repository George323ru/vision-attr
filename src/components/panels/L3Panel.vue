<template>
  <div v-if="attr">
    <div class="breadcrumb">
      <a v-if="attr.parent" @click="$emit('focus-parent', attr.parent)">{{ parentLabel }}</a>
      <span>›</span>
      <span>{{ attr.label }}</span>
    </div>
    <div v-if="attr.description" class="rp-description">{{ attr.description }}</div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useAttractorDisplay } from '@/composables/useAttractorDisplay'

const props = defineProps<{ nodeId: string }>()

defineEmits<{ 'focus-parent': [parentId: string] }>()

const { attr, parentLabel } = useAttractorDisplay(toRef(props, 'nodeId'))
</script>

<style scoped>
.breadcrumb {
  font-size: 11px;
  color: var(--breadcrumb);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.breadcrumb a {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}
.breadcrumb a:hover { text-decoration: underline; }

.rp-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 6px;
}
</style>
