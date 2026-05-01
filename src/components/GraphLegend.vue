<template>
  <div class="legend">
    <div class="leg-title">ОБОЗНАЧЕНИЯ</div>
    <div class="leg-row">
      <span class="leg-dot-wrap"><span class="leg-dot" style="width:18px;height:18px;background:hsl(0,14%,74%)"></span></span>
      <span class="leg-l1">Аттрактор 1 уровня</span>
    </div>
    <div class="leg-row">
      <span class="leg-dot-wrap"><span class="leg-dot" style="width:11px;height:11px;background:hsl(0,14%,80%)"></span></span>
      <span>Аттрактор 2 уровня</span>
    </div>
    <div class="leg-row">
      <span class="leg-dot-wrap"><span class="leg-dot" style="width:6px;height:6px;background:hsl(0,14%,86%)"></span></span>
      <span>Аттрактор 3 уровня</span>
    </div>
    <div v-if="showAllCorrelations" class="leg-row">
      <span class="leg-line" style="width:20px;background:rgba(83,88,96,0.45)"></span>
      <span>все корреляции</span>
    </div>
    <div class="leg-row">
      <span class="leg-line" style="width:20px;background:#0891b2"></span>
      <span>усиливающая корреляция</span>
    </div>
    <div class="leg-row">
      <span class="leg-line" style="width:20px;background:#dc2626"></span>
      <span>конфликтующая корреляция</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showAllCorrelations?: boolean
}>()
</script>

<style scoped>
.legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: var(--legend-bg);
  border: 1px solid var(--legend-border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  font-size: 11px;
  color: var(--legend-text);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 10;
  transition: background var(--duration-base), color var(--duration-base);
  box-shadow: var(--shadow-sm);
}
.leg-title {
  font-size: 9px;
  letter-spacing: 0.12em;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--legend-title);
  margin-bottom: 10px;
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
