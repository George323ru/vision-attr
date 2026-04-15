import type { ViewState, AppState, PanelRoute, ProfileState } from './types'

export function derivePanelRoute(vs: ViewState): PanelRoute {
  switch (vs.view) {
    case 'scenarios':
      return vs.focus.type === 'grid' ? 'situation-grid' : 'situation-detail'
    case 'graph':
      if (vs.graphMode === 'correlations') return 'graph-correlations'
      return vs.focus.type === 'none' ? 'graph-empty' : 'graph-attractor'
  }
}

export function deriveFocusedNodeId(vs: ViewState): string | null {
  if (vs.view !== 'graph') return null
  switch (vs.focus.type) {
    case 'none': return null
    case 'node': return vs.focus.nodeId
    case 'correlations': return vs.focus.nodeId
  }
}

export function deriveCorrelationAge(vs: ViewState): number | null {
  if (vs.view === 'graph' && vs.focus.type === 'correlations') {
    return vs.focus.age
  }
  return null
}

export function deriveStrategyIdx(vs: ViewState): number | null {
  if (vs.view === 'scenarios' && vs.focus.type === 'detail') {
    return vs.focus.strategyIdx
  }
  return null
}

export function deriveSituationInfo(vs: ViewState): { sitId: string; attrId: string } | null {
  if (vs.view === 'scenarios' && vs.focus.type === 'detail') {
    return { sitId: vs.focus.sitId, attrId: vs.focus.attrId }
  }
  return null
}

export function deriveMidAge(profile: ProfileState): number {
  return Math.round((profile.demographics.ageMin + profile.demographics.ageMax) / 2)
}

export function deriveActiveAttractorIds(profile: ProfileState): Set<string> {
  const ids = new Set<string>()
  for (const id of profile.selectedAttractors) {
    if (id) ids.add(id)
  }
  return ids
}

export function deriveCanGoBack(state: AppState): boolean {
  return state.navHistory.length > 0
}
