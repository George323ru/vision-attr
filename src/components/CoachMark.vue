<template>
  <div v-if="visible" class="coach-mark" :class="[`pos-${position}`]">
    <div class="cm-arrow"></div>
    <div class="cm-body">
      <p class="cm-text">{{ text }}</p>
      <button class="cm-dismiss" @click="onDismiss">Понятно</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCoachMarks } from '@/composables/useCoachMarks'

const props = withDefaults(defineProps<{
  id: string
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}>(), {
  position: 'bottom',
})

const { isDismissed, dismiss } = useCoachMarks()

const visible = computed(() => !isDismissed(props.id))

function onDismiss() {
  dismiss(props.id)
}
</script>

<style scoped>
.coach-mark {
  position: absolute;
  z-index: 100;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08)) drop-shadow(0 8px 20px rgba(0,0,0,0.10));
}
.cm-body {
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius-md, 10px);
  padding: 12px 16px;
  max-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cm-text {
  font-size: 12px;
  line-height: 1.55;
  margin: 0;
  letter-spacing: 0.005em;
}
.cm-dismiss {
  align-self: flex-end;
  background: rgba(255,255,255,0.18);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 6px);
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: background var(--duration-fast) var(--ease-out-quad);
}
.cm-dismiss:hover {
  background: rgba(255,255,255,0.30);
}
.cm-arrow {
  position: absolute;
  width: 0;
  height: 0;
}
/* Arrow positions */
.pos-bottom .cm-arrow {
  top: -6px;
  left: 20px;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid var(--accent);
}
.pos-top .cm-arrow {
  bottom: -6px;
  left: 20px;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--accent);
}
.pos-top { bottom: 100%; margin-bottom: 8px; }
.pos-bottom { top: 100%; margin-top: 8px; }
.pos-left { right: 100%; margin-right: 8px; top: 0; }
.pos-left .cm-arrow {
  right: -6px;
  top: 12px;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 6px solid var(--accent);
}
.pos-right { left: 100%; margin-left: 8px; top: 0; }
.pos-right .cm-arrow {
  left: -6px;
  top: 12px;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 6px solid var(--accent);
}
</style>
