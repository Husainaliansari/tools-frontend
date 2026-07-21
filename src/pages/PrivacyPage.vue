<script setup lang="ts">
  /** PrivacyPage — privacy policy. */
  import ProsePage from '@components/marketing/ProsePage.vue'
  import { PRIVACY_CONTENT } from '@constants'
</script>

<template>
  <ProsePage :content="PRIVACY_CONTENT" />
</template>
