import { computed, type Ref } from 'vue'
import { useAttractorStore } from './useAttractorStore'

export function useAttractorDisplay(nodeId: Ref<string>) {
  const { getAttractor, domains } = useAttractorStore()

  const attr = computed(() => getAttractor(nodeId.value))
  const label = computed(() => attr.value?.label ?? '')
  const domain = computed(() => attr.value?.domain ?? '')
  const domainColor = computed(() => domains.value[domain.value]?.color ?? '#888')
  const parentLabel = computed(() => {
    const parentId = attr.value?.parent
    if (!parentId) return ''
    return getAttractor(parentId)?.label ?? ''
  })

  return { attr, label, domain, domainColor, parentLabel }
}
