import { ref } from 'vue'

// ── Значения по умолчанию ──────────────────────────────────────────────────
const DEFAULTS = {
  nodeSizeL1: 335,
  nodeSizeL2: 140,
  nodeSizeL3: 48,
  fontSizeL1: 120,
  fontSizeL2: 78,
  fontSizeL3: 49,
  corrReinforcingColor: '#0891b2',
  corrConflictingColor: '#dc2626',
  corrDefaultColor: '#d4d4d4',
  corrDefaultOpacity: 0.55,
  corrDefaultWidth: 7,
  hierEdgeColor: '#b0b0c0',
  hierEdgeOpacity: 0.85,
  hierWidthL12: 17.5,
  hierWidthL23: 6.0,
} as const

// ── Singleton state ────────────────────────────────────────────────────────
// Размеры нод
const nodeSizeL1 = ref(DEFAULTS.nodeSizeL1)
const nodeSizeL2 = ref(DEFAULTS.nodeSizeL2)
const nodeSizeL3 = ref(DEFAULTS.nodeSizeL3)

// Размеры шрифтов
const fontSizeL1 = ref(DEFAULTS.fontSizeL1)
const fontSizeL2 = ref(DEFAULTS.fontSizeL2)
const fontSizeL3 = ref(DEFAULTS.fontSizeL3)

// Рёбра корреляций
const corrReinforcingColor = ref(DEFAULTS.corrReinforcingColor)
const corrConflictingColor = ref(DEFAULTS.corrConflictingColor)
const corrDefaultColor = ref(DEFAULTS.corrDefaultColor)
const corrDefaultOpacity = ref(DEFAULTS.corrDefaultOpacity)
const corrDefaultWidth = ref(DEFAULTS.corrDefaultWidth)

// Иерархические рёбра
const hierEdgeColor = ref(DEFAULTS.hierEdgeColor)
const hierEdgeOpacity = ref(DEFAULTS.hierEdgeOpacity)
const hierWidthL12 = ref(DEFAULTS.hierWidthL12)
const hierWidthL23 = ref(DEFAULTS.hierWidthL23)

// Триггер ребилда графа
const settingsVersion = ref(0)

function applySettings() {
  settingsVersion.value++
}

function resetToDefaults() {
  nodeSizeL1.value = DEFAULTS.nodeSizeL1
  nodeSizeL2.value = DEFAULTS.nodeSizeL2
  nodeSizeL3.value = DEFAULTS.nodeSizeL3
  fontSizeL1.value = DEFAULTS.fontSizeL1
  fontSizeL2.value = DEFAULTS.fontSizeL2
  fontSizeL3.value = DEFAULTS.fontSizeL3
  corrReinforcingColor.value = DEFAULTS.corrReinforcingColor
  corrConflictingColor.value = DEFAULTS.corrConflictingColor
  corrDefaultColor.value = DEFAULTS.corrDefaultColor
  corrDefaultOpacity.value = DEFAULTS.corrDefaultOpacity
  corrDefaultWidth.value = DEFAULTS.corrDefaultWidth
  hierEdgeColor.value = DEFAULTS.hierEdgeColor
  hierEdgeOpacity.value = DEFAULTS.hierEdgeOpacity
  hierWidthL12.value = DEFAULTS.hierWidthL12
  hierWidthL23.value = DEFAULTS.hierWidthL23
  applySettings()
}

export function useVisualSettings() {
  return {
    // Node sizes
    nodeSizeL1,
    nodeSizeL2,
    nodeSizeL3,
    // Font sizes
    fontSizeL1,
    fontSizeL2,
    fontSizeL3,
    // Correlation edges
    corrReinforcingColor,
    corrConflictingColor,
    corrDefaultColor,
    corrDefaultOpacity,
    corrDefaultWidth,
    // Hierarchy edges
    hierEdgeColor,
    hierEdgeOpacity,
    hierWidthL12,
    hierWidthL23,
    // Rebuild trigger
    settingsVersion,
    applySettings,
    resetToDefaults,
  }
}
