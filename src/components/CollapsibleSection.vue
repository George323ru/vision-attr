<template>
  <div class="collapsible-section" :class="{ collapsed: isCollapsed }">
    <div class="cs-header-wrap">
      <button class="cs-header" :aria-expanded="!isCollapsed" @click="onToggle">
        <span class="cs-title">{{ title }}</span>
        <span class="cs-chevron">{{ isCollapsed ? '▼' : '▲' }}</span>
      </button>
      <CoachMark v-if="coachMarkId && showCoachOnExpand" :id="coachMarkId" :text="coachMarkText" position="bottom" />
    </div>
    <div v-show="!isCollapsed" class="cs-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CoachMark from './CoachMark.vue'

const props = withDefaults(defineProps<{
  title: string
  initialCollapsed?: boolean
  forceExpanded?: boolean
  coachMarkId?: string
  coachMarkText?: string
}>(), {
  initialCollapsed: false,
  forceExpanded: false,
  coachMarkId: '',
  coachMarkText: '',
})

const isCollapsed = ref(props.initialCollapsed)
const showCoachOnExpand = ref(false)

watch(() => props.forceExpanded, (val) => {
  if (val && isCollapsed.value) {
    isCollapsed.value = false
    if (props.coachMarkId) {
      showCoachOnExpand.value = true
    }
  }
})

function onToggle() {
  isCollapsed.value = !isCollapsed.value
  if (!isCollapsed.value && props.coachMarkId) {
    showCoachOnExpand.value = true
  }
}
</script>

<style scoped>
.collapsible-section {
  border-bottom: 1px solid var(--border);
}
.cs-header-wrap {
  position: relative;
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
