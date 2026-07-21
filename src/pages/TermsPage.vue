<script setup lang="ts">
  /** TermsPage — terms & conditions. */
  import ProsePage from '@components/marketing/ProsePage.vue'
  import { TERMS_CONTENT } from '@constants'
</script>

<template>
  <ProsePage :content="TERMS_CONTENT" />
</template>
