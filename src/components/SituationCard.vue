<template>
  <div
    class="situation-card"
    :class="{ 'no-data': hasData === false }"
    :style="{ borderLeftColor: domainColor }"
    @click="$emit('select')"
  >
    <div class="sc-title">
      {{ title }}
      <span v-if="hasData" class="sc-badge data">данные</span>
      <span v-else-if="hasData === false" class="sc-badge no-data">в работе</span>
    </div>
    <div class="sc-desc">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  domainColor: string
  hasData?: boolean
}>()

defineEmits<{ select: [] }>()
</script>

<style scoped>
.situation-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
  border-left-width: 3px;
  border-left-style: solid;
  border-left-color: var(--accent);
}
.situation-card:hover {
  background: var(--card-hover);
  border-color: var(--accent);
  transform: translateX(2px);
}
.sc-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text);
}
.sc-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.situation-card.no-data {
  opacity: 0.55;
}
.sc-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 3px;
  vertical-align: middle;
  margin-left: 6px;
}
.sc-badge.data {
  background: rgba(8, 145, 178, 0.12);
  color: #0891b2;
}
.sc-badge.no-data {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-dim);
}
</style>
