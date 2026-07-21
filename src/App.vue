<script setup lang="ts">
  /**
   * Root application component.
   * Renders the routed layout plus the global toast and confirm dialog.
   */
  import { RouterView } from 'vue-router'
  import AppToast from '@components/ui/AppToast.vue'
  import ConfirmDialog from '@components/ui/ConfirmDialog.vue'
</script>

<template>
  <RouterView />
  <AppToast />
  <ConfirmDialog />
</template>
