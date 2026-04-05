<template>
  <div class="drs">
    <div class="drs-track-wrap">
      <input
        type="range"
        class="drs-input drs-min"
        :min="min"
        :max="max"
        :value="modelMin"
        :aria-label="ariaLabelMin"
        @input="onMinInput"
        @mousedown="activeThumb = 'min'"
        @touchstart="activeThumb = 'min'"
        @mouseup="activeThumb = null"
        @touchend="activeThumb = null"
      >
      <input
        type="range"
        class="drs-input drs-max"
        :min="min"
        :max="max"
        :value="modelMax"
        :aria-label="ariaLabelMax"
        @input="onMaxInput"
        @mousedown="activeThumb = 'max'"
        @touchstart="activeThumb = 'max'"
        @mouseup="activeThumb = null"
        @touchend="activeThumb = null"
      >
      <div class="drs-track">
        <div class="drs-fill" :style="{ left: fillLeft + '%', width: fillWidth + '%' }"></div>
      </div>
      <div
        v-if="activeThumb === 'min'"
        class="drs-tooltip"
        :style="{ left: minThumbPos + '%' }"
      >{{ modelMin }}</div>
      <div
        v-if="activeThumb === 'max'"
        class="drs-tooltip"
        :style="{ left: maxThumbPos + '%' }"
      >{{ modelMax }}</div>
    </div>
    <div v-if="ticks.length" class="drs-ticks">
      <span
        v-for="tick in ticks"
        :key="tick"
        class="drs-tick"
        :style="{ left: tickPos(tick) + '%' }"
      >{{ tick }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  min: number
  max: number
  modelMin: number
  modelMax: number
  ticks?: number[]
  ariaLabelMin?: string
  ariaLabelMax?: string
}>(), {
  ticks: () => [],
  ariaLabelMin: 'Минимальное значение',
  ariaLabelMax: 'Максимальное значение',
})

const emit = defineEmits<{
  'update:modelMin': [value: number]
  'update:modelMax': [value: number]
  'change': []
}>()

const activeThumb = ref<'min' | 'max' | null>(null)

const range = computed(() => props.max - props.min)
const fillLeft = computed(() => ((props.modelMin - props.min) / range.value) * 100)
const fillWidth = computed(() => ((props.modelMax - props.modelMin) / range.value) * 100)
const minThumbPos = computed(() => ((props.modelMin - props.min) / range.value) * 100)
const maxThumbPos = computed(() => ((props.modelMax - props.min) / range.value) * 100)

function tickPos(tick: number): number {
  return ((tick - props.min) / range.value) * 100
}

function onMinInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  if (v <= props.modelMax) {
    emit('update:modelMin', v)
    emit('change')
  }
}

function onMaxInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  if (v >= props.modelMin) {
    emit('update:modelMax', v)
    emit('change')
  }
}
</script>

<style scoped>
.drs {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.drs-track-wrap {
  position: relative;
  height: 24px;
}
.drs-track {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--slider-track);
  border-radius: 2px;
  pointer-events: none;
}
.drs-fill {
  position: absolute;
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0.8;
}
.drs-input {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 24px;
  background: transparent;
  pointer-events: none;
  outline: none;
  margin: 0;
}
.drs-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--bg);
  cursor: pointer;
  pointer-events: all;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  position: relative;
  z-index: 1;
}
.drs-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--bg);
  cursor: pointer;
  pointer-events: all;
}
.drs-tooltip {
  position: absolute;
  top: -22px;
  transform: translateX(-50%);
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}
.drs-ticks {
  position: relative;
  height: 14px;
  padding: 0 8px;
}
.drs-tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 9px;
  color: var(--text-dim);
}
</style>
