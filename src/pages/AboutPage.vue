<script setup lang="ts">
  /**
   * AboutPage — the story, mission, platform, security and trust behind PDFly,
   * plus headline stats and a short FAQ.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import FaqItem from '@components/ui/FaqItem.vue'
  import { useRouter } from 'vue-router'
  import {
    ABOUT_FAQS,
    ABOUT_FEATURES,
    ABOUT_PILLARS,
    ABOUT_STATS,
    ABOUT_VALUES,
    ROUTE_NAMES,
    SITE_NAME,
    SITE_URL,
  } from '@constants'
  import { usePageMeta } from '@composables'

  const router = useRouter()

  usePageMeta({
    title: 'About PDFly — Free, secure PDF tools for everyone',
    description:
      'Learn about PDFly: our mission to make working with PDFs effortless, the 30+ tools we offer, our privacy and security commitment, and why thousands trust us every week.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About PDFly',
      url: `${SITE_URL}/about`,
      description: 'The mission, platform, security and story behind PDFly.',
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        description:
          'PDFly is a free, secure suite of online PDF tools that run in the browser.',
      },
    }),
  })
</script>

<template>
  <div class="pf-about">
    <!-- Hero -->
    <section class="pf-about__hero">
      <div class="pf-container pf-about__hero-inner">
        <span class="pf-about__eyebrow">
          <BaseIcon name="file-text" :size="14" />
          About PDFly
        </span>
        <h1 class="pf-about__title">Documents, made effortless for&nbsp;everyone</h1>
        <p class="pf-about__lede">
          PDFly brings every tool you need to work with PDFs into one fast, friendly place — free,
          secure, and right in your browser. No installs, no clutter, no compromise on privacy.
        </p>
      </div>
    </section>

    <!-- Stats -->
    <section class="pf-container pf-about__stats">
      <div v-for="stat in ABOUT_STATS" :key="stat.label" class="pf-about__stat">
        <div class="pf-about__stat-value">{{ stat.value }}</div>
        <div class="pf-about__stat-label">{{ stat.label }}</div>
      </div>
    </section>

    <!-- Mission -->
    <section class="pf-container pf-about__mission">
      <div>
        <h2 class="pf-about__h2">Our mission</h2>
        <p class="pf-about__p">
          We believe working with PDFs shouldn’t require expensive software or a technical
          background. Whether you’re compressing a report before an email, converting a contract to
          Word, or signing a document on your phone, it should just work — in seconds.
        </p>
        <p class="pf-about__p">
          So we set out to build a complete PDF toolkit that’s genuinely free, respects your
          privacy, and feels a pleasure to use. That mission still guides every decision we make.
        </p>
      </div>
      <div class="pf-about__story">
        <h3 class="pf-about__h3">The story</h3>
        <p class="pf-about__p">
          PDFly started in 2024 when our founders got tired of juggling five different apps just to
          compress and merge a single report. Today more than 40,000 people rely on PDFly every
          week — from students and freelancers to teams at growing companies.
        </p>
      </div>
    </section>

    <!-- What we offer -->
    <section class="pf-container pf-about__section">
      <div class="pf-about__section-head">
        <h2 class="pf-about__h2">Everything in one place</h2>
        <p class="pf-about__sub">A single, coherent toolkit instead of a dozen disconnected apps.</p>
      </div>
      <div class="pf-about__grid">
        <div v-for="f in ABOUT_FEATURES" :key="f.title" class="pf-about__card">
          <div class="pf-about__card-icon"><BaseIcon :name="f.icon" :size="22" /></div>
          <div class="pf-about__card-title">{{ f.title }}</div>
          <p class="pf-about__card-body">{{ f.body }}</p>
        </div>
      </div>
    </section>

    <!-- Privacy & security -->
    <section class="pf-about__security">
      <div class="pf-container">
        <div class="pf-about__section-head">
          <span class="pf-about__eyebrow pf-about__eyebrow--light">
            <BaseIcon name="shield" :size="14" />
            Privacy & security
          </span>
          <h2 class="pf-about__h2 pf-about__h2--light">Your files are yours — full stop</h2>
          <p class="pf-about__sub pf-about__sub--light">
            Security isn’t an add-on. It’s built into how PDFly works, from the first upload to the
            moment your file is deleted.
          </p>
        </div>
        <div class="pf-about__grid">
          <div v-for="p in ABOUT_PILLARS" :key="p.title" class="pf-about__pillar">
            <div class="pf-about__pillar-icon"><BaseIcon :name="p.icon" :size="20" /></div>
            <div>
              <div class="pf-about__pillar-title">{{ p.title }}</div>
              <p class="pf-about__pillar-body">{{ p.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="pf-container pf-about__section">
      <div class="pf-about__section-head">
        <h2 class="pf-about__h2">What we stand for</h2>
        <p class="pf-about__sub">The principles behind every feature we ship.</p>
      </div>
      <div class="pf-about__values">
        <div v-for="(v, i) in ABOUT_VALUES" :key="v.title" class="pf-about__value">
          <div class="pf-about__value-num">{{ String(i + 1).padStart(2, '0') }}</div>
          <div class="pf-about__value-title">{{ v.title }}</div>
          <p class="pf-about__value-body">{{ v.body }}</p>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="pf-container pf-about__section">
      <div class="pf-about__section-head">
        <h2 class="pf-about__h2">Frequently asked</h2>
        <p class="pf-about__sub">A few of the things people ask us most.</p>
      </div>
      <div class="pf-about__faq">
        <FaqItem
          v-for="faq in ABOUT_FAQS"
          :key="faq.question"
          :question="faq.question"
          :answer="faq.answer"
        />
      </div>
    </section>

    <!-- CTA -->
    <section class="pf-container pf-about__cta">
      <div class="pf-about__cta-inner">
        <h2 class="pf-about__cta-title">Ready to get more done with your PDFs?</h2>
        <p class="pf-about__cta-sub">Start using any tool in seconds — no account required.</p>
        <div class="pf-about__cta-actions">
          <BaseButton size="lg" icon="grid" @click="router.push({ name: ROUTE_NAMES.TOOLS })">
            Explore all tools
          </BaseButton>
          <BaseButton
            size="lg"
            variant="secondary"
            icon="mail"
            @click="router.push({ name: ROUTE_NAMES.CONTACT })"
          >
            Contact us
          </BaseButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
  .pf-about__hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 64px 0 52px;
  }
  .pf-about__hero-inner {
    max-width: 720px;
  }
  .pf-about__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
    padding: 5px 12px;
    border-radius: var(--radius-full);
    margin-bottom: 18px;
  }
  .pf-about__eyebrow--light {
    color: #fff;
    background: rgb(255 255 255 / 0.14);
  }
  .pf-about__title {
    font-size: clamp(32px, 5.5vw, 52px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: hsl(var(--color-text));
    margin: 0 0 18px;
  }
  .pf-about__lede {
    font-size: 18px;
    line-height: 1.6;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }

  /* Stats */
  .pf-about__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 40px;
  }
  .pf-about__stat {
    text-align: center;
    padding: 24px 16px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }
  .pf-about__stat-value {
    font-size: clamp(26px, 3.5vw, 34px);
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-indigo)));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .pf-about__stat-label {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
    margin-top: 4px;
  }

  /* Mission */
  .pf-about__mission {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 40px;
    margin-top: 64px;
    align-items: start;
  }
  .pf-about__story {
    padding: 26px;
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-2xl);
  }

  .pf-about__section {
    margin-top: 72px;
  }
  .pf-about__section-head {
    text-align: center;
    max-width: 620px;
    margin: 0 auto 32px;
  }
  .pf-about__h2 {
    font-size: clamp(24px, 3.2vw, 34px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    margin: 0 0 10px;
  }
  .pf-about__h2--light {
    color: #fff;
  }
  .pf-about__h3 {
    font-size: 18px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 10px;
  }
  .pf-about__sub {
    font-size: 16px;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }
  .pf-about__sub--light {
    color: #cbd5e1;
  }
  .pf-about__p {
    font-size: 15.5px;
    line-height: 1.75;
    color: hsl(var(--color-text-muted));
    margin: 0 0 14px;
  }

  /* Feature / pillar grids */
  .pf-about__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
  .pf-about__card {
    padding: 24px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }
  .pf-about__card-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }
  .pf-about__card-title {
    font-weight: 700;
    font-size: 16px;
    color: hsl(var(--color-text));
    margin-bottom: 7px;
  }
  .pf-about__card-body {
    font-size: 14px;
    line-height: 1.6;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }

  /* Security band */
  .pf-about__security {
    margin-top: 72px;
    padding: 60px 0;
    background: #0b1120;
  }
  .pf-about__pillar {
    display: flex;
    gap: 14px;
    padding: 22px;
    background: rgb(255 255 255 / 0.04);
    border: 1px solid rgb(255 255 255 / 0.08);
    border-radius: var(--radius-xl);
  }
  .pf-about__pillar-icon {
    width: 44px;
    height: 44px;
    flex: none;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-primary) / 0.2);
    color: #93c5fd;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-about__pillar-title {
    font-weight: 700;
    font-size: 15.5px;
    color: #fff;
    margin-bottom: 5px;
  }
  .pf-about__pillar-body {
    font-size: 13.5px;
    line-height: 1.6;
    color: #94a3b8;
    margin: 0;
  }

  /* Values */
  .pf-about__values {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
  }
  .pf-about__value {
    padding: 4px 4px 4px 0;
  }
  .pf-about__value-num {
    font-size: 14px;
    font-weight: 800;
    color: hsl(var(--color-primary));
    margin-bottom: 8px;
  }
  .pf-about__value-title {
    font-weight: 700;
    font-size: 17px;
    color: hsl(var(--color-text));
    margin-bottom: 6px;
  }
  .pf-about__value-body {
    font-size: 14px;
    line-height: 1.65;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }

  /* FAQ */
  .pf-about__faq {
    max-width: 760px;
    margin: 0 auto;
    display: grid;
    gap: 12px;
  }

  /* CTA */
  .pf-about__cta {
    margin: 72px auto 0;
  }
  .pf-about__cta-inner {
    text-align: center;
    padding: 56px 24px;
    border-radius: var(--radius-2xl);
    background:
      radial-gradient(800px 300px at 50% -40%, hsl(var(--color-primary) / 0.16), transparent),
      hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
  }
  .pf-about__cta-title {
    font-size: clamp(24px, 3.5vw, 32px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    margin: 0 0 10px;
  }
  .pf-about__cta-sub {
    font-size: 16px;
    color: hsl(var(--color-text-muted));
    margin: 0 0 24px;
  }
  .pf-about__cta-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 899px) {
    .pf-about__stats {
      grid-template-columns: repeat(2, 1fr);
    }
    .pf-about__mission {
      grid-template-columns: 1fr;
      gap: 28px;
    }
  }
</style>
