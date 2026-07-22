<script setup lang="ts">
  /**
   * ContactPage — a modern contact form (no email/phone/address shown).
   * Submissions go to the spam-protected backend feedback endpoint.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import SupportForm from '@components/marketing/SupportForm.vue'
  import { SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Contact Us — PDFly',
    description:
      'Get in touch with the PDFly team. Send us a question, report an issue or share feedback through our secure contact form — most messages get a reply within hours.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact PDFly',
      url: `${SITE_URL}/contact`,
      description: 'Reach the PDFly team through our secure contact form.',
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })

  const highlights = [
    {
      icon: 'clock',
      title: 'Fast replies',
      body: 'Most messages get a personal response within a few hours on business days.',
    },
    {
      icon: 'shield',
      title: 'Private by default',
      body: 'Your details are used only to reply to you — never sold or shared.',
    },
    {
      icon: 'message-square',
      title: 'Real humans',
      body: 'No bots or ticket mazes. You’ll talk to someone on the PDFly team.',
    },
  ]
</script>

<template>
  <section class="pf-contact">
    <div class="pf-contact__header">
      <span class="pf-contact__eyebrow">
        <BaseIcon name="mail" :size="14" />
        Contact us
      </span>
      <h1 class="pf-contact__title">Get in touch</h1>
      <p class="pf-contact__lede">
        Have a question, found a bug, or want to say hello? Fill in the form below and we’ll get
        back to you. There’s no email address to hunt for — just send your message straight to us.
      </p>
    </div>

    <div class="pf-contact__grid">
      <BaseCard>
        <div class="pf-contact__form-wrap">
          <SupportForm variant="contact" />
        </div>
      </BaseCard>

      <aside class="pf-contact__aside">
        <div v-for="item in highlights" :key="item.title" class="pf-contact__highlight">
          <div class="pf-contact__highlight-icon"><BaseIcon :name="item.icon" :size="19" /></div>
          <div>
            <div class="pf-contact__highlight-title">{{ item.title }}</div>
            <p class="pf-contact__highlight-body">{{ item.body }}</p>
          </div>
        </div>

        <div class="pf-contact__links">
          <div class="pf-contact__links-title">Looking for something else?</div>
          <RouterLink :to="{ name: 'help' }" class="pf-contact__quick">
            <BaseIcon name="help-circle" :size="17" /> Visit the Help Center
          </RouterLink>
          <RouterLink :to="{ name: 'faq' }" class="pf-contact__quick">
            <BaseIcon name="message-square" :size="17" /> Read the FAQ
          </RouterLink>
          <RouterLink :to="{ name: 'feedback' }" class="pf-contact__quick">
            <BaseIcon name="star" :size="17" /> Share feedback & ideas
          </RouterLink>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
  .pf-contact {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 56px 24px 0;
  }
  .pf-contact__header {
    max-width: 620px;
    margin-bottom: 36px;
  }
  .pf-contact__eyebrow {
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
  .pf-contact__title {
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  .pf-contact__lede {
    font-size: 16.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.6;
    margin: 0;
  }
  .pf-contact__grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 24px;
    align-items: start;
  }
  .pf-contact__form-wrap {
    padding: 28px;
  }
  .pf-contact__aside {
    display: grid;
    gap: 14px;
  }
  .pf-contact__highlight {
    display: flex;
    gap: 13px;
    padding: 18px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
  }
  .pf-contact__highlight-icon {
    width: 42px;
    height: 42px;
    flex: none;
    border-radius: 11px;
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-contact__highlight-title {
    font-weight: 700;
    font-size: 15px;
    color: hsl(var(--color-text));
    margin-bottom: 3px;
  }
  .pf-contact__highlight-body {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.55;
    margin: 0;
  }
  .pf-contact__links {
    padding: 18px;
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
  }
  .pf-contact__links-title {
    font-size: 13px;
    font-weight: 700;
    color: hsl(var(--color-text));
    margin-bottom: 12px;
  }
  .pf-contact__quick {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 0;
    font-size: 14px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    transition: color 0.15s;
  }
  .pf-contact__quick:hover {
    color: hsl(var(--color-primary));
  }
  @media (max-width: 899px) {
    .pf-contact__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
