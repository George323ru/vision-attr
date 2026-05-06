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
      <SearchableCombobox
        :model-value="gender"
        :groups="genderGroups"
        :searchable="false"
        :clearable="false"
        aria-label="Пол"
        placeholder="Любой"
        @update:model-value="onGender"
      />
    </div>

    <!-- Marital status -->
    <div class="demo-section">
      <div class="demo-label">Семейное положение</div>
      <SearchableCombobox
        :model-value="maritalStatus"
        :groups="maritalGroups"
        :searchable="false"
        :clearable="false"
        aria-label="Семейное положение"
        placeholder="Любое"
        @update:model-value="onMarital"
      />
    </div>

    <!-- Children -->
    <div class="demo-section">
      <div class="demo-label">Дети</div>
      <SearchableCombobox
        :model-value="childrenCount"
        :groups="childrenGroups"
        :searchable="false"
        :clearable="false"
        aria-label="Количество детей"
        placeholder="Не важно"
        @update:model-value="onChildren"
      />
    </div>

    <!-- Education -->
    <div class="demo-section">
      <div class="demo-label">Образование</div>
      <SearchableCombobox
        :model-value="education"
        :groups="educationGroups"
        :searchable="false"
        :clearable="false"
        aria-label="Образование"
        placeholder="Любое"
        @update:model-value="onEducation"
      />
    </div>

    <!-- Living with -->
    <div class="demo-section">
      <div class="demo-label">Проживание</div>
      <SearchableCombobox
        :model-value="livingWith"
        :groups="livingWithGroups"
        :searchable="false"
        :clearable="false"
        aria-label="Проживание совместно с"
        placeholder="Не важно"
        @update:model-value="onLivingWith"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/composables/state/useStore'
import DualRangeSlider from './DualRangeSlider.vue'
import SearchableCombobox from './SearchableCombobox.vue'
import type { ComboboxGroup } from './SearchableCombobox.vue'

const { profile, dispatch } = useStore()

const ageMin = computed(() => profile.value.demographics.ageMin)
const ageMax = computed(() => profile.value.demographics.ageMax)
const gender = computed(() => profile.value.demographics.gender)
const childrenCount = computed(() => profile.value.demographics.childrenCount)
const maritalStatus = computed(() => profile.value.demographics.maritalStatus)
const education = computed(() => profile.value.demographics.education)
const livingWith = computed(() => profile.value.demographics.livingWith)

const genderGroups: ComboboxGroup[] = [{
  id: 'gender',
  name: '',
  items: [
    { id: 'any', label: 'Любой' },
    { id: 'male', label: 'Мужской' },
    { id: 'female', label: 'Женский' },
  ],
}]

const maritalGroups: ComboboxGroup[] = [{
  id: 'marital',
  name: '',
  items: [
    { id: 'any', label: 'Любое' },
    { id: 'married', label: 'В браке' },
    { id: 'not_married', label: 'Не в браке' },
    { id: 'divorced', label: 'Разведён(а)' },
    { id: 'widowed', label: 'Вдовец/вдова' },
    { id: 'civil_union', label: 'Гражданский брак' },
  ],
}]

const childrenGroups: ComboboxGroup[] = [{
  id: 'children',
  name: '',
  items: [
    { id: 'any', label: 'Не важно' },
    { id: '0', label: 'Нет детей' },
    { id: 'has_children', label: 'Есть дети' },
    { id: '1', label: '1 ребёнок' },
    { id: '2', label: '2 ребёнка' },
    { id: '3', label: '3 ребёнка' },
    { id: '4', label: '4 ребёнка' },
    { id: '5+', label: '5 и более' },
  ],
}]

const educationGroups: ComboboxGroup[] = [{
  id: 'education',
  name: '',
  items: [
    { id: 'any', label: 'Любое' },
    { id: 'secondary', label: 'Среднее' },
    { id: 'vocational', label: 'Среднее профессиональное' },
    { id: 'incomplete_higher', label: 'Неоконченное высшее' },
    { id: 'bachelor', label: 'Бакалавр' },
    { id: 'specialist', label: 'Специалист' },
    { id: 'master', label: 'Магистр' },
    { id: 'postgraduate', label: 'Аспирантура' },
    { id: 'phd', label: 'Кандидат наук' },
  ],
}]

const livingWithGroups: ComboboxGroup[] = [{
  id: 'living-with',
  name: '',
  items: [
    { id: 'any', label: 'Не важно' },
    { id: 'alone', label: 'В одиночку' },
    { id: 'partner', label: 'С партнёром' },
    { id: 'children', label: 'С детьми' },
    { id: 'parents', label: 'С родителями' },
    { id: 'relatives', label: 'С родственниками' },
    { id: 'friends', label: 'С друзьями' },
    { id: 'neighbors', label: 'С соседями' },
    { id: 'dorm', label: 'Общежитие' },
  ],
}]

function onGender(value: string | null) {
  if (value === null) return
  dispatch({ type: 'SET_GENDER', value: value as 'male' | 'female' | 'any' })
}
function onMarital(value: string | null) {
  if (value === null) return
  dispatch({
    type: 'SET_MARITAL',
    value: value as 'married' | 'not_married' | 'divorced' | 'widowed' | 'civil_union' | 'any',
  })
}
function onChildren(value: string | null) {
  if (value === null) return
  dispatch({ type: 'SET_CHILDREN', value })
}
function onEducation(value: string | null) {
  if (value === null) return
  dispatch({ type: 'SET_EDUCATION', value })
}
function onLivingWith(value: string | null) {
  if (value === null) return
  dispatch({ type: 'SET_LIVING_WITH', value })
}
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
  letter-spacing: 0.08em;
  font-weight: 500;
}
.demo-label b {
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0;
  font-feature-settings: 'tnum' 1;
}
</style>
