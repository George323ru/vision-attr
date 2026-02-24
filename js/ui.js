// ============================================================
//  STATE
// ============================================================
let currentAge = 30;
let currentFocus = null;
let currentSituation = null;
let currentMode = 'graph';     // 'graph' | 'situations'
let currentStrategy = null;
let backSnapshot = null;

// ============================================================
//  FOCUS / DIM STYLES
// ============================================================
function DIM_NODE() {
  const d = T().dim;
  return {
    color: { background: d.node.bg, border: d.node.border, highlight: { background: d.node.bg, border: d.node.border } },
    font: { color: d.font, strokeWidth: 0 },
    borderWidth: 1
  };
}

function FOCUS_NODE(origSize) {
  const t = T();
  return {
    color: { background: '#ffffff', border: '#fbbf24', highlight: { background: '#fffde7', border: '#f59e0b' } },
    font: { color: t.focusFont.color, strokeWidth: 3, strokeColor: t.focusFont.stroke, size: 14 },
    borderWidth: 5,
    size: Math.max(origSize, 28)
  };
}

function CORR_NODE() {
  const t = T();
  return {
    color: { background: '#fffde7', border: '#fbbf24', highlight: { background: '#fff9c4', border: '#f59e0b' } },
    font: { color: t.corrFont.color, strokeWidth: 2, strokeColor: t.corrFont.stroke },
    borderWidth: 3
  };
}

// ============================================================
//  HELPERS
// ============================================================
function getCorrelatedL2Ids(nodeId) {
  const s = new Set();
  CORRELATIONS.forEach(c => {
    const atAge = getCorrelationAtAge(c, currentAge);
    if (!atAge) return;
    if (c.from === nodeId) s.add(c.to);
    if (c.to === nodeId) s.add(c.from);
  });
  return s;
}

function getCorrEdgesForNode(nodeId) {
  const arr = [];
  CORRELATIONS.forEach(c => {
    if (c.from === nodeId || c.to === nodeId) {
      const atAge = getCorrelationAtAge(c, currentAge);
      if (atAge) arr.push({ corrId: c.id, ...atAge });
    }
  });
  return arr;
}

// ============================================================
//  FOCUS & RESET
// ============================================================
function applyFocus(nodeId) {
  currentFocus = nodeId;
  const node = nodes.get(nodeId);
  const correlated = getCorrelatedL2Ids(nodeId);
  const corrEdges = getCorrEdgesForNode(nodeId);
  const t = T();

  // L3-дети развёрнутого L2 показываются в своих оригинальных цветах
  const expandedChildren = new Set(getL3Children(nodeId));

  const nu = [];
  nodes.forEach(n => {
    if (n.hidden) return;   // пропускаем скрытые узлы

    if (n.id === nodeId) {
      nu.push({ id: n.id, ...FOCUS_NODE(ORIG[n.id].size) });
    } else if (expandedChildren.has(n.id)) {
      // L3-дочерние узлы активного L2 — показываем в оригинальном стиле
      nu.push({
        id: n.id,
        color:       ORIG[n.id].color,
        font:        ORIG[n.id].font,
        borderWidth: ORIG[n.id].borderWidth,
        size:        ORIG[n.id].size
      });
    } else if (correlated.has(n.id)) {
      nu.push({ id: n.id, ...CORR_NODE() });
    } else {
      nu.push({ id: n.id, ...DIM_NODE() });
    }
  });
  nodes.update(nu);

  const eu = [];
  edges.forEach(e => {
    const corrInfo = corrEdges.find(ce => ce.corrId === e.id);
    if (corrInfo) {
      const corrColor = corrInfo.type === 'reinforcing' ? t.corrReinforcing : t.corrConflicting;
      eu.push({ id: e.id, hidden: false, color: corrColor, width: 1 + corrInfo.strength * 4 });
    } else if (e.type === 'hierarchy') {
      eu.push({ id: e.id, color: t.hierEdgeDim, width: 0.5 });
    } else if (e.type === 'correlation') {
      eu.push({ id: e.id, hidden: false, color: ORIG_EDGE[e.id].color, width: ORIG_EDGE[e.id].width });
    }
  });
  edges.update(eu);

  document.getElementById('focus-name').textContent = node.label.replace(/\n/g, ' ');
  document.getElementById('focus-count').textContent = correlated.size;
  document.getElementById('focus-panel').classList.add('visible');

  showAttractorPanel(nodeId);
}

