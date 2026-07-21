<script setup lang="ts">
  /**
   * ToolsPage — full tool catalogue with search and category filtering.
   */
  import { computed, ref } from 'vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import EmptyState from '@components/ui/EmptyState.vue'
  import ToolTile from '@components/tools/ToolTile.vue'
  import { TOOL_CATEGORIES, TOOL_COUNT, TOOLS } from '@constants'
  import type { ToolCategory } from '@types'

  const query = ref('')
  const activeCategory = ref<ToolCategory | 'All'>('All')

  const filterOptions = ['All', ...TOOL_CATEGORIES] as const

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    return TOOLS.filter((tool) => {
      const matchesCategory =
        activeCategory.value === 'All' || tool.category === activeCategory.value
      const matchesQuery =
        !q || tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  })
</script>

<template>
  <div>
    <section class="pf-tools-hero">
      <div class="pf-container pf-tools-hero__inner">
        <h1 class="pf-tools-hero__title">All PDF Tools</h1>
        <p class="pf-tools-hero__lede">
          {{ TOOL_COUNT }} free tools to convert, edit, organize and secure your documents.
        </p>
        <div class="pf-tools-hero__search">
          <BaseInput v-model="query" icon="search" placeholder="Search tools…" />
        </div>
      </div>
    </section>

    <section class="pf-container pf-tools-body">
      <div class="pf-tools-filters">
        <button
          v-for="cat in filterOptions"
          :key="cat"
          type="button"
          class="pf-chip"
          :class="{ 'pf-chip--active': activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div v-if="filtered.length" class="pf-tools-grid">
        <ToolTile v-for="tool in filtered" :key="tool.slug" :tool="tool" />
      </div>
      <EmptyState v-else title="No tools found" body="Try a different search term or category." />
    </section>
  </div>
</template>

<style scoped>
  .pf-tools-hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 52px 0 44px;
  }
  .pf-tools-hero__inner {
    text-align: center;
  }
  .pf-tools-hero__title {
    font-size: clamp(30px, 5vw, 46px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: hsl(var(--color-text));
    margin: 0 0 14px;
  }
  .pf-tools-hero__lede {
    font-size: 17px;
    color: hsl(var(--color-text-muted));
    max-width: 520px;
    margin: 0 auto 26px;
  }
  .pf-tools-hero__search {
    max-width: 480px;
    margin: 0 auto;
  }
  .pf-tools-body {
    padding-top: 28px;
    padding-bottom: 20px;
  }
  .pf-tools-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 26px;
  }
  .pf-chip {
    padding: 9px 16px;
    border-radius: var(--radius-full);
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
  }
  .pf-chip:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .pf-chip--active {
    border-color: transparent;
    background: hsl(var(--color-primary));
    color: #fff;
  }
  .pf-tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  @media (max-width: 640px) {
    .pf-tools-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }
</style>
