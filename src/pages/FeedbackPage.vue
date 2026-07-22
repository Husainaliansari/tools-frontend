<script setup lang="ts">
  /**
   * FeedbackPage — share feedback, suggestions and bug reports. Uses the same
   * spam-protected backend as Contact, with a category picker.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import SupportForm from '@components/marketing/SupportForm.vue'
  import { SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Feedback & Suggestions — PDFly',
    description:
      'Help shape PDFly. Share feature requests, report bugs, or suggest improvements through our feedback form — you can even attach a screenshot.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Feedback & Suggestions',
      url: `${SITE_URL}/feedback`,
      description: 'Share feedback, feature requests and bug reports with the PDFly team.',
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })

  const reasons = [
    { icon: 'star', title: 'Request a feature', body: 'Tell us what would make PDFly better for you.' },
    { icon: 'alert-circle', title: 'Report a bug', body: 'Something not working? Attach a screenshot so we can help fast.' },
    { icon: 'sparkles', title: 'Suggest an idea', body: 'Big or small — every idea helps us improve.' },
  ]
</script>

<template>
  <section class="pf-feedback">
    <div class="pf-feedback__header">
      <span class="pf-feedback__eyebrow">
        <BaseIcon name="star" :size="14" />
        Feedback & suggestions
      </span>
      <h1 class="pf-feedback__title">Help us make PDFly better</h1>
      <p class="pf-feedback__lede">
        PDFly is shaped by the people who use it. Share a feature request, report a bug, or send us
        an idea — we read every submission and it genuinely guides what we build next.
      </p>
    </div>

    <div class="pf-feedback__reasons">
      <div v-for="r in reasons" :key="r.title" class="pf-feedback__reason">
        <div class="pf-feedback__reason-icon"><BaseIcon :name="r.icon" :size="20" /></div>
        <div class="pf-feedback__reason-title">{{ r.title }}</div>
        <p class="pf-feedback__reason-body">{{ r.body }}</p>
      </div>
    </div>

    <div class="pf-feedback__form">
      <BaseCard>
        <div class="pf-feedback__form-wrap">
          <SupportForm variant="feedback" submit-label="Send feedback" />
        </div>
      </BaseCard>
    </div>
  </section>
</template>

<style scoped>
  .pf-feedback {
    width: 90%;
    max-width: 760px;
    margin: 0 auto;
    padding: 56px 24px 0;
  }
  .pf-feedback__header {
    text-align: center;
    margin-bottom: 32px;
  }
  .pf-feedback__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
    padding: 5px 12px;
    border-radius: var(--radius-full);
    margin-bottom: 16px;
  }
  .pf-feedback__title {
    font-size: clamp(28px, 4.5vw, 42px);
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  .pf-feedback__lede {
    font-size: 16.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.6;
    margin: 0 auto;
    max-width: 560px;
  }
  .pf-feedback__reasons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 24px;
  }
  .pf-feedback__reason {
    padding: 18px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    text-align: center;
  }
  .pf-feedback__reason-icon {
    width: 44px;
    height: 44px;
    margin: 0 auto 10px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-feedback__reason-title {
    font-weight: 700;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    margin-bottom: 4px;
  }
  .pf-feedback__reason-body {
    font-size: 13px;
    color: hsl(var(--color-text-muted));
    line-height: 1.5;
    margin: 0;
  }
  .pf-feedback__form-wrap {
    padding: 28px;
  }
  @media (max-width: 640px) {
    .pf-feedback__reasons {
      grid-template-columns: 1fr;
    }
  }
</style>
