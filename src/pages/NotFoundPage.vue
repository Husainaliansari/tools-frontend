<script setup lang="ts">
  /** NotFoundPage — 404 with recovery actions. */
  import { useRouter } from 'vue-router'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { ROUTE_NAMES } from '@constants'

  const router = useRouter()
</script>

<template>
  <section class="pf-404">
    <div class="pf-404__code">404</div>
    <h1 class="pf-404__title">Page not found</h1>
    <p class="pf-404__body">
      The page you’re looking for doesn’t exist or has been moved. Let’s get you back on track.
    </p>
    <div class="pf-404__actions">
      <BaseButton icon="home" @click="router.push({ name: ROUTE_NAMES.HOME })"
        >Back to home</BaseButton
      >
      <BaseButton variant="secondary" icon="grid" @click="router.push({ name: ROUTE_NAMES.TOOLS })">
        Browse tools
      </BaseButton>
    </div>
  </section>
</template>

<style scoped>
  .pf-404 {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 90px 24px 60px;
    text-align: center;
  }
  .pf-404__code {
    font-size: clamp(90px, 18vw, 150px);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    background: linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-indigo)));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 8px;
  }
  .pf-404__title {
    font-size: 28px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 12px;
  }
  .pf-404__body {
    font-size: 16px;
    color: hsl(var(--color-text-muted));
    max-width: 400px;
    margin: 0 auto 28px;
    line-height: 1.5;
  }
  .pf-404__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
