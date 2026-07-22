<script setup lang="ts">
  /** DisclaimerPage — service limitations and liability disclaimer. */
  import LegalDocument from '@components/marketing/LegalDocument.vue'
  import { DISCLAIMER_DOC, SITE_NAME, SITE_URL } from '@constants'
  import { usePageMeta } from '@composables'

  usePageMeta({
    title: 'Disclaimer — PDFly',
    description:
      'The PDFly Disclaimer covers service limitations, processing accuracy, your responsibility for uploaded files, third-party services and limitation of liability.',
    structuredData: () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Disclaimer',
      url: `${SITE_URL}/disclaimer`,
      description: DISCLAIMER_DOC.summary,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }),
  })
</script>

<template>
  <LegalDocument :doc="DISCLAIMER_DOC" />
</template>
