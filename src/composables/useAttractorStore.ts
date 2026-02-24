import { ref, computed } from 'vue'
import type { DomainMap } from '@/types/domain'
import type { Attractor } from '@/types/attractor'

type RawDomain = { id: string; name: string; hue: number; sat: number; color: string }

const domains = ref<DomainMap>({})
const attractors = ref<Attractor[]>([])

const l2Ids = computed(() =>
  attractors.value.filter(a => a.level === 2).map(a => a.id)
)

async function loadData(): Promise<void> {
  const r = await fetch('/data/attractors.json')
  if (!r.ok) throw new Error(`Не удалось загрузить data/attractors.json (HTTP ${r.status})`)
  const data = await r.json()

  const d: DomainMap = {}
  data.domains.forEach((dm: RawDomain) => {
    d[dm.id] = { name: dm.name, hue: dm.hue, sat: dm.sat, color: dm.color }
  })
  domains.value = d

  const attrData = data.attractors as Attractor[]
  attractors.value = attrData

  const l1 = attrData.filter(a => a.level === 1).length
  const l2 = attrData.filter(a => a.level === 2).length
  const l3 = attrData.filter(a => a.level === 3).length
  console.log(`[data] Загружено: ${l1} L1, ${l2} L2, ${l3} L3`)
}

function getAttractor(id: string): Attractor | undefined {
  return attractors.value.find(a => a.id === id)
}

function getChildren(parentId: string): string[] {
  return attractors.value
    .filter(a => a.parent === parentId)
    .map(a => a.id)
}

export function useAttractorStore() {
  return {
    domains,
    attractors,
    l2Ids,
    loadData,
    getAttractor,
    getChildren,
  }
}
