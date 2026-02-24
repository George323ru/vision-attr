<template>
  <div class="demographics">
    <!-- Age range -->
    <div class="demo-section">
      <div class="demo-label">
        Возраст: <b>{{ ageMin }}–{{ ageMax }}</b>
      </div>
      <div class="range-slider">
        <input
          type="range"
          class="range-input range-min"
          min="18" max="75"
          :value="ageMin"
          @input="onMinInput"
        >
        <input
          type="range"
          class="range-input range-max"
          min="18" max="75"
          :value="ageMax"
          @input="onMaxInput"
        >
        <div class="range-track">
          <div
            class="range-fill"
            :style="{ left: fillLeft + '%', width: fillWidth + '%' }"
          ></div>
        </div>
      </div>
      <div class="age-ticks">
        <span v-for="tick in ticks" :key="tick">{{ tick }}</span>
      </div>
    </div>

    <!-- Gender -->
    <div class="demo-section">
      <div class="demo-label">Пол</div>
      <select v-model="gender" class="demo-select">
        <option value="any">Любой</option>
        <option value="male">Мужской</option>
        <option value="female">Женский</option>
      </select>
    </div>

    <!-- Marital status -->
    <div class="demo-section">
      <div class="demo-label">Семейное положение</div>
      <select v-model="maritalStatus" class="demo-select">
        <option value="any">Любое</option>
        <option value="married">В браке</option>
        <option value="not_married">Не в браке</option>
        <option value="divorced">Разведён(а)</option>
        <option value="widowed">Вдовец/вдова</option>
        <option value="civil_union">Гражданский брак</option>
      </select>
    </div>

    <!-- Children -->
    <div class="demo-section">
      <div class="demo-label">Дети</div>
      <select v-model="childrenCount" class="demo-select">
        <option value="any">Не важно</option>
        <option value="0">Нет детей</option>
        <option value="1">1 ребёнок</option>
        <option value="2">2 ребёнка</option>
        <option value="3">3 ребёнка</option>
        <option value="4">4 ребёнка</option>
        <option value="5+">5 и более</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppState } from '@/composables/useAppState'

const { ageMin, ageMax, gender, childrenCount, maritalStatus } = useAppState()

const emit = defineEmits<{ 'age-change': [] }>()

const ticks = [18, 25, 35, 45, 55, 65, 75]

const fillLeft = computed(() => ((ageMin.value - 18) / 57) * 100)
const fillWidth = computed(() => ((ageMax.value - ageMin.value) / 57) * 100)

function onMinInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  if (v <= ageMax.value) {
    ageMin.value = v
    emit('age-change')
  }
}

function onMaxInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  if (v >= ageMin.value) {
    ageMax.value = v
    emit('age-change')
  }
}
</script>

<style scoped>
.demographics {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.demo-label b {
  color: var(--accent);
  font-size: 13px;
}

/* ── Range slider ── */
.range-slider {
  position: relative;
  height: 20px;
}
.range-track {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--slider-track);
  border-radius: 2px;
  pointer-events: none;
}
.range-fill {
  position: absolute;
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0.5;
}
.range-input {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: transparent;
  pointer-events: none;
  outline: none;
  margin: 0;
}
.range-input::-webkit-slider-thumb {
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
.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 2px solid var(--bg);
  cursor: pointer;
  pointer-events: all;
}

.age-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--text-dim);
  padding: 0 4px;
}

/* ── Select dropdown ── */
.demo-select {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  padding: 5px 28px 5px 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.demo-select:hover {
  border-color: var(--accent);
}
.demo-select:focus {
  border-color: var(--accent);
  background: var(--card-hover);
}
.demo-select option {
  background: var(--bg);
  color: var(--text);
}
</style>
