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
        @update:model-min="ageMin = $event; emit('age-change')"
        @update:model-max="ageMax = $event; emit('age-change')"
      />
    </div>

    <!-- Gender -->
    <div class="demo-section">
      <div class="demo-label">Пол</div>
      <select v-model="gender" class="demo-select" aria-label="Выберите пол">
        <option value="any">Любой</option>
        <option value="male">Мужской</option>
        <option value="female">Женский</option>
      </select>
    </div>

    <!-- Marital status -->
    <div class="demo-section">
      <div class="demo-label">Семейное положение</div>
      <select v-model="maritalStatus" class="demo-select" aria-label="Семейное положение">
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
      <select v-model="childrenCount" class="demo-select" aria-label="Количество детей">
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
import { useAppState } from '@/composables/useAppState'
import DualRangeSlider from './DualRangeSlider.vue'

const { ageMin, ageMax, gender, childrenCount, maritalStatus } = useAppState()

const emit = defineEmits<{ 'age-change': [] }>()
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
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.demo-label b {
  color: var(--accent);
  font-size: 13px;
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
