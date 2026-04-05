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
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.12));
}
.cm-body {
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
  padding: 10px 14px;
  max-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cm-text {
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
.cm-dismiss {
  align-self: flex-end;
  background: rgba(255,255,255,0.2);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.cm-dismiss:hover {
  background: rgba(255,255,255,0.35);
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
