import { matchesRespondentDemographics } from './usePrediction'
import type { RespondentRecord } from '@/types/situation'

const respondent: RespondentRecord = {
  id: 'P001',
  gender: 'female',
  age: 41,
  ageGroup: '36-45',
  maritalStatus: 'married',
  hasChildren: true,
  childrenCount: 2,
  education: 'specialist',
  livingWith: ['partner', 'children'],
  city: 'Омск',
  region: 'Омская область',
  settlementType: 'город',
  professionWork: 'финансовый консультант',
  employmentType: 'предприниматель',
  grewInCompleteFamily: 'да',
  hasSiblings: 'да',
  hadDivorces: 'нет',
  doesSports: 'да',
  attractors: {},
  strategies: {},
}

const baseFilter = {
  ageMin: 18,
  ageMax: 75,
  gender: 'any' as const,
  maritalStatus: 'any',
  childrenCount: 'any',
  education: 'any',
  livingWith: 'any',
  settlementType: 'any',
  employmentType: 'any',
  grewInCompleteFamily: 'any',
  hasSiblings: 'any',
  hadDivorces: 'any',
  doesSports: 'any',
}

if (!matchesRespondentDemographics(respondent, {
  ...baseFilter,
  employmentType: 'предприниматель',
  grewInCompleteFamily: 'да',
  doesSports: 'да',
})) {
  throw new Error('Expected respondent to match selected extended demographics')
}

if (matchesRespondentDemographics(respondent, {
  ...baseFilter,
  employmentType: 'наёмный сотрудник',
})) {
  throw new Error('Expected employment filter to exclude respondent')
}

if (matchesRespondentDemographics(respondent, {
  ...baseFilter,
  grewInCompleteFamily: 'нет',
})) {
  throw new Error('Expected family background filter to exclude respondent')
}
