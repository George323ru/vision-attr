<template>
  <div v-if="attr">
    <!-- Инсайты — показываем всегда если есть -->
    <div v-if="attr.insights" class="insights-section">
      <div class="insights-label">Инсайт</div>
      <div class="insights-text">{{ attr.insights }}</div>
    </div>

    <!-- Если есть ситуации — показываем карточки -->
    <template v-if="situations.length > 0">
      <SituationCard
        v-for="s in situations"
        :key="s.id"
        :title="s.title"
        :description="s.description"
        :domain-color="domainColor"
        @select="$emit('select-situation', nodeId, s.id)"
      />
    </template>

    <!-- Если нет ситуаций — описание + список детей -->
    <template v-else>
      <div v-if="attr.description" class="rp-description">{{ attr.description }}</div>
      <div v-else class="rp-empty">Нет ситуаций для данной категории</div>

      <div v-if="childList.length" class="l3-section">
        <div class="l3-title">{{ attr.level === 1 ? 'Аттракторы 2 уровня:' : 'Аттракторы 3 уровня:' }}</div>
        <div v-for="child in childList" :key="child.id" class="l3-item clickable" @click="selectChild(child)">{{ child.label }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { SITUATIONS } from '@/data/situations'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useAttractorDisplay } from '@/composables/useAttractorDisplay'
import { useAppState } from '@/composables/useAppState'
import SituationCard from '@/components/SituationCard.vue'

const props = defineProps<{ nodeId: string }>()

defineEmits<{ 'select-situation': [attrId: string, sitId: string] }>()

const { attractors } = useAttractorStore()
const { l3NodeId, currentFocus } = useAppState()
const { attr, domainColor } = useAttractorDisplay(toRef(props, 'nodeId'))

function selectChild(child: { id: string; level: number }) {
  if (child.level === 3) {
    l3NodeId.value = child.id
  } else {
    // L2-ребёнок (клик из L1-панели) — переключаем фокус
    currentFocus.value = child.id
  }
}

const situations = computed(() =>
  SITUATIONS.filter(s => s.attractorL2 === props.nodeId)
)

const childList = computed(() =>
  attractors.value
    .filter(a => a.parent === props.nodeId)
    .map(a => ({ id: a.id, label: a.label, level: a.level }))
)
</script>

<style scoped>
.rp-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 6px;
  margin-bottom: 12px;
}
.rp-empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 40px 20px;
}
.l3-section { margin-top: 8px; }
.l3-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.l3-item {
  font-size: 11px;
  color: var(--text);
  padding: 3px 8px;
  border-left: 2px solid var(--card-border);
  margin-bottom: 3px;
  opacity: 0.8;
}
.l3-item.clickable {
  cursor: pointer;
  transition: opacity 0.15s, border-color 0.15s;
}
.l3-item.clickable:hover {
  opacity: 1;
  border-color: var(--accent);
}
.insights-section {
  background: var(--card-bg);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
.insights-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 4px;
}
.insights-text {
  font-size: 12px;
  color: var(--text);
  line-height: 1.55;
}
</style>
