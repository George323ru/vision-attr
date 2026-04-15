<template>
  <div class="scenario-layout">
    <ProfileSidebar class="sidebar" />
    <SituationGrid class="content" />
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
  grid-template-columns: 280px 1fr;
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
    grid-template-columns: 240px 1fr;
  }
}
</style>