function resetGraphVisuals() {
  currentFocus = null;
  currentSituation = null;
  currentStrategy = null;

  nodes.update(nodes.map(n => ({
    id:          n.id,
    color:       ORIG[n.id].color,
    font:        ORIG[n.id].font,
    borderWidth: ORIG[n.id].borderWidth,
    size:        ORIG[n.id].size,
    hidden:      ORIG[n.id].hidden
  })));

  edges.update(edges.map(e => ({
    id:     e.id,
    hidden: ORIG_EDGE[e.id].hidden,
    color:  ORIG_EDGE[e.id].color,
    width:  ORIG_EDGE[e.id].width
  })));

  document.getElementById('focus-panel').classList.remove('visible');
}

function clearFocusVisualsPreserveVisibility() {
  currentFocus = null;
  currentSituation = null;
  currentStrategy = null;

  nodes.update(nodes.map(n => ({
    id:          n.id,
    color:       ORIG[n.id].color,
    font:        ORIG[n.id].font,
    borderWidth: ORIG[n.id].borderWidth,
    size:        ORIG[n.id].size
  })));

  edges.update(edges.map(e => {
    if (e.type === 'correlation') {
      return {
        id: e.id,
        hidden: false,
        color: ORIG_EDGE[e.id].color,
        width: ORIG_EDGE[e.id].width
      };
    }
    return {
      id: e.id,
      color: ORIG_EDGE[e.id].color,
      width: ORIG_EDGE[e.id].width
    };
  }));

  document.getElementById('focus-panel').classList.remove('visible');
}

function resetDefault() {
  currentMode = 'graph';
  document.getElementById('situations-btn').classList.remove('active');
  backSnapshot = null;
  collapseAllL2();
  resetGraphVisuals();
  resetRightPanel();
}

// ============================================================
//  RIGHT PANEL — 4 STATES (empty / all situations / attractor / situation detail)
// ============================================================
function resetRightPanel() {
  document.querySelector('#right-panel-header h2').textContent = 'Предиктивный анализ';
  document.querySelector('#right-panel-header .rp-desc').textContent = 'Выберите категорию на графе';
  document.getElementById('right-panel-content').innerHTML =
    '<div class="rp-empty">Кликните на узел категории (L2)<br>на графе для анализа<br>поведенческих стратегий</div>';
}

function showAllSituations() {
  currentMode = 'situations';
  currentStrategy = null;
  document.getElementById('situations-btn').classList.add('active');

  resetGraphVisuals();

  document.querySelector('#right-panel-header h2').textContent = 'Все ситуации';
  document.querySelector('#right-panel-header .rp-desc').textContent = 'Выберите ситуацию для анализа';

  const content = document.getElementById('right-panel-content');

  content.innerHTML = SITUATIONS.map(s => {
    const attr = ATTRACTORS.find(a => a.id === s.attractorL2);
    const domain = attr ? DOMAINS[attr.domain] : null;
    return `
      <div class="situation-card" data-sit-id="${s.id}" data-attr-id="${s.attractorL2}"
           style="border-left-color: ${domain ? domain.color : '#888'}">
        <div class="sc-title">${s.title}</div>
        <div class="sc-desc">${attr ? attr.label : ''}</div>
      </div>
    `;
  }).join('');

  content.querySelectorAll('.situation-card').forEach(card => {
    card.addEventListener('click', () => {
      const attrId = card.dataset.attrId;
      const sitId = card.dataset.sitId;
      applyFocus(attrId);
      showSituationPanel(attrId, sitId);
    });
  });
}

function showAttractorPanel(nodeId) {
  currentSituation = null;
  const attr = ATTRACTORS.find(a => a.id === nodeId);
  if (!attr) return;

  const domain = DOMAINS[attr.domain];
  document.querySelector('#right-panel-header h2').textContent = attr.label;
  document.querySelector('#right-panel-header .rp-desc').textContent = domain.name + ' — категория';

  const sits = SITUATIONS.filter(s => s.attractorL2 === nodeId);
  const content = document.getElementById('right-panel-content');

  if (sits.length === 0) {
    // Показываем описание аттрактора если нет ситуаций
    const desc = attr.description
      ? `<div class="rp-description">${attr.description}</div>`
      : '<div class="rp-empty">Нет ситуаций для данной категории</div>';

    const l3List = ATTRACTORS
      .filter(a => a.parent === nodeId)
      .map(a => `<div class="l3-item">${a.label}</div>`)
      .join('');

    content.innerHTML = desc + (l3List
      ? `<div class="l3-section"><div class="l3-title">Аттракторы (L3):</div>${l3List}</div>`
      : '');
    return;
  }

  content.innerHTML = sits.map(s => `
    <div class="situation-card" data-sit-id="${s.id}" data-attr-id="${nodeId}"
         style="border-left-color: ${domain.color}">
      <div class="sc-title">${s.title}</div>
      <div class="sc-desc">${s.description}</div>
    </div>
  `).join('');

  content.querySelectorAll('.situation-card').forEach(card => {
    card.addEventListener('click', () => {
      showSituationPanel(card.dataset.attrId, card.dataset.sitId);
    });
  });
}

