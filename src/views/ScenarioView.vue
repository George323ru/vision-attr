<template>
  <div class="scenario-layout">
    <SituationGrid class="content" />
    <ProfileSidebar class="sidebar" />
  </div>
</template>

<script setup lang="ts">
import ProfileSidebar from '@/components/ProfileSidebar.vue'
import SituationGrid from '@/components/SituationGrid.vue'
</script>

<style scoped>
.scenario-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 280px;
  overflow: hidden;
}
.sidebar {
  overflow-y: auto;
}
.content {
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .scenario-layout {
    grid-template-columns: 1fr 240px;
  }
}

@media (max-width: 768px) {
  .scenario-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  .sidebar {
    border-left: none;
    border-top: 1px solid var(--border);
    max-height: 35vh;
  }
}
</style>
