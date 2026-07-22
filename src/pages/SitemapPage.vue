<script setup lang="ts">
  /**
   * SitemapPage — a human-readable HTML sitemap linking to every public page,
   * complementing the machine-readable /sitemap.xml for crawlers and users.
   */
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { ROUTE_NAMES, TOOLS, SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Sitemap — PDFly',
    description:
      'Browse every page on PDFly — all PDF tools, product pages, company information, help resources and legal documents in one place.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Sitemap',
      url: `${SITE_URL}/sitemap`,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })

  const groups: { title: string; icon: string; links: { label: string; name: string }[] }[] = [
    {
      title: 'Product',
      icon: 'grid',
      links: [
        { label: 'Home', name: ROUTE_NAMES.HOME },
        { label: 'All Tools', name: ROUTE_NAMES.TOOLS },
        { label: 'Pricing', name: ROUTE_NAMES.PRICING },
      ],
    },
    {
      title: 'Company',
      icon: 'users',
      links: [
        { label: 'About Us', name: ROUTE_NAMES.ABOUT },
        { label: 'Contact Us', name: ROUTE_NAMES.CONTACT },
        { label: 'Feedback & Suggestions', name: ROUTE_NAMES.FEEDBACK },
      ],
    },
    {
      title: 'Support',
      icon: 'help-circle',
      links: [
        { label: 'Help Center', name: ROUTE_NAMES.HELP },
        { label: 'FAQ', name: ROUTE_NAMES.FAQ },
      ],
    },
    {
      title: 'Legal',
      icon: 'shield',
      links: [
        { label: 'Privacy Policy', name: ROUTE_NAMES.PRIVACY },
        { label: 'Terms & Conditions', name: ROUTE_NAMES.TERMS },
        { label: 'Disclaimer', name: ROUTE_NAMES.DISCLAIMER },
        { label: 'Cookie Policy', name: ROUTE_NAMES.COOKIES },
      ],
    },
  ]
</script>

<template>
  <div class="pf-sitemap">
    <section class="pf-sitemap__hero">
      <div class="pf-container pf-sitemap__hero-inner">
        <h1 class="pf-sitemap__title">Sitemap</h1>
        <p class="pf-sitemap__lede">Every page on PDFly, all in one place.</p>
      </div>
    </section>

    <div class="pf-container pf-sitemap__body">
      <div class="pf-sitemap__groups">
        <section v-for="group in groups" :key="group.title" class="pf-sitemap__group">
          <h2 class="pf-sitemap__group-title">
            <span class="pf-sitemap__group-icon"><BaseIcon :name="group.icon" :size="17" /></span>
            {{ group.title }}
          </h2>
          <ul class="pf-sitemap__list">
            <li v-for="link in group.links" :key="link.name">
              <RouterLink :to="{ name: link.name }" class="pf-sitemap__link">
                {{ link.label }}
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>

      <section class="pf-sitemap__tools">
        <h2 class="pf-sitemap__group-title">
          <span class="pf-sitemap__group-icon"><BaseIcon name="layers" :size="17" /></span>
          All PDF Tools
        </h2>
        <ul class="pf-sitemap__tool-grid">
          <li v-for="tool in TOOLS" :key="tool.slug">
            <RouterLink
              :to="{ name: ROUTE_NAMES.TOOL, params: { slug: tool.slug } }"
              class="pf-sitemap__link"
            >
              {{ tool.name }}
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
  .pf-sitemap__hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 48px 0;
  }
  .pf-sitemap__title {
    font-size: clamp(28px, 4.5vw, 40px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    margin: 0 0 8px;
  }
  .pf-sitemap__lede {
    font-size: 16px;
    color: hsl(var(--color-text-muted));
    margin: 0;
  }
  .pf-sitemap__body {
    padding: 44px 0 20px;
  }
  .pf-sitemap__groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 28px;
    margin-bottom: 44px;
  }
  .pf-sitemap__group-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 16px;
  }
  .pf-sitemap__group-icon {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-sitemap__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .pf-sitemap__link {
    font-size: 14.5px;
    color: hsl(var(--color-text-muted));
    transition: color 0.15s;
  }
  .pf-sitemap__link:hover {
    color: hsl(var(--color-primary));
    text-decoration: underline;
  }
  .pf-sitemap__tools {
    border-top: 1px solid hsl(var(--color-border));
    padding-top: 32px;
  }
  .pf-sitemap__tool-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px 24px;
  }
</style>
