// ============================================================
//  THEME SYSTEM
// ============================================================
const THEMES = {
  dark: {
    canvasBg: '#0d0d1a',
    hierEdge: { color: '#3a3a5a', opacity: 0.7 },
    hierEdgeDim: { color: '#181830', opacity: 0.15 },
    fontStroke: '#0d0d1a',
    fontStrokeL1: '#000',
    l12font: '#fff',
    dim: {
      node: { bg: '#1a1a2e', border: '#252540' },
      font: '#2a2a45'
    },
    corrReinforcing: { color: '#34d399', opacity: 0.9 },
    corrConflicting: { color: '#f87171', opacity: 0.9 },
    corrDefault: { color: '#c4c4eeff', opacity: 0.75 },
    focusFont: { color: '#0d0d1a', stroke: '#fbbf24' },
    corrFont: { color: '#1a1400', stroke: '#fffde7' },
    legHier: '#3a3a5a'
  },
  light: {
    canvasBg: '#f4f4f8',
    hierEdge: { color: '#b0b0c0', opacity: 0.6 },
    hierEdgeDim: { color: '#d8d8e0', opacity: 0.25 },
    fontStroke: '#f4f4f8',
    fontStrokeL1: '#f4f4f8',
    l12font: '#111',
    dim: {
      node: { bg: '#e4e4ec', border: '#d0d0da' },
      font: '#c0c0d0'
    },
    corrReinforcing: { color: '#059669', opacity: 0.9 },
    corrConflicting: { color: '#dc2626', opacity: 0.9 },
    corrDefault: { color: '#7070a0', opacity: 0.45 },
    focusFont: { color: '#0d0d1a', stroke: '#fbbf24' },
    corrFont: { color: '#1a1400', stroke: '#fffde7' },
    legHier: '#b0b0c0'
  }
};

let currentTheme = 'light';
function T() { return THEMES[currentTheme]; }

// ============================================================
//  NODE STYLING
// ============================================================
function nc(domain, lvl) {
  const bg = domainColor(domain, lvl);
  const border = domainBorder(domain, lvl);
  return { background: bg, border, highlight: { background: bg, border } };
}

function nodeFont(domain, level) {
  const t = T();
  const d = DOMAINS[domain];
  if (level === 1) {
    return { size: 80, color: t.l12font, bold: true, strokeWidth: 5, strokeColor: t.fontStrokeL1 };
  }
  if (level === 2) {
    return { size: 60, color: t.l12font, bold: false, strokeWidth: 4, strokeColor: t.fontStrokeL1 };
  }
  const fontLightness = currentTheme === 'dark' ? 75 : 15;
  const fontSat = Math.max(10, Math.min(35, Math.round(d.sat * 0.35)));
  return { size: 45, color: `hsl(${d.hue}, ${fontSat}%, ${fontLightness}%)`, strokeWidth: 3, strokeColor: t.fontStroke };
}

function nodeSize(level) {
  if (level === 1) return 200;
  if (level === 2) return 100;
  return 40;
}

function nodeMass(level) {
  if (level === 1) return 10;
  if (level === 2) return 4;
  return 1;
}

// ============================================================
//  BUILD NODES
// ============================================================
function buildNodesData() {
  return ATTRACTORS.map(a => ({
    id: a.id,
    label: a.label,
    level: a.level,
    domain: a.domain,
    parent: a.parent,
    description: a.description || '',
    insights: a.insights || '',
    shape: 'dot',
    size: nodeSize(a.level),
    mass: nodeMass(a.level),
    color: nc(a.domain, a.level),
    borderWidth: a.level === 1 ? 3 : 2,
    font: nodeFont(a.domain, a.level),
    hidden: a.level !== 1   // по умолчанию видны только L1
  }));
}

let nodesData = [];

let ORIG = {};
function storeOrigNodes() {
  ORIG = {};
  nodesData.forEach(n => {
    ORIG[n.id] = {
      color: JSON.parse(JSON.stringify(n.color)),
      font: JSON.parse(JSON.stringify(n.font)),
      borderWidth: n.borderWidth,
      size: n.size,
      hidden: n.hidden
    };
  });
}

// ============================================================
//  BUILD EDGES
// ============================================================
const L1_L2 = 900;
const L2_L3 = 1080;

function buildEdgesData() {
  const edgesArr = [];

  ATTRACTORS.forEach(a => {
    if (a.parent) {
      const len = a.level === 2 ? L1_L2 : L2_L3;
      const w = a.level === 2 ? 9.5 : 5.0;
      edgesArr.push({
        id: `h_${a.id}`,
        from: a.parent,
        to: a.id,
        type: 'hierarchy',
        color: T().hierEdge,
        width: w,
        length: len,
        smooth: { enabled: true, type: 'continuous' },
        arrows: { to: false },
        hidden: true   // иерархические рёбра показываются только при раскрытии
      });
    }
  });

  CORRELATIONS.forEach(c => {
      edgesArr.push({
      id: c.id,
      from: c.from,
      to: c.to,
      type: 'correlation',
      corrData: c,
      color: T().corrDefault,
      width: 7.0,
      smooth: { enabled: true, type: 'curvedCW', roundness: 0.15 },
      arrows: { to: false },
      hidden: false,   // серые корреляции видны всегда
      physics: false
    });
  });

  return edgesArr;
}

