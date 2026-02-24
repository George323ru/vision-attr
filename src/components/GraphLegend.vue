<template>
  <div class="legend">
    <div class="leg-title">ОБОЗНАЧЕНИЯ</div>
    <div class="leg-row">
      <span class="leg-dot-wrap"><span class="leg-dot" style="width:18px;height:18px;background:hsl(0,14%,74%)"></span></span>
      <span class="leg-l1">L1 — аттрактор 1 уровня</span>
    </div>
    <div class="leg-row">
      <span class="leg-dot-wrap"><span class="leg-dot" style="width:11px;height:11px;background:hsl(0,14%,80%)"></span></span>
      <span>L2 — аттрактор 2 уровня</span>
    </div>
    <div class="leg-row">
      <span class="leg-dot-wrap"><span class="leg-dot" style="width:6px;height:6px;background:hsl(0,14%,86%)"></span></span>
      <span>L3 — аттрактор 3 уровня</span>
    </div>
    <div class="leg-row">
      <span class="leg-line" :style="{ width: '20px', background: legHier }"></span>
      <span>иерархия</span>
    </div>
    <div class="leg-row">
      <span class="leg-line" style="width:20px;background:#059669"></span>
      <span>усиление</span>
    </div>
    <div class="leg-row">
      <span class="leg-line" style="width:20px;background:#dc2626"></span>
      <span>конфликт</span>
    </div>
    <div class="leg-row">
      <span class="leg-line" style="width:20px;background:#7070a0"></span>
      <span>нейтральная</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { T } = useTheme()
const legHier = computed(() => T.value.legHier)
</script>

<style scoped>
.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: var(--legend-bg);
  border: 1px solid var(--legend-border);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 11px;
  color: var(--legend-text);
  backdrop-filter: blur(8px);
  z-index: 10;
  transition: background 0.3s, color 0.3s;
}
.leg-title {
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--legend-title);
  margin-bottom: 8px;
}
.leg-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.leg-dot-wrap {
  width: 22px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.leg-dot { border-radius: 50%; flex-shrink: 0; }
.leg-line { height: 2px; flex-shrink: 0; border-radius: 1px; width: 22px; }
.leg-l1 { font-weight: 600; }
</style>
