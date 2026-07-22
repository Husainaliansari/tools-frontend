<script setup lang="ts">
  /**
   * ToolPage — a single tool's landing + workspace. Resolves the tool from the
   * `:slug` route param; unknown slugs render the 404 page.
   */
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import AppBreadcrumbs from '@components/ui/AppBreadcrumbs.vue'
  import FaqItem from '@components/ui/FaqItem.vue'
  import ToolWorkspace from '@components/tools/ToolWorkspace.vue'
  import SignWorkspace from '@components/tools/sign/SignWorkspace.vue'
  import EditorWorkspace from '@components/editor/EditorWorkspace.vue'
  import ToolTileSlim from '@components/tools/ToolTileSlim.vue'
  import NotFoundPage from '@pages/NotFoundPage.vue'
  import { ROUTE_NAMES, SITE_NAME, SITE_URL, getRelatedTools, getToolBySlug } from '@constants'
  import { hexAlpha } from '@utils'
  import { usePageMeta } from '@composables'
  import type { BreadcrumbItem } from '@types'

  import { PLAN_LIMITS, formatLimitMB } from '@constants/planLimits'

  const route = useRoute()
  const tool = computed(() => getToolBySlug(route.params.slug as string))
  const isWorkspaceActive = ref(false)

  usePageMeta({
    title: () => (tool.value ? `${tool.value.name} — Free Online Tool | PDFly` : 'PDF Tool — PDFly'),
    description: () =>
      tool.value
        ? `${tool.value.description} Free, fast and secure — ${tool.value.name} runs right in your browser with PDFly. Files are encrypted and auto-deleted.`
        : undefined,
    noindex: () => !tool.value,
    structuredData: () =>
      tool.value
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: tool.value.name,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: `${SITE_URL}/tools/${tool.value.slug}`,
              description: tool.value.description,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                { '@type': 'ListItem', position: 2, name: 'All Tools', item: `${SITE_URL}/tools` },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: tool.value.name,
                  item: `${SITE_URL}/tools/${tool.value.slug}`,
                },
              ],
            },
          ]
        : undefined,
  })

  const crumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Home', to: { name: ROUTE_NAMES.HOME } },
    { label: 'All Tools', to: { name: ROUTE_NAMES.TOOLS } },
    { label: tool.value?.name ?? 'Tool' },
  ])

  const related = computed(() => (tool.value ? getRelatedTools(tool.value) : []))

  const faqs = computed(() => {
    if (!tool.value) return []
    return [
      {
        question: `Is ${tool.value.name} free to use?`,
        answer:
          'Yes — use it free with daily limits. Pro unlocks larger files and batch processing.',
      },
      {
        question: 'Are my files kept private?',
        answer: 'Files are encrypted and deleted automatically within two hours of processing.',
      },
      {
        question: 'Is there a file size limit?',
        answer: `Free users can process files up to ${formatLimitMB(PLAN_LIMITS.free.maxFileSizeMB)}. Pro raises this to ${formatLimitMB(PLAN_LIMITS.pro.maxFileSizeMB)} per file.`,
      },
    ]
  })
</script>