let edgesData = [];

let ORIG_EDGE = {};
function storeOrigEdges() {
  ORIG_EDGE = {};
  edgesData.forEach(e => {
    ORIG_EDGE[e.id] = {
      hidden: e.hidden,
      color: JSON.parse(JSON.stringify(e.color)),
      width: e.width
    };
  });
}

// ============================================================
//  vis.DataSet-объекты (заполняются в initNetwork)
// ============================================================
let nodes, edges, network;

// ============================================================
//  EXPAND / COLLAPSE
// ============================================================
const expandedL1 = new Set();
const expandedL2 = new Set();

function getL2Children(l1Id) {
  return ATTRACTORS
    .filter(a => a.level === 2 && a.parent === l1Id)
    .map(a => a.id);
}

function getL3Children(l2Id) {
  return ATTRACTORS
    .filter(a => a.level === 3 && a.parent === l2Id)
    .map(a => a.id);
}

function expandL1(nodeId) {
  if (expandedL1.has(nodeId)) return;
  expandedL1.add(nodeId);

  const children = getL2Children(nodeId);
  if (!children.length) return;

  nodes.update(children.map(id => ({ id, hidden: false })));
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: false })));
}

function collapseL1(nodeId) {
  if (!expandedL1.has(nodeId)) return;
  expandedL1.delete(nodeId);

  const children = getL2Children(nodeId);
  if (!children.length) return;

  children.forEach(collapseL2);

  nodes.update(children.map(id => ({ id, hidden: true })));
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: true })));
}

function toggleL1(nodeId) {
  if (expandedL1.has(nodeId)) {
    collapseL1(nodeId);
  } else {
    expandL1(nodeId);
  }
}

function expandL2(nodeId) {
  if (expandedL2.has(nodeId)) return;

  expandedL2.add(nodeId);
  const children = getL3Children(nodeId);
  if (!children.length) return;

  nodes.update(children.map(id => ({ id, hidden: false })));
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: false })));
}

function collapseL2(nodeId) {
  if (!expandedL2.has(nodeId)) return;
  expandedL2.delete(nodeId);

  const children = getL3Children(nodeId);
  nodes.update(children.map(id => ({ id, hidden: true })));
  edges.update(children.map(id => ({ id: `h_${id}`, hidden: true })));
}

function toggleL2(nodeId) {
  if (expandedL2.has(nodeId)) {
    collapseL2(nodeId);
  } else {
    expandL2(nodeId);
  }
}

function collapseAllL3() {
  Array.from(expandedL2).forEach(collapseL2);
}

function collapseAllL2() {
  Array.from(expandedL1).forEach(collapseL1);
}

function resetExpansionState() {
  expandedL1.clear();
  expandedL2.clear();
}

function snapshotExpansionState() {
  return {
    l1: Array.from(expandedL1),
    l2: Array.from(expandedL2)
  };
}

function restoreExpansionState(snapshot) {
  if (!snapshot) return;

  resetExpansionState();

  // Базовое состояние: видны только L1, все иерархические рёбра скрыты
  nodes.update(
    ATTRACTORS
      .filter(a => a.level !== 1)
      .map(a => ({ id: a.id, hidden: true }))
  );
  edges.update(
    ATTRACTORS
      .filter(a => a.parent)
      .map(a => ({ id: `h_${a.id}`, hidden: true }))
  );

  snapshot.l1.forEach(expandL1);
  snapshot.l2.forEach(expandL2);
}

// ============================================================
//  NETWORK INIT  (вызывается из index.html после загрузки данных)
// ============================================================
function initNetwork() {
  nodesData = buildNodesData();
  storeOrigNodes();

  edgesData = buildEdgesData();
  storeOrigEdges();

  nodes = new vis.DataSet(nodesData);
  edges = new vis.DataSet(edgesData);

  const options = {
    layout: { randomSeed: 42 },
    physics: {
      enabled: true,
      solver: 'barnesHut',
      barnesHut: {
        gravitationalConstant: -5000,
        centralGravity: 0.2,
        springLength: 80,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0
      },
      stabilization: { enabled: true, iterations: 1500, fit: true },
      maxVelocity: 30,
      minVelocity: 0.75,
      timestep: 0.5
    },
    interaction: {
      hover: true,
      tooltipDelay: 300,
      zoomView: true,
      dragView: true,
      dragNodes: true
    },
    nodes: {
      chosen: false,
      shadow: { enabled: false }
    },
    edges: { chosen: false, selectionWidth: 0 },
    autoResize: true
  };

  const container = document.getElementById('network');
  network = new vis.Network(container, { nodes, edges }, options);

  network.once('stabilized', () => {
    network.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
  });
}
