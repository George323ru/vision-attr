import { ref, readonly } from 'vue'
import type { Situation, SituationCategory } from '@/types/situation'

interface RegistryEntry {
  id: string
  title: string
  description: string
  category: string
  attractorL2: string
  csvAliases: string[]
  active: boolean
}

interface RegistryFile {
  version: string
  generatedAt: string
  totalSituations?: number
  categories: SituationCategory[]
  situations: RegistryEntry[]
}

const situations = ref<Situation[]>([])
const categories = ref<SituationCategory[]>([])
const CATALOG_TOTAL_SITUATIONS = 100
const totalSituations = ref(CATALOG_TOTAL_SITUATIONS)
const loaded = ref(false)

async function loadRegistry(): Promise<void> {
  if (loaded.value) return
  try {
    const resp = await fetch('./data/situations_registry.json')
    if (!resp.ok) {
      console.error(`Ошибка загрузки situations_registry.json: ${resp.status} ${resp.statusText}`)
      return
    }
    const data: RegistryFile = await resp.json()
    categories.value = data.categories
    totalSituations.value = data.totalSituations ?? CATALOG_TOTAL_SITUATIONS
    situations.value = data.situations
      .filter(s => s.active)
      .map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        attractorL2: s.attractorL2,
      }))
    loaded.value = true
  } catch (err) {
    console.error('Не удалось загрузить situations_registry.json:', err)
  }
}

function getSituationById(id: string): Situation | null {
  return situations.value.find(s => s.id === id) ?? null
}

function getSituationsByAttractor(attractorL2: string): Situation[] {
  return situations.value.filter(s => s.attractorL2 === attractorL2)
}

export function useSituationStore() {
  return {
    situations: readonly(situations),
    categories: readonly(categories),
    totalSituations: readonly(totalSituations),
    loaded: readonly(loaded),
    loadRegistry,
    getSituationById,
    getSituationsByAttractor,
  }
}
