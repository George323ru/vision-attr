<template>
  <nav class="breadcrumb" aria-label="Навигация">
    <template v-for="(crumb, i) in crumbs" :key="i">
      <a v-if="crumb.action && i < crumbs.length - 1" class="bc-link" @click="crumb.action">{{ crumb.label }}</a>
      <span v-else class="bc-current">{{ crumb.label }}</span>
      <span v-if="i < crumbs.length - 1" class="bc-sep">›</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  action?: () => void
}

defineProps<{ crumbs: BreadcrumbItem[] }>()
</script>

<style scoped>
.breadcrumb {
  font-size: 11px;
  color: var(--breadcrumb);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  letter-spacing: 0.01em;
}
.bc-link {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
  transition: opacity var(--duration-fast);
}
.bc-link:hover { opacity: 0.75; }
.bc-current {
  color: var(--text-muted);
  font-weight: 500;
}
.bc-sep {
  color: var(--breadcrumb);
  opacity: 0.4;
  font-size: 10px;
}
</style>
