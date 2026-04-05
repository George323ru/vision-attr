<template>
  <div class="collapsible-section" :class="{ collapsed: isCollapsed }">
    <button class="cs-header" @click="isCollapsed = !isCollapsed">
      <span class="cs-title">{{ title }}</span>
      <span class="cs-chevron">{{ isCollapsed ? '▼' : '▲' }}</span>
    </button>
    <div v-show="!isCollapsed" class="cs-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  initialCollapsed?: boolean
}>(), {
  initialCollapsed: false,
})

const isCollapsed = ref(props.initialCollapsed)
</script>

<style scoped>
.collapsible-section {
  border-bottom: 1px solid var(--border);
}
.cs-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.cs-header:hover {
  background: var(--card-hover);
}
.cs-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.cs-chevron {
  font-size: 9px;
  color: var(--text-dim);
  transition: transform 0.2s;
}
.cs-body {
  padding: 0 16px 12px;
}
</style>
