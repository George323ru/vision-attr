<template>
  <div class="attractor-picker">
    <div v-for="(slotId, idx) in profile.selectedAttractors" :key="idx" class="picker-slot">
      <div class="slot-label">{{ idx + 1 }}</div>
      <SearchableCombobox
        :model-value="slotId"
        :groups="groupedL2"
        placeholder="Выберите ценность"
        @update:model-value="dispatch({ type: 'SET_ATTRACTOR_SLOT', slot: idx, id: $event })"
      />
      <span
        v-if="slotId"
        class="slot-dot"
        :style="{ background: getDomainColorForId(slotId) }"
      ></span>
    </div>
    <button
      v-if="hasAny"
      class="clear-btn"
      @click="dispatch({ type: 'CLEAR_ATTRACTORS' })"
    >Очистить</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SearchableCombobox from '@/components/SearchableCombobox.vue'
import { useStore } from '@/composables/state/useStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { domainColor } from '@/utils/colors'

const { profile, dispatch } = useStore()
const { attractors, domains } = useAttractorStore()

const groupedL2 = computed(() => {
  const map: Record<string, { id: string; name: string; items: { id: string; label: string }[] }> = {}
  for (const a of attractors.value) {
    if (a.level !== 2) continue
    const d = domains.value[a.domain]
    const groupName = d?.name ?? a.domain
    if (!map[a.domain]) map[a.domain] = { id: a.domain, name: groupName, items: [] }
    map[a.domain].items.push({ id: a.id, label: a.label.replace(/\n/g, ' ') })
  }
  return Object.values(map)
})

const hasAny = computed(() => profile.value.selectedAttractors.some(id => id !== null))

function getDomainColorForId(id: string): string {
  const a = attractors.value.find(a => a.id === id)
  if (!a) return 'var(--text-muted)'
  return domainColor(domains.value, a.domain, 2)
}
</script>

<style scoped>
.attractor-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker-slot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slot-label {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 50%;
  flex-shrink: 0;
  letter-spacing: 0;
  transition: border-color var(--duration-fast) var(--ease-out-quad),
              color var(--duration-fast);
}
.slot-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-out-expo);
}
.clear-btn {
  font-size: 11px;
  color: var(--text-dim);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  text-align: left;
  letter-spacing: 0.02em;
  transition: color var(--duration-fast) var(--ease-out-quad);
}
.clear-btn:hover {
  color: var(--accent);
}
</style>
