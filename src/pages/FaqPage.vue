<script setup lang="ts">
  /** FaqPage — standalone FAQ with a hero header. */
  import FaqItem from '@components/ui/FaqItem.vue'
  import { GENERAL_FAQS } from '@constants'
</script>

<template>
  <div>
    <section class="pf-faq-hero">
      <div class="pf-container pf-faq-hero__inner">
        <h1 class="pf-faq-hero__title">Frequently asked questions</h1>
        <p class="pf-faq-hero__lede">Answers to the things people ask us most.</p>
      </div>
    </section>
    <section class="pf-faq-page">
      <FaqItem
        v-for="faq in GENERAL_FAQS"
        :key="faq.question"
        :question="faq.question"
        :answer="faq.answer"
      />
    </section>
  </div>
</template>

<style scoped>
  .pf-faq-hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 52px 0;
  }
  .pf-faq-hero__inner {
    text-align: center;
  }
  .pf-faq-hero__title {
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  .pf-faq-hero__lede {
    font-size: 17px;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }
  .pf-faq-page {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 40px 24px 0;
    display: grid;
    gap: 12px;
  }
</style>
