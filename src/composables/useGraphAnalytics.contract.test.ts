import { computeGraphNodeAnalytics } from './useGraphAnalytics'
import type { Attractor } from '@/types/attractor'
import type { Correlation } from '@/types/correlation'
import type { MarkupSituation, Situation } from '@/types/situation'

const attractors: Attractor[] = [
  { id: 'l2_focus', label: 'Фокус', level: 2, domain: 'a' },
  { id: 'l2_high', label: 'Сильный сосед', level: 2, domain: 'b' },
  { id: 'l2_mid', label: 'Средний сосед', level: 2, domain: 'c' },
  { id: 'l2_low', label: 'Слабый сосед', level: 2, domain: 'd' },
  { id: 'l3_child', label: 'Дочерний паттерн', level: 3, domain: 'a', parent: 'l2_focus' },
]

const correlations: Correlation[] = [
  { id: 'c1', from: 'l2_focus', to: 'l2_high', type: 'reinforcing', r: 0.7, strength: 0.7 },
  { id: 'c2', from: 'l2_focus', to: 'l2_mid', type: 'conflicting', r: -0.4, strength: 0.4 },
  { id: 'c3', from: 'l2_low', to: 'l2_mid', type: 'reinforcing', r: 0.1, strength: 0.1 },
]

const situations: Situation[] = [
  { id: 's01', title: 'Ситуация с данными', description: '', category: 'test', attractorL2: 'l2_focus' },
  { id: 's02', title: 'Ситуация без данных', description: '', category: 'test', attractorL2: 'l2_focus' },
]

const markupSituations: MarkupSituation[] = [
  {
    id: 's01',
    title: 'Ситуация с данными',
    attractorL2: 'l2_focus',
    category: 'test',
    strategyNames: [],
    strategies: [],
    totalRespondents: 12,
  },
]

const analytics = computeGraphNodeAnalytics({
  nodeId: 'l2_focus',
  attractors,
  correlations,
  situations,
  markupSituations,
})

if (!analytics) {
  throw new Error('Expected L2 node to have graph analytics')
}

analytics satisfies {
  nodeId: string
  roleLevel: 'high' | 'medium' | 'low' | 'none'
  weightedDegree: number
  totalConnections: number
  reinforcingCount: number
  conflictingCount: number
  reinforcingStrength: number
  conflictingStrength: number
  topReinforcing: readonly unknown[]
  topConflicting: readonly unknown[]
  neighborDomains: readonly string[]
  linkedSituationCount: number
  markedSituationCount: number
}

if (analytics?.roleLevel !== 'high') {
  throw new Error('Expected focus node to be high centrality in the graph sample')
}

const l3Analytics = computeGraphNodeAnalytics({
  nodeId: 'l3_child',
  attractors,
  correlations,
  situations,
  markupSituations,
})

if (l3Analytics !== null) {
  throw new Error('Expected non-L2 nodes to have no graph analytics')
}
