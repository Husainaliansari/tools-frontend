<script setup lang="ts">
  /**
   * PublicLayout — marketing / landing shell: navbar + routed page + footer.
   */
  import { RouterView } from 'vue-router'
  import AppNavbar from '@components/layout/AppNavbar.vue'
  import AppFooter from '@components/layout/AppFooter.vue'
</script>

<template>
  <div class="pf-public">
    <AppNavbar />
    <main class="pf-public__main">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
  .pf-public {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: hsl(var(--color-bg));
  }
  .pf-public__main {
    flex: 1;
  }
</style>
