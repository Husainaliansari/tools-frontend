<script setup lang="ts">
  /**
   * HomePage — marketing landing page: hero + tool search, popular tools,
   * all tools by category, how-it-works, why-PDFly, FAQ and CTA.
   */
  import { computed, ref } from 'vue'
  import { useRouter, RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import SectionTag from '@components/ui/SectionTag.vue'
  import FaqItem from '@components/ui/FaqItem.vue'
  import SectionHeading from '@components/marketing/SectionHeading.vue'
  import ToolTile from '@components/tools/ToolTile.vue'
  import ToolTileSquare from '@components/tools/ToolTileSquare.vue'
  import {
    GENERAL_FAQS,
    ROUTE_NAMES,
    TOOL_CATEGORIES,
    TOOL_COUNT,
    getPopularTools,
    getToolsByCategory,
    searchTools,
  } from '@constants'
  import { hexAlpha } from '@utils'

  const router = useRouter()
  const query = ref('')

  const popular = computed(() => getPopularTools(8))
  const searchResults = computed(() =>
    query.value.trim() ? searchTools(query.value).slice(0, 5) : [],
  )

  const trustPoints = [
    { icon: 'zap', label: 'Lightning fast' },
    { icon: 'shield', label: 'Private & secure' },
    { icon: 'star', label: '4.9 / 5 from 40k users' },
  ]
  const steps = [
    {
      icon: 'upload',
      title: 'Upload your file',
      body: 'Drop a file from your device, Dropbox or Google Drive.',
    },
    {
      icon: 'settings',
      title: 'Choose options',
      body: 'Pick your settings — we set smart defaults for you.',
    },
    {
      icon: 'download',
      title: 'Download result',
      body: 'Grab your new file instantly. It’s that easy.',
    },
  ]
  const whyFeatures = [
    { icon: 'gauge', title: 'Blazing performance', body: 'Most files process in under 5 seconds.' },
    {
      icon: 'shield',
      title: 'Bank-grade security',
      body: 'Encrypted transfers, auto-deleted files.',
    },
    { icon: 'users', title: 'Trusted by teams', body: '40,000+ professionals use PDFly weekly.' },
  ]
  const stats = [
    { value: '40k+', label: 'Active users', icon: 'users' },
    { value: '12M+', label: 'Files processed', icon: 'file-text' },
    { value: '4.9★', label: 'Average rating', icon: 'star' },
    { value: '99.9%', label: 'Uptime', icon: 'activity' },
  ]

  function goToTool(slug: string) {
    router.push({ name: ROUTE_NAMES.TOOL, params: { slug } })
  }
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="pf-hero">
      <div class="pf-container pf-hero__inner">
        <SectionTag>{{ TOOL_COUNT }} free tools · no signup required</SectionTag>
        <h1 class="pf-hero__title">
          Every tool you need to work with <span class="pf-serif">PDFs</span>
        </h1>
        <p class="pf-hero__lede">
          Compress, convert, merge, split, edit and sign — 100% free and beautifully simple. Your
          files stay private and are deleted automatically.
        </p>

        <div class="pf-hero__search">
          <BaseInput
            v-model="query"
            icon="search"
            placeholder="Search for a tool, e.g. “compress” or “word”…"
          />
          <div class="pf-hero__search-btn">
            <BaseButton size="sm" @click="router.push({ name: ROUTE_NAMES.TOOLS })"
              >Search</BaseButton
            >
          </div>
        </div>

        <div v-if="query.trim()" class="pf-hero__results">
          <BaseCard>
            <div class="pf-results">
              <button
                v-for="tool in searchResults"
                :key="tool.slug"
                type="button"
                class="pf-results__item"
                @click="goToTool(tool.slug)"
              >
                <span
                  class="pf-results__icon"
                  :style="{ color: tool.color, background: hexAlpha(tool.color, 0.13) }"
                >
                  <BaseIcon :name="tool.icon" :size="17" />
                </span>
                <span>
                  <span class="pf-results__name">{{ tool.name }}</span>
                  <span class="pf-results__cat">{{ tool.category }}</span>
                </span>
              </button>
              <p v-if="!searchResults.length" class="pf-results__empty"
                >No tools match your search.</p
              >
            </div>
          </BaseCard>
        </div>

        <div class="pf-hero__trust">
          <span v-for="point in trustPoints" :key="point.label" class="pf-hero__trust-item">
            <span class="pf-hero__trust-icon"><BaseIcon :name="point.icon" :size="17" /></span>
            {{ point.label }}
          </span>
        </div>
      </div>
    </section>

    <!-- Popular tools -->
    <section class="pf-container pf-section">
      <SectionHeading title="Popular tools" subtitle="The ones people reach for every day.">
        <template #action>
          <RouterLink :to="{ name: ROUTE_NAMES.TOOLS }" class="pf-action-link">
            View all <BaseIcon name="arrow-right" :size="16" />
          </RouterLink>
        </template>
      </SectionHeading>
      <div class="pf-grid-tiles">
        <ToolTile v-for="tool in popular" :key="tool.slug" :tool="tool" />
      </div>
    </section>

    <!-- All tools by category -->
    <section class="pf-container pf-section">
      <SectionHeading
        title="All PDF tools"
        subtitle="Organized so you always find the right one."
      />
      <div v-for="category in TOOL_CATEGORIES" :key="category" class="pf-cat">
        <div class="pf-cat__head">
          <h3 class="pf-cat__title">{{ category }}</h3>
          <div class="pf-cat__rule" />
        </div>
        <div class="pf-grid-squares">
          <ToolTileSquare
            v-for="tool in getToolsByCategory(category)"
            :key="tool.slug"
            :tool="tool"
          />
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="pf-container pf-section">
      <SectionHeading
        centered
        title="How it works"
        subtitle="Three simple steps — no learning curve."
        class="pf-center"
      />
      <div class="pf-steps">
        <BaseCard v-for="(step, i) in steps" :key="step.title">
          <div class="pf-step">
            <div class="pf-step__icon-wrap">
              <div class="pf-step__icon"><BaseIcon :name="step.icon" :size="28" /></div>
              <div class="pf-step__num">{{ i + 1 }}</div>
            </div>
            <div class="pf-step__title">{{ step.title }}</div>
            <div class="pf-step__body">{{ step.body }}</div>
          </div>
        </BaseCard>
      </div>
    </section>

    <!-- Why PDFly -->
    <section class="pf-container pf-section">
      <BaseCard>
        <div class="pf-why">
          <div>
            <SectionTag>Why PDFly</SectionTag>
            <h2 class="pf-why__title">Built for people who value their time</h2>
            <p class="pf-why__lede">
              No clutter, no watermarks, no hidden fees. Just fast, reliable tools that respect your
              files and your privacy.
            </p>
            <div class="pf-why__features">
              <div v-for="f in whyFeatures" :key="f.title" class="pf-why__feature">
                <div class="pf-why__feature-icon"><BaseIcon :name="f.icon" :size="20" /></div>
                <div>
                  <div class="pf-why__feature-title">{{ f.title }}</div>
                  <div class="pf-why__feature-body">{{ f.body }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="pf-stats">
            <div v-for="s in stats" :key="s.label" class="pf-stat">
              <div class="pf-stat__icon"><BaseIcon :name="s.icon" :size="22" /></div>
              <div class="pf-stat__value">{{ s.value }}</div>
              <div class="pf-stat__label">{{ s.label }}</div>
            </div>
          </div>
        </div>
      </BaseCard>
    </section>

    <!-- FAQ -->
    <section class="pf-container pf-section">
      <SectionHeading
        centered
        title="Frequently asked questions"
        subtitle="Everything you might be wondering."
        class="pf-center"
      />
      <div class="pf-faqs">
        <FaqItem
          v-for="faq in GENERAL_FAQS"
          :key="faq.question"
          :question="faq.question"
          :answer="faq.answer"
        />
      </div>
    </section>

    <!-- CTA -->
    <section class="pf-container pf-section pf-section--last">
      <div class="pf-cta">
        <h2 class="pf-cta__title">Ready to get more done?</h2>
        <p class="pf-cta__body">
          Join 40,000+ people who make PDFs painless with PDFly. Free forever — upgrade any time.
        </p>
        <div class="pf-cta__actions">
          <button
            type="button"
            class="pf-cta__primary"
            @click="router.push({ name: ROUTE_NAMES.REGISTER })"
          >
            Create free account
          </button>
          <button
            type="button"
            class="pf-cta__ghost"
            @click="router.push({ name: ROUTE_NAMES.TOOLS })"
          >
            Explore tools
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
  .pf-hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 72px 0 80px;
  }
  .pf-hero__inner {
    text-align: center;
  }
  .pf-hero__title {
    font-size: clamp(34px, 6vw, 60px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0 auto 20px;
    max-width: 820px;
    color: hsl(var(--color-text));
  }
  .pf-hero__lede {
    font-size: clamp(16px, 2vw, 19px);
    color: hsl(var(--color-text-muted));
    max-width: 600px;
    margin: 0 auto 34px;
    line-height: 1.55;
  }
  .pf-hero__search {
    max-width: 560px;
    margin: 0 auto;
    position: relative;
  }
  .pf-hero__search-btn {
    position: absolute;
    right: 8px;
    top: 8px;
  }
  .pf-hero__results {
    max-width: 560px;
    margin: 12px auto 0;
    text-align: left;
  }
  .pf-hero__trust {
    display: flex;
    gap: 26px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 36px;
    color: hsl(var(--color-text-muted));
    font-size: 14px;
    font-weight: 600;
  }
  .pf-hero__trust-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pf-hero__trust-icon {
    color: hsl(var(--color-primary));
    display: flex;
  }

  .pf-results {
    padding: 8px;
  }
  .pf-results__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .pf-results__item:hover {
    background: hsl(var(--color-chip));
  }
  .pf-results__icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-results__name {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: hsl(var(--color-text));
  }
  .pf-results__cat {
    display: block;
    font-size: 12px;
    color: hsl(var(--color-text-faint));
  }
  .pf-results__empty {
    padding: 16px;
    color: hsl(var(--color-text-faint));
    font-size: 14px;
    text-align: center;
    margin: 0;
  }

  .pf-section {
    padding-top: 64px;
  }
  .pf-section--last {
    padding-bottom: 20px;
  }
  .pf-center {
    text-align: center;
  }
  .pf-action-link {
    color: hsl(var(--color-primary));
    font-weight: 700;
    font-size: 14.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pf-grid-tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 26px;
  }
  @media (max-width: 640px) {
    .pf-grid-tiles {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 18px;
    }
  }
  .pf-cat {
    margin-top: 34px;
  }
  .pf-cat__head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .pf-cat__title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: hsl(var(--color-text-faint));
    margin: 0;
  }
  .pf-cat__rule {
    flex: 1;
    height: 1px;
    background: hsl(var(--color-border));
  }
  .pf-grid-squares {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
  }

  .pf-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 22px;
    margin-top: 36px;
  }
  .pf-step {
    padding: 28px 24px;
    text-align: center;
  }
  .pf-step__icon-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto 18px;
  }
  .pf-step__icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-step__num {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary));
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-step__title {
    font-weight: 700;
    font-size: 17px;
    color: hsl(var(--color-text));
    margin-bottom: 8px;
  }
  .pf-step__body {
    font-size: 14px;
    color: hsl(var(--color-text-muted));
    line-height: 1.55;
  }

  .pf-why {
    padding: 44px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: center;
  }
  .pf-why__title {
    font-size: clamp(26px, 3.5vw, 38px);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: hsl(var(--color-text));
    margin: 0 0 16px;
  }
  .pf-why__lede {
    font-size: 15.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .pf-why__features {
    display: grid;
    gap: 14px;
  }
  .pf-why__feature {
    display: flex;
    gap: 14px;
  }
  .pf-why__feature-icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .pf-why__feature-title {
    font-weight: 700;
    color: hsl(var(--color-text));
    font-size: 15px;
  }
  .pf-why__feature-body {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
  }
  .pf-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .pf-stat {
    background: hsl(var(--color-surface-muted));
    border-radius: 14px;
    padding: 22px;
    border: 1px solid hsl(var(--color-border));
  }
  .pf-stat__icon {
    color: hsl(var(--color-primary));
    margin-bottom: 10px;
  }
  .pf-stat__value {
    font-size: 26px;
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
  }
  .pf-stat__label {
    font-size: 13px;
    color: hsl(var(--color-text-muted));
    margin-top: 2px;
  }

  .pf-faqs {
    max-width: 760px;
    margin: 32px auto 0;
    display: grid;
    gap: 12px;
  }

  .pf-cta {
    background: linear-gradient(135deg, hsl(var(--color-navy)), hsl(var(--color-indigo)));
    border-radius: 24px;
    padding: 52px 40px;
    text-align: center;
    color: #fff;
    box-shadow: 0 30px 60px -30px hsl(var(--color-navy) / 0.6);
  }
  .pf-cta__title {
    font-size: clamp(26px, 4vw, 40px);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 14px;
  }
  .pf-cta__body {
    font-size: 17px;
    opacity: 0.9;
    max-width: 480px;
    margin: 0 auto 28px;
  }
  .pf-cta__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .pf-cta__primary,
  .pf-cta__ghost {
    padding: 14px 28px;
    border-radius: var(--radius-lg);
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.18s;
  }
  .pf-cta__primary {
    background: #fff;
    color: hsl(var(--color-navy));
    border: none;
  }
  .pf-cta__primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgb(0 0 0 / 0.2);
  }
  .pf-cta__ghost {
    background: rgb(255 255 255 / 0.12);
    color: #fff;
    border: 1px solid rgb(255 255 255 / 0.25);
  }
  .pf-cta__ghost:hover {
    background: rgb(255 255 255 / 0.2);
  }

  @media (max-width: 899px) {
    .pf-why {
      grid-template-columns: 1fr;
      padding: 28px;
    }
  }
</style>
