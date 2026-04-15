<template>
  <div class="demographics">
    <!-- Age range -->
    <div class="demo-section">
      <div class="demo-label">
        Возраст: <b>{{ ageMin }}–{{ ageMax }}</b>
      </div>
      <DualRangeSlider
        :min="18"
        :max="75"
        :model-min="ageMin"
        :model-max="ageMax"
        :ticks="[18, 25, 35, 45, 55, 65, 75]"
        aria-label-min="Минимальный возраст"
        aria-label-max="Максимальный возраст"
        @update:model-min="dispatch({ type: 'SET_AGE_RANGE', min: $event, max: ageMax })"
        @update:model-max="dispatch({ type: 'SET_AGE_RANGE', min: ageMin, max: $event })"
      />
    </div>

    <!-- Gender -->
    <div class="demo-section">
      <div class="demo-label">Пол</div>
      <select
        :value="gender"
        class="demo-select"
        aria-label="Выберите пол"
        @change="dispatch({ type: 'SET_GENDER', value: ($event.target as HTMLSelectElement).value as 'male' | 'female' | 'any' })"
      >
        <option value="any">Любой</option>
        <option value="male">Мужской</option>
        <option value="female">Женский</option>
      </select>
    </div>

    <!-- Marital status -->
    <div class="demo-section">
      <div class="demo-label">Семейное положение</div>
      <select
        :value="maritalStatus"
        class="demo-select"
        aria-label="Семейное положение"
        @change="dispatch({ type: 'SET_MARITAL', value: ($event.target as HTMLSelectElement).value as 'married' | 'not_married' | 'divorced' | 'widowed' | 'civil_union' | 'any' })"
      >
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
      <select
        :value="childrenCount"
        class="demo-select"
        aria-label="Количество детей"
        @change="dispatch({ type: 'SET_CHILDREN', value: ($event.target as HTMLSelectElement).value })"
      >
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
import { useStore } from '@/composables/state/useStore'
import DualRangeSlider from './DualRangeSlider.vue'

const { profile, dispatch } = useStore()

const ageMin = computed(() => profile.value.demographics.ageMin)
const ageMax = computed(() => profile.value.demographics.ageMax)
const gender = computed(() => profile.value.demographics.gender)
const childrenCount = computed(() => profile.value.demographics.childrenCount)
const maritalStatus = computed(() => profile.value.demographics.maritalStatus)
</script>

<style scoped>
.demographics {
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
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}
.demo-label b {
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0;
  font-feature-settings: 'tnum' 1;
}

/* ── Select dropdown ── */
.demo-select {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  padding: 6px 28px 6px 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  outline: none;
  transition: border-color var(--duration-fast), background var(--duration-fast), box-shadow var(--duration-fast);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.demo-select:hover {
  border-color: var(--accent);
}
.demo-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-subtle);
}
.demo-select option {
  background: var(--bg);
  color: var(--text);
}
</style>
