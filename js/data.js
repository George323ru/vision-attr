// ============================================================
//  DOMAINS  (заполняется через loadAttractionData)
// ============================================================
let DOMAINS = {};

function domainColor(domain, lvl) {
  const d = DOMAINS[domain];
  if (!d) return '#888';
  const sat = Math.max(8, Math.min(26, Math.round(d.sat * 0.28)));
  const lightness = lvl === 1 ? 74 : lvl === 2 ? 80 : 86;
  return `hsl(${d.hue}, ${sat}%, ${lightness}%)`;
}

function domainBorder(domain, lvl) {
  const d = DOMAINS[domain];
  if (!d) return '#666';
  const sat = Math.max(10, Math.min(30, Math.round(d.sat * 0.35)));
  const lightness = lvl === 1 ? 62 : lvl === 2 ? 68 : 74;
  return `hsl(${d.hue}, ${sat}%, ${lightness}%)`;
}

// ============================================================
//  ATTRACTORS  (заполняется через loadAttractionData)
// ============================================================
let ATTRACTORS = [];
let L2_IDS = [];

// ============================================================
//  CORRELATIONS — связи между L2-узлами
//  type: 'reinforcing' (усиление) | 'conflicting' (конфликт)
//  strength: 0.0–1.0
// ============================================================
const CORRELATIONS = [
  // ── УСИЛЕНИЕ ──────────────────────────────────────────────
  {
    id: 'c01', from: 'l2_rabota_01', to: 'l2_byt_03', baseType: 'reinforcing',
    ageRanges: [{ min: 22, max: 75, strength: 0.8, type: 'reinforcing' }]
  },
  {
    id: 'c02', from: 'l2_samorazv_01', to: 'l2_rabota_01', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 50, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c03', from: 'l2_rabota_02', to: 'l2_samorazv_03', baseType: 'reinforcing',
    ageRanges: [{ min: 25, max: 65, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c04', from: 'l2_telo_02', to: 'l2_telo_03', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 65, strength: 0.75, type: 'reinforcing' }]
  },
  {
    id: 'c05', from: 'l2_semya_02', to: 'l2_semya_04', baseType: 'reinforcing',
    ageRanges: [{ min: 20, max: 70, strength: 0.8, type: 'reinforcing' }]
  },
  {
    id: 'c06', from: 'l2_semya_03', to: 'l2_semya_04', baseType: 'reinforcing',
    ageRanges: [{ min: 25, max: 60, strength: 0.85, type: 'reinforcing' }]
  },
  {
    id: 'c07', from: 'l2_sotsiium_03', to: 'l2_sotsiium_07', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 55, strength: 0.65, type: 'reinforcing' }]
  },
  {
    id: 'c08', from: 'l2_stabilnost_04', to: 'l2_stabilnost_01', baseType: 'reinforcing',
    ageRanges: [{ min: 30, max: 75, strength: 0.8, type: 'reinforcing' }]
  },
  {
    id: 'c09', from: 'l2_byt_03', to: 'l2_stabilnost_01', baseType: 'reinforcing',
    ageRanges: [{ min: 25, max: 75, strength: 0.75, type: 'reinforcing' }]
  },
  {
    id: 'c10', from: 'l2_byt_01', to: 'l2_stabilnost_04', baseType: 'reinforcing',
    ageRanges: [{ min: 28, max: 75, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c11', from: 'l2_uvlechenia_04', to: 'l2_stabilnost_06', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 70, strength: 0.6, type: 'reinforcing' }]
  },
  {
    id: 'c12', from: 'l2_ubezhdenia_01', to: 'l2_samorazv_02', baseType: 'reinforcing',
    ageRanges: [{ min: 30, max: 75, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c13', from: 'l2_ubezhdenia_05', to: 'l2_nezav_02', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 75, strength: 0.65, type: 'reinforcing' }]
  },
  {
    id: 'c14', from: 'l2_uvlechenia_05', to: 'l2_samorazv_04', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 65, strength: 0.6, type: 'reinforcing' }]
  },
  {
    id: 'c15', from: 'l2_stabilnost_02', to: 'l2_stabilnost_03', baseType: 'reinforcing',
    ageRanges: [{ min: 25, max: 75, strength: 0.65, type: 'reinforcing' }]
  },
  {
    id: 'c16', from: 'l2_samorazv_05', to: 'l2_rabota_01', baseType: 'reinforcing',
    ageRanges: [{ min: 22, max: 55, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c17', from: 'l2_uvlechenia_02', to: 'l2_telo_02', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 75, strength: 0.6, type: 'reinforcing' }]
  },
  {
    id: 'c18', from: 'l2_ubezhdenia_07', to: 'l2_ubezhdenia_05', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 75, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c19', from: 'l2_nezav_01', to: 'l2_rabota_02', baseType: 'reinforcing',
    ageRanges: [{ min: 22, max: 60, strength: 0.65, type: 'reinforcing' }]
  },
  {
    id: 'c20', from: 'l2_samorazv_05', to: 'l2_samorazv_03', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 55, strength: 0.7, type: 'reinforcing' }]
  },
  {
    id: 'c21', from: 'l2_sotsiium_08', to: 'l2_rabota_01', baseType: 'reinforcing',
    ageRanges: [{ min: 25, max: 60, strength: 0.65, type: 'reinforcing' }]
  },
  {
    id: 'c22', from: 'l2_telo_03', to: 'l2_stabilnost_06', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 65, strength: 0.6, type: 'reinforcing' }]
  },
  // ── КОНФЛИКТ ──────────────────────────────────────────────
  {
    id: 'c23', from: 'l2_rabota_01', to: 'l2_semya_04', baseType: 'conflicting',
    ageRanges: [{ min: 25, max: 50, strength: 0.7, type: 'conflicting' }]
  },
  {
    id: 'c24', from: 'l2_rabota_01', to: 'l2_semya_03', baseType: 'conflicting',
    ageRanges: [{ min: 28, max: 45, strength: 0.75, type: 'conflicting' }]
  },
  {
    id: 'c25', from: 'l2_nezav_02', to: 'l2_semya_02', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 40, strength: 0.65, type: 'conflicting' }]
  },
  {
    id: 'c26', from: 'l2_perezhiv_06', to: 'l2_stabilnost_06', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 75, strength: 0.6, type: 'conflicting' }]
  },
  {
    id: 'c27', from: 'l2_perezhiv_02', to: 'l2_telo_02', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 65, strength: 0.8, type: 'conflicting' }]
  },
  {
    id: 'c28', from: 'l2_perezhiv_08', to: 'l2_sotsiium_07', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 75, strength: 0.75, type: 'conflicting' }]
  },
  {
    id: 'c29', from: 'l2_perezhiv_03', to: 'l2_stabilnost_02', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 45, strength: 0.7, type: 'conflicting' }]
  },
  {
    id: 'c30', from: 'l2_sotsiium_04', to: 'l2_nezav_02', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 40, strength: 0.65, type: 'conflicting' }]
  },
  {
    id: 'c31', from: 'l2_sotsiium_04', to: 'l2_ubezhdenia_05', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 55, strength: 0.6, type: 'conflicting' }]
  },
  {
    id: 'c32', from: 'l2_perezhiv_07', to: 'l2_sotsiium_07', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 65, strength: 0.7, type: 'conflicting' }]
  },
  {
    id: 'c33', from: 'l2_samorazv_05', to: 'l2_stabilnost_05', baseType: 'conflicting',
    ageRanges: [{ min: 22, max: 50, strength: 0.55, type: 'conflicting' }]
  },
  // ── ДОПОЛНИТЕЛЬНЫЕ УСИЛЕНИЯ ───────────────────────────────
  {
    id: 'c34', from: 'l2_byt_02', to: 'l2_stabilnost_03', baseType: 'reinforcing',
    ageRanges: [{ min: 24, max: 75, strength: 0.68, type: 'reinforcing' }]
  },
  {
    id: 'c35', from: 'l2_nezav_03', to: 'l2_rabota_03', baseType: 'reinforcing',
    ageRanges: [{ min: 20, max: 58, strength: 0.62, type: 'reinforcing' }]
  },
  {
    id: 'c36', from: 'l2_perezhiv_01', to: 'l2_samorazv_04', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 45, strength: 0.6, type: 'reinforcing' }]
  },
  {
    id: 'c37', from: 'l2_perezhiv_05', to: 'l2_uvlechenia_03', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 55, strength: 0.64, type: 'reinforcing' }]
  },
  {
    id: 'c38', from: 'l2_semya_01', to: 'l2_byt_01', baseType: 'reinforcing',
    ageRanges: [{ min: 22, max: 75, strength: 0.72, type: 'reinforcing' }]
  },
  {
    id: 'c39', from: 'l2_semya_05', to: 'l2_sotsiium_02', baseType: 'reinforcing',
    ageRanges: [{ min: 25, max: 70, strength: 0.58, type: 'reinforcing' }]
  },
  {
    id: 'c40', from: 'l2_sotsiium_01', to: 'l2_rabota_03', baseType: 'reinforcing',
    ageRanges: [{ min: 21, max: 60, strength: 0.61, type: 'reinforcing' }]
  },
  {
    id: 'c41', from: 'l2_sotsiium_06', to: 'l2_uvlechenia_06', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 55, strength: 0.59, type: 'reinforcing' }]
  },
  {
    id: 'c42', from: 'l2_stabilnost_05', to: 'l2_stabilnost_01', baseType: 'reinforcing',
    ageRanges: [{ min: 30, max: 75, strength: 0.66, type: 'reinforcing' }]
  },
  {
    id: 'c43', from: 'l2_telo_01', to: 'l2_samorazv_02', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 65, strength: 0.57, type: 'reinforcing' }]
  },
  {
    id: 'c44', from: 'l2_ubezhdenia_02', to: 'l2_nezav_01', baseType: 'reinforcing',
    ageRanges: [{ min: 20, max: 70, strength: 0.63, type: 'reinforcing' }]
  },
  {
    id: 'c45', from: 'l2_ubezhdenia_04', to: 'l2_semya_05', baseType: 'reinforcing',
    ageRanges: [{ min: 24, max: 72, strength: 0.56, type: 'reinforcing' }]
  },
  {
    id: 'c46', from: 'l2_uvlechenia_01', to: 'l2_samorazv_01', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 50, strength: 0.65, type: 'reinforcing' }]
  },
  {
    id: 'c47', from: 'l2_uvlechenia_06', to: 'l2_telo_01', baseType: 'reinforcing',
    ageRanges: [{ min: 18, max: 68, strength: 0.54, type: 'reinforcing' }]
  },
  {
    id: 'c48', from: 'l2_byt_03', to: 'l2_semya_01', baseType: 'reinforcing',
    ageRanges: [{ min: 23, max: 75, strength: 0.67, type: 'reinforcing' }]
  },
  // ── ДОПОЛНИТЕЛЬНЫЕ КОНФЛИКТЫ ──────────────────────────────
  {
    id: 'c49', from: 'l2_rabota_03', to: 'l2_semya_01', baseType: 'conflicting',
    ageRanges: [{ min: 23, max: 48, strength: 0.66, type: 'conflicting' }]
  },
  {
    id: 'c50', from: 'l2_nezav_03', to: 'l2_semya_03', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 42, strength: 0.63, type: 'conflicting' }]
  },
  {
    id: 'c51', from: 'l2_perezhiv_04', to: 'l2_stabilnost_03', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 50, strength: 0.69, type: 'conflicting' }]
  },
  {
    id: 'c52', from: 'l2_perezhiv_01', to: 'l2_telo_03', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 60, strength: 0.58, type: 'conflicting' }]
  },
  {
    id: 'c53', from: 'l2_sotsiium_02', to: 'l2_nezav_01', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 38, strength: 0.61, type: 'conflicting' }]
  },
  {
    id: 'c54', from: 'l2_sotsiium_05', to: 'l2_ubezhdenia_02', baseType: 'conflicting',
    ageRanges: [{ min: 20, max: 52, strength: 0.57, type: 'conflicting' }]
  },
  {
    id: 'c55', from: 'l2_stabilnost_06', to: 'l2_uvlechenia_01', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 55, strength: 0.56, type: 'conflicting' }]
  },
  {
    id: 'c56', from: 'l2_stabilnost_02', to: 'l2_rabota_03', baseType: 'conflicting',
    ageRanges: [{ min: 22, max: 58, strength: 0.62, type: 'conflicting' }]
  },
  {
    id: 'c57', from: 'l2_telo_01', to: 'l2_perezhiv_06', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 65, strength: 0.64, type: 'conflicting' }]
  },
  {
    id: 'c58', from: 'l2_ubezhdenia_03', to: 'l2_sotsiium_05', baseType: 'conflicting',
    ageRanges: [{ min: 19, max: 60, strength: 0.55, type: 'conflicting' }]
  },
  {
    id: 'c59', from: 'l2_ubezhdenia_06', to: 'l2_samorazv_04', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 48, strength: 0.59, type: 'conflicting' }]
  },
  {
    id: 'c60', from: 'l2_uvlechenia_03', to: 'l2_stabilnost_04', baseType: 'conflicting',
    ageRanges: [{ min: 21, max: 62, strength: 0.54, type: 'conflicting' }]
  },
  {
    id: 'c61', from: 'l2_semya_05', to: 'l2_nezav_03', baseType: 'conflicting',
    ageRanges: [{ min: 18, max: 45, strength: 0.65, type: 'conflicting' }]
  },
  {
    id: 'c62', from: 'l2_byt_02', to: 'l2_ubezhdenia_04', baseType: 'conflicting',
    ageRanges: [{ min: 24, max: 70, strength: 0.53, type: 'conflicting' }]
  },
  {
    id: 'c63', from: 'l2_samorazv_01', to: 'l2_stabilnost_06', baseType: 'conflicting',
    ageRanges: [{ min: 20, max: 55, strength: 0.6, type: 'conflicting' }]
  },
];
// SITUATIONS объявлен в situations.js