<template>
  <NotFoundPage v-if="!tool" />
  <div v-else>
    <div v-if="!isWorkspaceActive" class="pf-tool-wrap pf-tool-crumbs">
      <AppBreadcrumbs :items="crumbs" />
    </div>

    <section v-if="!isWorkspaceActive" class="pf-tool-wrap pf-tool-hero">
      <div
        class="pf-tool-hero__icon"
        :style="{ color: tool.color, background: hexAlpha(tool.color, 0.14) }"
      >
        <BaseIcon :name="tool.icon" :size="34" />
      </div>
      <h1 class="pf-tool-hero__title">{{ tool.name }}</h1>
      <p class="pf-tool-hero__desc">{{ tool.description }}</p>
      <div class="pf-tool-hero__formats">
        <span>Supported:</span>
        <span v-for="fmt in tool.formats" :key="fmt" class="pf-format">{{ fmt }}</span>
        <template v-if="tool.output">
          <BaseIcon name="arrow-right" :size="13" />
          <span
            class="pf-format pf-format--out"
            :style="{ color: tool.color, background: hexAlpha(tool.color, 0.14) }"
          >
            {{ tool.output }}
          </span>
        </template>
      </div>
    </section>

    <section :class="isWorkspaceActive ? 'pf-tool-workspace--active' : 'pf-tool-wrap pf-tool-workspace'">
      <!-- The advanced Editor and Sign get dedicated client-side workspaces;
           every other tool runs the generic upload → options → process flow. -->
      <EditorWorkspace
        v-if="tool.slug === 'editor'"
        :key="tool.slug"
        :tool="tool"
        @active="isWorkspaceActive = $event"
      />
      <SignWorkspace
        v-else-if="tool.slug === 'sign'"
        :key="tool.slug"
        :tool="tool"
        @active="isWorkspaceActive = $event"
      />
      <ToolWorkspace v-else :key="tool.slug" :tool="tool" />
    </section>

    <section v-if="!isWorkspaceActive" class="pf-tool-related">
      <h2 class="pf-tool-related__title">Related tools</h2>
      <div class="pf-tool-related__grid">
        <ToolTileSlim v-for="rel in related" :key="rel.slug" :tool="rel" />
      </div>
    </section>

    <section v-if="!isWorkspaceActive" class="pf-tool-faq">
      <h2 class="pf-tool-faq__title">{{ tool.name }} — FAQ</h2>
      <div class="pf-tool-faq__list">
        <FaqItem
          v-for="faq in faqs"
          :key="faq.question"
          :question="faq.question"
          :answer="faq.answer"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
  .pf-tool-wrap {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 0 24px;
    min-width: 0;
  }
  .pf-tool-crumbs {
    padding-top: 20px;
  }
  .pf-tool-hero {
    text-align: center;
    padding-top: 18px;
    padding-bottom: 8px;
  }
  .pf-tool-hero__icon {
    width: 70px;
    height: 70px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
    box-shadow: var(--shadow-sm);
  }
  .pf-tool-hero__title {
    font-size: clamp(28px, 4.5vw, 42px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    margin: 0 0 12px;
    box-shadow: none;
  }
  .pf-tool-hero__desc {
    font-size: 17px;
    color: hsl(var(--color-text-muted));
    max-width: 520px;
    margin: 0 auto 14px;
    line-height: 1.5;
  }
  .pf-tool-hero__formats {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: 13px;
    color: hsl(var(--color-text-faint));
    font-weight: 600;
  }
  .pf-format {
    padding: 3px 9px;
    border-radius: 7px;
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-muted));
    font-weight: 700;
    font-size: 12px;
  }
  .pf-tool-workspace {
    padding-top: 26px;
  }
  .pf-tool-workspace--active {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
  .pf-tool-related {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 70px 24px 0;
  }
  .pf-tool-related__title {
    font-size: 22px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 20px;
    letter-spacing: -0.01em;
  }
  .pf-tool-related__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 14px;
  }
  .pf-tool-faq {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 56px 24px 0;
  }
  .pf-tool-faq__title {
    font-size: 22px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 18px;
    text-align: center;
  }
  .pf-tool-faq__list {
    display: grid;
    gap: 12px;
  }

  @media (max-width: 640px) {
    /* Reclaim horizontal space on phones: the 90% + 24px gutter combination
       leaves too little room for content at narrow widths. */
    .pf-tool-wrap,
    .pf-tool-related,
    .pf-tool-faq {
      width: 100%;
      max-width: 100%;
      padding-left: 16px;
      padding-right: 16px;
    }
    .pf-tool-related {
      padding-top: 48px;
    }
    .pf-tool-faq {
      padding-top: 40px;
    }
    .pf-tool-hero__icon {
      width: 60px;
      height: 60px;
      border-radius: 16px;
    }
    .pf-tool-hero__desc {
      font-size: 15.5px;
    }
  }
</style>
