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
  margin-bottom: 8px;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.strategy-item:hover {
  background: var(--card-bg);
}
.strategy-item.selected {
  background: var(--card-hover);
  outline: 1px solid var(--accent);
}
.strategy-label {
  font-size: 12px;
  color: var(--text);
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
}
.sl-pct {
  font-weight: 600;
  color: var(--accent);
  font-size: 12px;
}
.strategy-bar-track {
  height: 22px;
  background: var(--bar-bg);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.strategy-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease, background 0.3s;
  min-width: 2px;
}
</style>