// ============================================================
//  ЗАГРУЗКА ДАННЫХ
// ============================================================
async function loadAttractionData() {
  const r = await fetch('data/attractors.json');
  if (!r.ok) throw new Error(`Не удалось загрузить data/attractors.json (HTTP ${r.status})`);
  const data = await r.json();

  DOMAINS = {};
  data.domains.forEach(d => {
    DOMAINS[d.id] = { name: d.name, hue: d.hue, sat: d.sat, color: d.color };
  });

  ATTRACTORS = data.attractors;
  L2_IDS = ATTRACTORS.filter(a => a.level === 2).map(a => a.id);

  const l1 = ATTRACTORS.filter(a => a.level === 1).length;
  const l2 = L2_IDS.length;
  const l3 = ATTRACTORS.filter(a => a.level === 3).length;
  console.log(`[data] Загружено: ${l1} L1, ${l2} L2, ${l3} L3`);
}

// ============================================================
//  ВОЗРАСТНАЯ ЛОГИКА КОРРЕЛЯЦИЙ
// ============================================================
function getCorrelationAtAge(corr, age) {
  for (const r of corr.ageRanges) {
    if (age >= r.min && age <= r.max) {
      const fade = Math.min((age - r.min) / 3, (r.max - age) / 3, 1);
      return { strength: r.strength * Math.max(fade, 0.3), type: r.type };
    }
  }
  return null;
}
