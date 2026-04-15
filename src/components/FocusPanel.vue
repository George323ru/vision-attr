<template>
  <div class="focus-panel" :class="{ visible }">
    <span class="fname">{{ name }}</span>
    <template v-if="currentMode === 'correlations'">
      <span> — <b>{{ count }}</b> связей</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAppState } from '@/composables/useAppState'

defineProps<{
  visible: boolean
  name: string
  count: number
}>()

const { currentMode } = useAppState()
</script>

<style scoped>
.focus-panel {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 13px;
  color: var(--panel-text);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s, background 0.3s;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.focus-panel.visible { opacity: 1; }
.fname { font-weight: 600; color: var(--fname-color); }
</style>
