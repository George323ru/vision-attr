<template>
  <div
    class="situation-card"
    :style="{ borderLeftColor: domainColor }"
    @click="$emit('select')"
  >
    <div class="sc-title">{{ title }}</div>
    <div class="sc-desc">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  domainColor: string
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
</style>
