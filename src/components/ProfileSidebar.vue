<template>
  <aside class="profile-sidebar">
    <CollapsibleSection title="Демография" :initial-collapsed="false">
      <DemographicsPanel />
    </CollapsibleSection>
    <CollapsibleSection title="Аттракторы" :initial-collapsed="false">
      <AttractorPicker />
    </CollapsibleSection>
  </aside>
</template>

<script setup lang="ts">
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import DemographicsPanel from '@/components/DemographicsPanel.vue'
import AttractorPicker from '@/components/AttractorPicker.vue'
</script>

<style scoped>
.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border-left: 1px solid var(--border);
  overflow-y: auto;
  background: var(--right-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
