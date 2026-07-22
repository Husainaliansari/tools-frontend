<script setup lang="ts">
  /** PrivacyPage — comprehensive privacy policy. */
  import LegalDocument from '@components/marketing/LegalDocument.vue'
  import { PRIVACY_DOC, SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Privacy Policy — PDFly',
    description:
      'Read the PDFly Privacy Policy: what data we collect, how uploaded files are processed and automatically deleted, cookies, analytics, your rights and data retention.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Privacy Policy',
      url: `${SITE_URL}/privacy`,
      description: PRIVACY_DOC.summary,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })
</script>

<template>
  <LegalDocument :doc="PRIVACY_DOC" />
</template>
