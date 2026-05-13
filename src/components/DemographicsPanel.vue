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

    <div class="demo-subhead">Расширенный соцдем</div>

    <div class="demo-section">
      <div class="demo-label">Тип населённого пункта</div>
      <SearchableCombobox
        :model-value="settlementType"
        :groups="settlementTypeGroups"
        :searchable="false"
        aria-label="Тип населённого пункта"
        placeholder="Любой"
        :clearable="false"
        @update:model-value="value => onExtended('settlementType', value)"
      />
    </div>

    <div class="demo-section">
      <div class="demo-label">Занятость</div>
      <SearchableCombobox
        :model-value="employmentType"
        :groups="employmentTypeGroups"
        aria-label="Тип занятости"
        placeholder="Любая"
        :clearable="false"
        @update:model-value="value => onExtended('employmentType', value)"
      />
    </div>

    <div class="demo-section">
      <div class="demo-label with-help">
        Рос в полной семье
        <span
          class="demo-help"
          tabindex="0"
          role="img"
          aria-label="Поле из анкеты: Рос_в_полной_семье."
          title="Поле из анкеты: «Рос_в_полной_семье»."
        >?</span>
      </div>
      <SearchableCombobox
        :model-value="grewInCompleteFamily"
        :groups="completeFamilyGroups"
        :searchable="false"
        aria-label="Рос в полной семье"
        placeholder="Любой"
        :clearable="false"
        @update:model-value="value => onExtended('grewInCompleteFamily', value)"
      />
    </div>

    <div class="demo-section">
      <div class="demo-label">Сиблинги</div>
      <SearchableCombobox
        :model-value="hasSiblings"
        :groups="siblingsGroups"
        :searchable="false"
        aria-label="Наличие сиблингов"
        placeholder="Любые"
        :clearable="false"
        @update:model-value="value => onExtended('hasSiblings', value)"
      />
    </div>

    <div class="demo-section">
      <div class="demo-label">Разводы</div>
      <SearchableCombobox
        :model-value="hadDivorces"
        :groups="divorceGroups"
        :searchable="false"
        aria-label="Разводы были ли"
        placeholder="Любые"
        :clearable="false"
        @update:model-value="value => onExtended('hadDivorces', value)"
      />
    </div>

    <div class="demo-section">
      <div class="demo-label">Спорт</div>
      <SearchableCombobox
        :model-value="doesSports"
        :groups="sportsGroups"
        :searchable="false"
        aria-label="Занимается ли спортом"
        placeholder="Любой"
        :clearable="false"
        @update:model-value="value => onExtended('doesSports', value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/composables/state/useStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import DualRangeSlider from './DualRangeSlider.vue'
import SearchableCombobox from './SearchableCombobox.vue'
import type { ComboboxGroup } from './SearchableCombobox.vue'
import type { DemographicsState } from '@/composables/state/types'
import type { RespondentRecord } from '@/types/situation'

const { profile, dispatch } = useStore()
const { respondents } = useMarkupStore()

const ageMin = computed(() => profile.value.demographics.ageMin)
const ageMax = computed(() => profile.value.demographics.ageMax)
const gender = computed(() => profile.value.demographics.gender)
const childrenCount = computed(() => profile.value.demographics.childrenCount)
const maritalStatus = computed(() => profile.value.demographics.maritalStatus)
const education = computed(() => profile.value.demographics.education)
const livingWith = computed(() => profile.value.demographics.livingWith)
const settlementType = computed(() => profile.value.demographics.settlementType)
const employmentType = computed(() => profile.value.demographics.employmentType)
const grewInCompleteFamily = computed(() => profile.value.demographics.grewInCompleteFamily)
const hasSiblings = computed(() => profile.value.demographics.hasSiblings)
const hadDivorces = computed(() => profile.value.demographics.hadDivorces)
const doesSports = computed(() => profile.value.demographics.doesSports)

type ExtendedKey =
  | 'settlementType'
  | 'employmentType'
  | 'grewInCompleteFamily'
  | 'hasSiblings'
  | 'hadDivorces'
  | 'doesSports'

function valueLabel(value: string): string {
  if (value === 'да') return 'Да'
  if (value === 'нет') return 'Нет'
  return value
}

function optionGroups(
  field: keyof Pick<
    RespondentRecord,
    'settlementType' | 'employmentType' |
    'grewInCompleteFamily' | 'hasSiblings' | 'hadDivorces' | 'doesSports'
  >,
  anyLabel: string,
  limit = 160,
): ComboboxGroup[] {
  const counts = new Map<string, number>()
  for (const respondent of respondents.value) {
    const raw = respondent[field]
    if (typeof raw !== 'string') continue
    const value = raw.trim()
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const items = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .slice(0, limit)
    .map(([value, count]) => ({
      id: value,
      label: `${valueLabel(value)} · ${count}`,
    }))

  return [{
    id: field,
    name: '',
    items: [
      { id: 'any', label: anyLabel },
      ...items,
    ],
  }]
}

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

const settlementTypeGroups = computed(() => optionGroups('settlementType', 'Любой тип'))
const employmentTypeGroups = computed(() => optionGroups('employmentType', 'Любая занятость'))
const completeFamilyGroups = computed(() => optionGroups('grewInCompleteFamily', 'Не важно'))
const siblingsGroups = computed(() => optionGroups('hasSiblings', 'Не важно'))
const divorceGroups = computed(() => optionGroups('hadDivorces', 'Не важно'))
const sportsGroups = computed(() => optionGroups('doesSports', 'Не важно'))

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
function onExtended(key: ExtendedKey, value: string | null) {
  if (value === null) return
  dispatch({ type: 'SET_EXTENDED_DEMOGRAPHIC', key, value: value as DemographicsState[ExtendedKey] })
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

.demo-label.with-help {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.demo-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  color: var(--text-muted);
  border: 1px solid var(--border);
  font-size: 10px;
  line-height: 1;
  cursor: help;
  text-transform: none;
  letter-spacing: 0;
}

.demo-help:hover,
.demo-help:focus-visible {
  color: var(--accent);
  border-color: var(--accent);
  outline: none;
}

.demo-subhead {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  line-height: 1.2;
  color: var(--text);
  font-weight: 650;
}
</style>