function showL3Panel(nodeId) {
  const attr = ATTRACTORS.find(a => a.id === nodeId);
  if (!attr) return;

  const domain = DOMAINS[attr.domain];
  document.querySelector('#right-panel-header h2').textContent = attr.label;
  document.querySelector('#right-panel-header .rp-desc').textContent = domain.name + ' — аттрактор L3';

  const parentAttr = ATTRACTORS.find(a => a.id === attr.parent);
  const content = document.getElementById('right-panel-content');
  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="applyFocus('${attr.parent}')">${parentAttr ? parentAttr.label : ''}</a>
      <span>›</span>
      <span>${attr.label}</span>
    </div>
    ${attr.description ? `<div class="rp-description">${attr.description}</div>` : ''}
  `;
}

function showSituationPanel(attrId, sitId) {
  currentSituation = { attrId, sitId };
  currentStrategy = null;
  const attr = ATTRACTORS.find(a => a.id === attrId);
  const sit = SITUATIONS.find(s => s.id === sitId);
  if (!attr || !sit) return;

  document.querySelector('#right-panel-header h2').textContent = sit.title;
  document.querySelector('#right-panel-header .rp-desc').textContent = 'Поведенческий прогноз';

  const backAction = currentMode === 'situations'
    ? `showAllSituations()`
    : `backToAttractor('${attrId}')`;
  const backLabel = currentMode === 'situations' ? '&#8592; Все ситуации' : '&#8592; Назад к ситуациям';
  const breadcrumbFirst = currentMode === 'situations'
    ? `<a onclick="showAllSituations()">Ситуации</a><span>›</span><span>${attr.label}</span>`
    : `<a onclick="backToAttractor('${attrId}')">${attr.label}</a>`;

  const content = document.getElementById('right-panel-content');
  content.innerHTML = `
    <div class="breadcrumb">
      ${breadcrumbFirst}
      <span>›</span>
      <span>${sit.title}</span>
    </div>
    <div class="sit-description">${sit.description}</div>
    <div id="strategies-container"></div>
    <button class="btn-back" onclick="${backAction}">${backLabel}</button>
  `;

  renderStrategies();
}

function renderStrategies() {
  if (!currentSituation) return;
  const { attrId, sitId } = currentSituation;
  const predictions = predictBehavior(attrId, sitId, currentAge);
  const container = document.getElementById('strategies-container');
  if (!container) return;

  const barColors = ['var(--bar-positive)', 'var(--bar-neutral)', 'var(--bar-negative)', 'var(--text-muted)'];

  container.innerHTML = predictions.map((p, i) => `
    <div class="strategy-item" data-strategy-idx="${i}">
      <div class="strategy-label">
        <span>${p.name}</span>
        <span class="sl-pct">${p.probability}%</span>
      </div>
      <div class="strategy-bar-track">
        <div class="strategy-bar-fill" style="width: 0%; background: ${barColors[Math.min(i, barColors.length - 1)]}"></div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.strategy-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.strategyIdx);
      container.querySelectorAll('.strategy-item').forEach(el => el.classList.remove('selected'));
      if (currentStrategy === idx) {
        currentStrategy = null;
      } else {
        currentStrategy = idx;
        item.classList.add('selected');
      }
    });
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.querySelectorAll('.strategy-bar-fill').forEach((bar, i) => {
        bar.style.width = predictions[i].probability + '%';
      });
    });
  });
}

function backToAttractor(attrId) {
  if (currentMode === 'situations') {
    showAllSituations();
  } else if (currentFocus === attrId) {
    showAttractorPanel(attrId);
  }
}

