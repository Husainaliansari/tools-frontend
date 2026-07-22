<script setup lang="ts">
  /**
   * LegalDocument — shared layout for legal/policy pages (Privacy, Terms,
   * Disclaimer, Cookie Policy). Renders a header, a sticky table of contents
   * and richly formatted sections (paragraphs + bullet lists) with anchor
   * links so sections are deep-linkable and crawlable.
   */
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import type { LegalDocumentContent } from '@constants'

  defineProps<{ doc: LegalDocumentContent }>()
</script>

<template>
  <div class="pf-legal">
    <header class="pf-legal__hero">
      <div class="pf-container pf-legal__hero-inner">
        <span class="pf-legal__badge">
          <BaseIcon name="shield" :size="14" />
          Legal
        </span>
        <h1 class="pf-legal__title">{{ doc.title }}</h1>
        <p class="pf-legal__summary">{{ doc.summary }}</p>
        <p class="pf-legal__date">{{ doc.effectiveDate }}</p>
      </div>
    </header>

    <div class="pf-container pf-legal__layout">
      <!-- Table of contents -->
      <aside class="pf-legal__toc" aria-label="On this page">
        <div class="pf-legal__toc-title">On this page</div>
        <nav>
          <a
            v-for="section in doc.sections"
            :key="section.id"
            :href="`#${section.id}`"
            class="pf-legal__toc-link"
          >
            {{ section.heading }}
          </a>
        </nav>
      </aside>

      <!-- Body -->
      <article class="pf-legal__body">
        <div class="pf-legal__intro">
          <p v-for="(block, i) in doc.intro" :key="i" class="pf-legal__p">
            {{ block.text }}
          </p>
        </div>

        <section
          v-for="section in doc.sections"
          :id="section.id"
          :key="section.id"
          class="pf-legal__section"
        >
          <h2 class="pf-legal__heading">
            <a :href="`#${section.id}`" class="pf-legal__anchor" aria-hidden="true">#</a>
            {{ section.heading }}
          </h2>
          <template v-for="(block, i) in section.blocks" :key="i">
            <p v-if="block.type === 'paragraph'" class="pf-legal__p">{{ block.text }}</p>
            <ul v-else class="pf-legal__list">
              <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
            </ul>
          </template>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
  .pf-legal__hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 52px 0;
  }
  .pf-legal__hero-inner {
    max-width: 760px;
  }
  .pf-legal__badge {
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
  .pf-legal__title {
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    margin: 0 0 12px;
  }
  .pf-legal__summary {
    font-size: 17px;
    line-height: 1.6;
    color: hsl(var(--color-text-muted));
    margin: 0 0 14px;
  }
  .pf-legal__date {
    font-size: 13.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    margin: 0;
  }

  .pf-legal__layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 48px;
    padding-top: 44px;
    padding-bottom: 20px;
    align-items: start;
  }

  .pf-legal__toc {
    position: sticky;
    top: 24px;
  }
  .pf-legal__toc-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: hsl(var(--color-text-faint));
    margin-bottom: 14px;
  }
  .pf-legal__toc-link {
    display: block;
    font-size: 13.5px;
    line-height: 1.4;
    color: hsl(var(--color-text-muted));
    padding: 7px 0;
    border-left: 2px solid transparent;
    padding-left: 12px;
    margin-left: -2px;
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  .pf-legal__toc-link:hover {
    color: hsl(var(--color-primary));
    border-left-color: hsl(var(--color-primary));
  }

  .pf-legal__body {
    max-width: 760px;
    min-width: 0;
  }
  .pf-legal__intro {
    padding: 20px 22px;
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    margin-bottom: 36px;
  }
  .pf-legal__section {
    scroll-margin-top: 24px;
    margin-bottom: 34px;
  }
  .pf-legal__heading {
    font-size: 20px;
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.01em;
    margin: 0 0 12px;
    position: relative;
  }
  .pf-legal__anchor {
    color: hsl(var(--color-text-faint));
    opacity: 0;
    margin-right: 6px;
    font-weight: 600;
    transition: opacity 0.15s;
  }
  .pf-legal__heading:hover .pf-legal__anchor {
    opacity: 1;
  }
  .pf-legal__p {
    font-size: 15.5px;
    line-height: 1.75;
    color: hsl(var(--color-text-muted));
    margin: 0 0 14px;
  }
  .pf-legal__p:last-child {
    margin-bottom: 0;
  }
  .pf-legal__list {
    margin: 0 0 14px;
    padding-left: 22px;
    display: grid;
    gap: 9px;
  }
  .pf-legal__list li {
    font-size: 15px;
    line-height: 1.65;
    color: hsl(var(--color-text-muted));
  }
  .pf-legal__list li::marker {
    color: hsl(var(--color-primary));
  }

  @media (max-width: 899px) {
    .pf-legal__layout {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .pf-legal__toc {
      position: static;
      border: 1px solid hsl(var(--color-border));
      border-radius: var(--radius-xl);
      padding: 18px 20px;
      background: hsl(var(--color-surface));
    }
    .pf-legal__toc nav {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 16px;
    }
  }
  @media (max-width: 520px) {
    .pf-legal__toc nav {
      grid-template-columns: 1fr;
    }
  }
</style>
