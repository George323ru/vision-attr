<template>
  <button
    class="situation-card"
    :class="{ relevant, 'has-data': hasMarkup }"
    @click="$emit('open')"
  >
    <div class="card-top">
      <span class="card-title">{{ situation.title }}</span>
      <span v-if="hasMarkup" class="card-badge">ANALYSE</span>
    </div>
    <p class="card-desc">{{ situation.description }}</p>
    <div class="card-meta">
      <span v-if="domainLabel" class="card-domain" :style="{ color: domainColorValue }">{{ domainLabel }}</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Situation } from '@/types/situation'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { domainColor } from '@/utils/colors'

const props = defineProps<{
  situation: Situation
  hasMarkup: boolean
  relevant: boolean
}>()

defineEmits<{ open: [] }>()

const { getAttractor, domains } = useAttractorStore()

const attr = computed(() => getAttractor(props.situation.attractorL2))
const domainLabel = computed(() => {
  if (!attr.value) return ''
  const d = domains.value[attr.value.domain]
  return d?.name ?? attr.value.domain
})
const domainColorValue = computed(() => {
  if (!attr.value) return 'var(--text-muted)'
  return domainColor(domains.value, attr.value.domain, 2)
})
</script>

<style scoped>
.situation-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-expo),
              border-color var(--duration-fast),
              box-shadow var(--duration-base) var(--ease-out-expo),
              transform var(--duration-base) var(--ease-out-expo);
  text-align: left;
  font-family: inherit;
  color: inherit;
}
.situation-card:hover {
  background: var(--card-hover);
  border-color: var(--border);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.situation-card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
.situation-card.relevant {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow-sm);
}
.situation-card.has-data {
  background: var(--bg-surface2);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.card-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.card-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.2px;
  padding: 3px 7px;
  border-radius: 4px;
  background: var(--accent-subtle);
  color: var(--accent);
}

.card-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.card-domain {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
</style>