// ============================================================
//  AGE SLIDER
// ============================================================
function updateCorrelationsForAge(age) {
  currentAge = age;
  if (!currentFocus) return;

  const corrEdges = getCorrEdgesForNode(currentFocus);
  const correlated = getCorrelatedL2Ids(currentFocus);
  const t = T();

  const nu = [];
  nodes.forEach(n => {
    if (n.hidden) return;   // пропускаем скрытые узлы
    if (n.id === currentFocus) return;
    if (correlated.has(n.id)) {
      nu.push({ id: n.id, ...CORR_NODE() });
    } else if (ORIG[n.id]) {
      nu.push({ id: n.id, ...DIM_NODE() });
    }
  });
  nodes.update(nu);

  const eu = [];
  edges.forEach(e => {
    if (e.type !== 'correlation') return;
    const corrInfo = corrEdges.find(ce => ce.corrId === e.id);
    if (corrInfo) {
      const corrColor = corrInfo.type === 'reinforcing' ? t.corrReinforcing : t.corrConflicting;
      eu.push({ id: e.id, hidden: false, color: corrColor, width: 1 + corrInfo.strength * 4 });
    } else {
      eu.push({ id: e.id, hidden: false, color: ORIG_EDGE[e.id].color, width: ORIG_EDGE[e.id].width });
    }
  });
  edges.update(eu);

  document.getElementById('focus-count').textContent = correlated.size;

  if (currentSituation) renderStrategies();
}

// ============================================================
//  THEME SWITCH
// ============================================================
function applyTheme(theme) {
  currentTheme = theme;
  document.body.classList.toggle('light', theme === 'light');
  document.getElementById('theme-label').textContent = theme;
  document.getElementById('leg-hier-line').style.background = T().legHier;

  // Перестроить данные узлов/рёбер и сбросить состояние раскрытий
  resetExpansionState();
  nodesData = buildNodesData();
  storeOrigNodes();
  edgesData = buildEdgesData();
  storeOrigEdges();

  if (currentFocus !== null) {
    const fid = currentFocus;
    nodes.update(nodes.map(n => ({
      id:          n.id,
      color:       ORIG[n.id].color,
      font:        ORIG[n.id].font,
      borderWidth: ORIG[n.id].borderWidth,
      size:        ORIG[n.id].size,
      hidden:      ORIG[n.id].hidden
    })));
    edges.update(edges.map(e => ({
      id:     e.id,
      hidden: ORIG_EDGE[e.id].hidden,
      color:  ORIG_EDGE[e.id].color,
      width:  ORIG_EDGE[e.id].width
    })));
    applyFocus(fid);
  } else {
    resetDefault();
  }
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ UI (вызывается из index.html после initNetwork)
// ============================================================
function initUI() {

  // ── DOM события ──────────────────────────────────────────
  document.getElementById('age-slider').addEventListener('input', function () {
    const age = parseInt(this.value);
    document.getElementById('age-value').textContent = age;
    updateCorrelationsForAge(age);
  });

  document.getElementById('situations-btn').addEventListener('click', () => {
    if (currentMode === 'situations') {
      resetDefault();
    } else {
      showAllSituations();
    }
  });

  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // ── Сетевые события ──────────────────────────────────────
  network.on('selectNode', function (params) {
    if (!params.nodes.length) return;
    const nodeId = params.nodes[0];
    const node = nodes.get(nodeId);

    if (node.level === 1) {
      currentMode = 'graph';
      document.getElementById('situations-btn').classList.remove('active');
      backSnapshot = null;
      clearFocusVisualsPreserveVisibility();
      toggleL1(nodeId);
      showAttractorPanel(nodeId);
    } else if (node.level === 2) {
      currentMode = 'graph';
      document.getElementById('situations-btn').classList.remove('active');
      backSnapshot = snapshotExpansionState();
      toggleL2(nodeId);
      applyFocus(nodeId);
    } else if (node.level === 3) {
      // L3: показываем детали без изменения focus
      showL3Panel(nodeId);
      setTimeout(() => network.unselectAll(), 0);
    }
  });

  network.on('click', function (params) {
    if (params.nodes.length === 0 && params.edges.length === 0) {
      if (currentFocus !== null && backSnapshot) {
        restoreExpansionState(backSnapshot);
        backSnapshot = null;
        clearFocusVisualsPreserveVisibility();
        resetRightPanel();
      } else {
        resetDefault();
      }
    }
  });
}
