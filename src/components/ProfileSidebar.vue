<template>
  <aside class="profile-sidebar">
    <CollapsibleSection title="Демография" :initial-collapsed="false">
      <DemographicsPanel />
    </CollapsibleSection>
    <div class="sidebar-section-wrap">
      <CollapsibleSection title="Ваши ценности" :initial-collapsed="false">
        <AttractorPicker />
      </CollapsibleSection>
      <CoachMark
        id="cm-profile"
        text="Выберите до 3 ценностей — карточки ситуаций подстроятся под ваш профиль"
        position="bottom"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import DemographicsPanel from '@/components/DemographicsPanel.vue'
import AttractorPicker from '@/components/AttractorPicker.vue'
import CoachMark from '@/components/CoachMark.vue'
</script>

<style scoped>
.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 18px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  background: var(--right-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.sidebar-section-wrap {
  position: relative;
}
</style>
