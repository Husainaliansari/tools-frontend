<script setup lang="ts">
  /** TermsPage — terms & conditions. */
  import LegalDocument from '@components/marketing/LegalDocument.vue'
  import { TERMS_DOC, SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Terms & Conditions — PDFly',
    description:
      'The PDFly Terms & Conditions: acceptable use, account responsibilities, subscription plans and payments, refunds, intellectual property, liability and termination.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Terms & Conditions',
      url: `${SITE_URL}/terms`,
      description: TERMS_DOC.summary,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })
</script>

<template>
  <LegalDocument :doc="TERMS_DOC" />
</template>
