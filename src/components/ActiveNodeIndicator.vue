<template>
  <div v-if="attr" class="active-node" :style="{ borderLeftColor: domainColor }">
    <div class="an-main">
      <span class="an-label">{{ attr.label }}</span>
      <button class="an-close" aria-label="Закрыть панель аттрактора" @click="$emit('close')">&times;</button>
    </div>
    <div class="an-meta">
      <span class="an-domain">{{ domainName }}</span>
      <span class="an-sep">/</span>
      <span class="an-level">{{ levelName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAttractorStore } from '@/composables/useAttractorStore'

const props = defineProps<{ nodeId: string | null }>()
defineEmits<{ close: [] }>()

const { getAttractor, domains } = useAttractorStore()

const attr = computed(() => props.nodeId ? getAttractor(props.nodeId) : null)
const domainColor = computed(() => {
  if (!attr.value) return '#888'
  return domains.value[attr.value.domain]?.color ?? '#888'
})
const domainName = computed(() => {
  if (!attr.value) return ''
  return domains.value[attr.value.domain]?.name ?? ''
})
const levelName = computed(() => {
  if (!attr.value) return ''
  if (attr.value.level === 1) return 'Аттрактор 1 уровня'
  if (attr.value.level === 2) return 'Аттрактор 2 уровня'
  return 'Аттрактор 3 уровня'
})
</script>

<style scoped>
.active-node {
  padding: 10px 16px;
  border-left: 4px solid var(--accent);
  background: var(--card-bg);
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}
.an-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.an-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.5px;
}
.an-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s;
}
.an-close:hover {
  color: var(--text);
}
.an-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  display: flex;
  gap: 4px;
}
.an-domain {
  color: var(--text-muted);
}
.an-sep {
  color: var(--text-dim);
}
.an-level {
  color: var(--text-dim);
}
</style>
