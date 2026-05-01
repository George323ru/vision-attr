<template>
  <button
    class="situation-card"
    :class="{ relevant, 'has-data': hasMarkup, 'no-data': !hasMarkup }"
    :disabled="!hasMarkup"
    :title="!hasMarkup ? 'Данные в обработке' : undefined"
    :aria-label="!hasMarkup ? `${situation.title} — данные в обработке` : undefined"
    @click="hasMarkup && $emit('open')"
  >
    <div class="card-top">
      <span class="card-title">{{ situation.title }}</span>
      <span v-if="hasMarkup" class="card-badge">АНАЛИЗ</span>
      <span v-else class="card-badge-muted" aria-hidden="true">в обработке</span>
    </div>
    <p class="card-desc">{{ situation.description }}</p>
  </button>
</template>

<script setup lang="ts">
import type { Situation } from '@/types/situation'

defineProps<{
  situation: Situation
  hasMarkup: boolean
  relevant: boolean
}>()

defineEmits<{ open: [] }>()
</script>

<style scoped>
.situation-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-expo),
              border-color var(--duration-fast),
              box-shadow var(--duration-base) var(--ease-out-expo);
  text-align: left;
  font-family: inherit;
  color: inherit;
}
.situation-card:hover {
  background: var(--card-hover);
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}
.situation-card:active {
  box-shadow: var(--shadow-sm);
}
.situation-card.relevant {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb),0.36), var(--shadow-sm);
}
.situation-card.has-data {
  background: var(--bg-surface2);
}
.situation-card.no-data {
  cursor: not-allowed;
  opacity: 0.55;
}
.situation-card.no-data:hover {
  background: var(--card-bg);
  border-color: var(--card-border);
  box-shadow: none;
}
.situation-card.no-data:active {
  box-shadow: none;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.card-title {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text);
  line-height: 1.4;
}
.card-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  color: var(--accent);
}
.card-badge-muted {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.6px;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-style: italic;
}

.card-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}
</style>
