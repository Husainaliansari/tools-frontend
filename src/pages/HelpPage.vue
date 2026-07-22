<script setup lang="ts">
  /** HelpPage — help center hero search + category cards. */
  import { ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import { HELP_CATEGORIES } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Help Center — PDFly',
    description:
      'Find help with PDFly. Browse guides on getting started, tools and features, billing, privacy, your account and troubleshooting.',
  })

  const query = ref('')
</script>

<template>
  <div>
    <section class="pf-help-hero">
      <div class="pf-container pf-help-hero__inner">
        <h1 class="pf-help-hero__title">How can we help?</h1>
        <div class="pf-help-hero__search">
          <BaseInput v-model="query" icon="search" placeholder="Search the help center…" />
        </div>
      </div>
    </section>

    <section class="pf-help-body">
      <div class="pf-help-grid">
        <BaseCard v-for="cat in HELP_CATEGORIES" :key="cat.title">
          <div class="pf-help-card">
            <div class="pf-help-card__icon"><BaseIcon :name="cat.icon" :size="22" /></div>
            <div class="pf-help-card__title">{{ cat.title }}</div>
            <div class="pf-help-card__count">{{ cat.articles }}</div>
          </div>
        </BaseCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
  .pf-help-hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 52px 0;
  }
  .pf-help-hero__inner {
    text-align: center;
  }
  .pf-help-hero__title {
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  .pf-help-hero__search {
    max-width: 480px;
    margin: 18px auto 0;
  }
  .pf-help-body {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 40px 24px 0;
  }
  .pf-help-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .pf-help-card {
    padding: 22px;
    cursor: pointer;
  }
  .pf-help-card__icon {
    width: 46px;
    height: 46px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }
  .pf-help-card__title {
    font-weight: 700;
    font-size: 16px;
    color: hsl(var(--color-text));
    margin-bottom: 5px;
  }
  .pf-help-card__count {
    font-size: 13px;
    color: hsl(var(--color-text-faint));
  }
</style>
