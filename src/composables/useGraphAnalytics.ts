import { computed } from 'vue'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useCorrelationStore } from '@/composables/useCorrelationStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useSituationStore } from '@/composables/useSituationStore'
import { flatLabel } from '@/composables/useAttractorDisplay'
import type { Attractor } from '@/types/attractor'
import type { Correlation, CorrelationType } from '@/types/correlation'

export type GraphRoleLevel = 'high' | 'medium' | 'low' | 'none'

export interface GraphNeighborSummary {
  id: string
  label: string
  domain: string
  type: CorrelationType
  strength: number
}

export interface GraphNodeAnalytics {
  nodeId: string
  roleLevel: GraphRoleLevel
  weightedDegree: number
  totalConnections: number
  reinforcingCount: number
  conflictingCount: number
  reinforcingStrength: number
  conflictingStrength: number
  topReinforcing: GraphNeighborSummary[]
  topConflicting: GraphNeighborSummary[]
  neighborDomains: string[]
  linkedSituationCount: number
  markedSituationCount: number
}

export interface ComputeGraphNodeAnalyticsInput {
  nodeId: string
  attractors: readonly Attractor[]
  correlations: readonly Correlation[]
  situations: readonly { readonly attractorL2: string }[]
  markupSituations: readonly { readonly attractorL2: string }[]
}

interface NodeDegree {
  nodeId: string
  degree: number
}

const TOP_NEIGHBORS_LIMIT = 5

function createDegreeMap(
  l2Ids: ReadonlySet<string>,
  correlations: readonly Correlation[],
): Map<string, number> {
  const degrees = new Map<string, number>()
  for (const id of l2Ids) degrees.set(id, 0)

  for (const corr of correlations) {
    if (l2Ids.has(corr.from)) {
      degrees.set(corr.from, (degrees.get(corr.from) ?? 0) + corr.strength)
    }
    if (l2Ids.has(corr.to)) {
      degrees.set(corr.to, (degrees.get(corr.to) ?? 0) + corr.strength)
    }
  }

  return degrees
}

function roleLevelForDegree(nodeId: string, degrees: readonly NodeDegree[]): GraphRoleLevel {
  const current = degrees.find(d => d.nodeId === nodeId)?.degree ?? 0
  if (current <= 0) return 'none'

  const positive = degrees
    .filter(d => d.degree > 0)
    .map(d => d.degree)
    .sort((a, b) => a - b)

  if (positive.length === 0) return 'none'

  const lowIndex = Math.floor((positive.length - 1) * 0.25)
  const highIndex = Math.ceil((positive.length - 1) * 0.75)
  const lowThreshold = positive[lowIndex]
  const highThreshold = positive[highIndex]

  if (current >= highThreshold) return 'high'
  if (current <= lowThreshold) return 'low'
  return 'medium'
}

function buildNeighborSummary(
  nodeId: string,
  corr: Correlation,
  byId: ReadonlyMap<string, Attractor>,
): GraphNeighborSummary | null {
  const otherId = corr.from === nodeId ? corr.to : corr.from
  const other = byId.get(otherId)
  if (!other || other.level !== 2) return null

  return {
    id: other.id,
    label: flatLabel(other.label),
    domain: other.domain,
    type: corr.type,
    strength: corr.strength,
  }
}

export function computeGraphNodeAnalytics(
  input: ComputeGraphNodeAnalyticsInput,
): GraphNodeAnalytics | null {
  const byId = new Map(input.attractors.map(a => [a.id, a]))
  const attr = byId.get(input.nodeId)
  if (!attr || attr.level !== 2) return null

  const l2Ids = new Set(input.attractors.filter(a => a.level === 2).map(a => a.id))
  const degreeMap = createDegreeMap(l2Ids, input.correlations)
  const degrees = Array.from(degreeMap, ([nodeId, degree]) => ({ nodeId, degree }))
  const related = input.correlations.filter(c => c.from === input.nodeId || c.to === input.nodeId)

  const neighbors = related
    .map(c => buildNeighborSummary(input.nodeId, c, byId))
    .filter((n): n is GraphNeighborSummary => n !== null)
    .sort((a, b) => b.strength - a.strength)

  const topReinforcing = neighbors
    .filter(n => n.type === 'reinforcing')
    .slice(0, TOP_NEIGHBORS_LIMIT)
  const topConflicting = neighbors
    .filter(n => n.type === 'conflicting')
    .slice(0, TOP_NEIGHBORS_LIMIT)

  const reinforcingStrength = related
    .filter(c => c.type === 'reinforcing')
    .reduce((sum, c) => sum + c.strength, 0)
  const conflictingStrength = related
    .filter(c => c.type === 'conflicting')
    .reduce((sum, c) => sum + c.strength, 0)

  const neighborDomains = Array.from(new Set(neighbors.map(n => n.domain)))

  return {
    nodeId: input.nodeId,
    roleLevel: roleLevelForDegree(input.nodeId, degrees),
    weightedDegree: degreeMap.get(input.nodeId) ?? 0,
    totalConnections: related.length,
    reinforcingCount: related.filter(c => c.type === 'reinforcing').length,
    conflictingCount: related.filter(c => c.type === 'conflicting').length,
    reinforcingStrength,
    conflictingStrength,
    topReinforcing,
    topConflicting,
    neighborDomains,
    linkedSituationCount: input.situations.filter(s => s.attractorL2 === input.nodeId).length,
    markedSituationCount: input.markupSituations.filter(s => s.attractorL2 === input.nodeId).length,
  }
}

export function useGraphAnalytics() {
  const { attractors } = useAttractorStore()
  const { correlations } = useCorrelationStore()
  const { situations } = useSituationStore()
  const { markupSituations } = useMarkupStore()

  const l2Analytics = computed(() => {
    const result = new Map<string, GraphNodeAnalytics>()
    for (const attr of attractors.value) {
      if (attr.level !== 2) continue
      const analytics = computeGraphNodeAnalytics({
        nodeId: attr.id,
        attractors: attractors.value,
        correlations: correlations.value,
        situations: situations.value,
        markupSituations: markupSituations.value,
      })
      if (analytics) result.set(attr.id, analytics)
    }
    return result
  })

  function getGraphNodeAnalytics(nodeId: string): GraphNodeAnalytics | null {
    return l2Analytics.value.get(nodeId) ?? null
  }

  return {
    l2Analytics,
    getGraphNodeAnalytics,
  }
}
