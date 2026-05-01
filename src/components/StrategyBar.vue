<template>
  <div
    class="strategy-item"
    :class="{ selected }"
    @click="$emit('select')"
  >
    <div class="strategy-label">
      <span>{{ name }}</span>
      <span class="sl-pct">{{ probability }}%</span>
    </div>
    <div class="strategy-bar-track">
      <div
        class="strategy-bar-fill"
        :style="{ background: barColor, width: probability + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  probability: number
  barColor: string
  selected: boolean
}>()

defineEmits<{ select: [] }>()
</script>

<style scoped>
.strategy-item {
  margin-bottom: 6px;
  border-radius: var(--radius-md);
  padding: 8px 10px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-quad);
}
.strategy-item:hover {
  background: var(--card-bg);
}
.strategy-item.selected {
  background: var(--card-hover);
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}
.strategy-label {
  font-size: 12px;
  color: var(--text);
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.sl-pct {
  font-weight: 500;
  color: var(--accent);
  font-size: 11px;
  font-feature-settings: 'tnum' 1;
  letter-spacing: 0.02em;
}
.strategy-bar-track {
  height: 18px;
  background: var(--bar-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}
.strategy-bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  transition: width var(--duration-slow) var(--ease-out-expo), background var(--duration-base);
  min-width: 2px;
}
</style>
