<script setup lang="ts">
  /** AboutPage — company mission, story and values. */
  import ProsePage from '@components/marketing/ProsePage.vue'
  import { ABOUT_CONTENT } from '@constants'
</script>

<template>
  <ProsePage :content="ABOUT_CONTENT" />
</template>
