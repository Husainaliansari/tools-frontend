<script setup lang="ts">
  /**
   * AuthLayout — minimal shell for login / register / password flows.
   * Logo + theme toggle in the header; the routed page centers its own card.
   */
  import { RouterView } from 'vue-router'
  import AppLogo from '@components/ui/AppLogo.vue'
  import ThemeToggle from '@components/ui/ThemeToggle.vue'
</script>

<template>
  <div class="pf-auth">
    <header class="pf-auth__header">
      <AppLogo :size="30" />
      <ThemeToggle />
    </header>
    <div class="pf-auth__body">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
  .pf-auth {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: hsl(var(--color-bg));
  }
  .pf-auth__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28px 24px;
  }
  .pf-auth__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 24px 28px;
  }
</style>
