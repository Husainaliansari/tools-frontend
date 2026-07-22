<script setup lang="ts">
  /**
   * AppFooter — marketing footer with link columns and legal strip.
   */
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { ROUTE_NAMES } from '@constants'

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'All Tools', name: ROUTE_NAMES.TOOLS },
        { label: 'Pricing', name: ROUTE_NAMES.PRICING },
        { label: 'Dashboard', name: ROUTE_NAMES.DASHBOARD },
        { label: 'Sitemap', name: ROUTE_NAMES.SITEMAP },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', name: ROUTE_NAMES.ABOUT },
        { label: 'Contact Us', name: ROUTE_NAMES.CONTACT },
        { label: 'Feedback', name: ROUTE_NAMES.FEEDBACK },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', name: ROUTE_NAMES.HELP },
        { label: 'FAQ', name: ROUTE_NAMES.FAQ },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', name: ROUTE_NAMES.PRIVACY },
        { label: 'Terms & Conditions', name: ROUTE_NAMES.TERMS },
        { label: 'Disclaimer', name: ROUTE_NAMES.DISCLAIMER },
        { label: 'Cookie Policy', name: ROUTE_NAMES.COOKIES },
      ],
    },
  ] as const

  const socials = ['globe', 'mail', 'phone'] as const
</script>

<template>
  <footer class="pf-footer">
    <div class="pf-footer__grid">
      <div>
        <div class="pf-footer__brand">
          <span class="pf-footer__mark"><BaseIcon name="file-text" :size="18" /></span>
          <span class="pf-footer__word">PDF<span class="pf-footer__accent">ly</span></span>
        </div>
        <p class="pf-footer__tagline">
          Every PDF tool you need, in one friendly place. Free, fast and secure — right in your
          browser.
        </p>
        <div class="pf-footer__socials">
          <span v-for="ic in socials" :key="ic" class="pf-footer__social">
            <BaseIcon :name="ic" :size="17" />
          </span>
        </div>
      </div>

      <div v-for="col in columns" :key="col.title">
        <div class="pf-footer__col-title">{{ col.title }}</div>
        <RouterLink
          v-for="link in col.links"
          :key="link.label"
          :to="{ name: link.name }"
          class="pf-footer__link"
        >
          {{ link.label }}
        </RouterLink>
      </div>
    </div>

    <div class="pf-footer__legal">
      <span>© 2026 PDFly, Inc. All rights reserved.</span>
      <span class="pf-footer__ssl">
        <BaseIcon name="shield" :size="14" />
        256-bit SSL encrypted · Files deleted after 2 hours
      </span>
    </div>
  </footer>
</template>

<style scoped>
  .pf-footer {
    background: #0b1120;
    color: #cbd5e1;
    margin-top: 80px;
  }
  .pf-footer__grid {
    width: 90%;
    margin: 0 auto;
    padding: 56px 0 30px;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
    gap: 40px;
  }
  .pf-footer__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .pf-footer__mark {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: linear-gradient(145deg, hsl(var(--color-primary)), hsl(var(--color-indigo)));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }
  .pf-footer__word {
    font-weight: 800;
    font-size: 20px;
    color: #fff;
  }
  .pf-footer__accent {
    color: hsl(var(--color-primary));
  }
  .pf-footer__tagline {
    font-size: 14px;
    line-height: 1.6;
    color: #94a3b8;
    max-width: 300px;
    margin: 0;
  }
  .pf-footer__socials {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  .pf-footer__social {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: rgb(255 255 255 / 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
    cursor: pointer;
  }
  .pf-footer__col-title {
    font-weight: 700;
    font-size: 14px;
    color: #fff;
    margin-bottom: 16px;
  }
  .pf-footer__link {
    display: block;
    font-size: 13.5px;
    color: #94a3b8;
    margin-bottom: 11px;
    cursor: pointer;
    transition: color 0.15s;
  }
  .pf-footer__link:hover {
    color: #fff;
  }
  .pf-footer__legal {
    border-top: 1px solid rgb(255 255 255 / 0.08);
    padding: 20px 0;
    width: 90%;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    font-size: 13px;
    color: #64748b;
  }
  .pf-footer__ssl {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  @media (max-width: 899px) {
    .pf-footer__grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 520px) {
    .pf-footer__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
