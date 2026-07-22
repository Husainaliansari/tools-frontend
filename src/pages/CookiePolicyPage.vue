<script setup lang="ts">
  /** CookiePolicyPage — how PDFly uses cookies. */
  import LegalDocument from '@components/marketing/LegalDocument.vue'
  import { COOKIE_DOC, SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Cookie Policy — PDFly',
    description:
      'The PDFly Cookie Policy explains what cookies are, the types we use (necessary, preference, analytics and advertising), why we use them and how to control them.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Cookie Policy',
      url: `${SITE_URL}/cookies`,
      description: COOKIE_DOC.summary,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })
</script>

<template>
  <LegalDocument :doc="COOKIE_DOC" />
</template>
