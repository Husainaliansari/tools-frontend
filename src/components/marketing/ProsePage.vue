<script setup lang="ts">
  /**
   * ProsePage — shared layout for text-heavy info pages (About, Privacy, Terms).
   */
  import type { ProseContent } from '@constants'

  defineProps<{ content: ProseContent }>()
</script>

<template>
  <section class="pf-prose">
    <h1 class="pf-prose__title">{{ content.title }}</h1>
    <p class="pf-prose__subtitle">{{ content.subtitle }}</p>
    <div class="pf-prose__sections">
      <div v-for="section in content.sections" :key="section.heading">
        <h2 class="pf-prose__heading">{{ section.heading }}</h2>
        <p class="pf-prose__body">{{ section.body }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .pf-prose {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 56px 24px 0;
  }
  .pf-prose__title {
    font-size: clamp(28px, 4.5vw, 42px);
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 10px;
  }
  .pf-prose__subtitle {
    font-size: 16.5px;
    color: hsl(var(--color-text-muted));
    margin: 0 0 36px;
  }
  .pf-prose__sections {
    display: grid;
    gap: 28px;
    max-width: 100%;
  }
  .pf-prose__heading {
    font-size: 20px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 10px;
    letter-spacing: -0.01em;
  }
  .pf-prose__body {
    font-size: 15.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.7;
    margin: 0;
  }
</style>
