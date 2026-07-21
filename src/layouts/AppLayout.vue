<script setup lang="ts">
  /**
   * AppLayout — authenticated shell. Sidebar + topbar + routed page on desktop;
   * topbar + page + bottom tab bar on narrow viewports.
   */
  import { RouterView } from 'vue-router'
  import AppSidebar from '@components/layout/AppSidebar.vue'
  import AppTopbar from '@components/layout/AppTopbar.vue'
  import MobileTabBar from '@components/layout/MobileTabBar.vue'
  import { useBreakpoint } from '@composables'

  const { isNarrow } = useBreakpoint()
</script>

<template>
  <div class="pf-app">
    <AppSidebar v-if="!isNarrow" />
    <div class="pf-app__col">
      <AppTopbar />
      <main class="pf-app__main">
        <RouterView />
      </main>
      <MobileTabBar v-if="isNarrow" />
    </div>
  </div>
</template>

<style scoped>
  .pf-app {
    display: flex;
    min-height: 100vh;
    background: hsl(var(--color-bg));
  }
  .pf-app__col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .pf-app__main {
    padding: clamp(20px, 3vw, 32px);
    flex: 1;
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
  }
</style>
