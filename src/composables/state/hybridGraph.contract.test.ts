import { derivePanelRoute } from './selectors'
import type { Action, PanelRoute, ViewState } from './types'

type AssertNever<T extends never> = T

type _NoGraphModeAction = AssertNever<Extract<Action, { type: 'SET_GRAPH_MODE' }>>

const selectedL3State: ViewState = {
  view: 'graph',
  focus: { type: 'node', nodeId: 'l3_example', level: 3 },
}

const showCorrelationsAction: Action = {
  type: 'SHOW_NODE_CORRELATIONS',
  nodeId: 'l2_example',
}

const focusedCorrelationState: ViewState = {
  view: 'graph',
  focus: { type: 'correlations', nodeId: 'l2_example' },
}

const route: PanelRoute = derivePanelRoute(focusedCorrelationState)

void selectedL3State
void showCorrelationsAction
void route
