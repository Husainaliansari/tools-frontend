<script setup lang="ts">
  /**
   * FilesPage — the user's file library with search, list/grid views and
   * pagination.
   */
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import EmptyState from '@components/ui/EmptyState.vue'
  import FileActionsMenu from '@components/app/FileActionsMenu.vue'
  import { MOCK_FILES, ROUTE_NAMES } from '@constants'
  import { hexAlpha } from '@utils'
  import { useFeedback } from '@composables'

  const router = useRouter()
  const { showToast } = useFeedback()

  const query = ref('')
  const view = ref<'list' | 'grid'>('list')

  const filtered = computed(() =>
    MOCK_FILES.filter((f) => f.name.toLowerCase().includes(query.value.trim().toLowerCase())),
  )

  const columns = ['Name', 'Type', 'Size', 'Pages', 'Modified', 'Status', '']

  function upload() {
    router.push({ name: ROUTE_NAMES.TOOLS })
  }
</script>

<template>
  <div class="pf-files animate-fade-up">
    <!-- Toolbar -->
    <div class="pf-files__toolbar">
      <div class="pf-files__search">
        <BaseInput v-model="query" icon="search" placeholder="Search files…" />
      </div>
      <BaseButton variant="secondary" icon="filter" @click="showToast('Filter panel')"
        >Filter</BaseButton
      >
      <BaseButton
        variant="secondary"
        icon="list"
        icon-right="chevron-down"
        @click="showToast('Sort by…')"
      >
        Sort
      </BaseButton>
      <div class="pf-viewtoggle">
        <button
          v-for="v in ['list', 'grid'] as const"
          :key="v"
          type="button"
          class="pf-viewtoggle__btn"
          :class="{ 'pf-viewtoggle__btn--active': view === v }"
          :aria-label="`${v} view`"
          @click="view = v"
        >
          <BaseIcon :name="v" :size="17" />
        </button>
      </div>
      <BaseButton icon="upload" @click="upload">Upload</BaseButton>
    </div>

    <!-- Empty -->
    <BaseCard v-if="!filtered.length">
      <EmptyState
        icon="folder"
        title="No files found"
        body="Nothing matches your search. Try a different term or upload something new."
      >
        <template #action>
          <BaseButton icon="upload" @click="upload">Upload a file</BaseButton>
        </template>
      </EmptyState>
    </BaseCard>

    <!-- List view -->
    <BaseCard v-else-if="view === 'list'">
      <div class="pf-table-scroll">
        <table class="pf-table">
          <thead>
            <tr>
              <th v-for="(col, i) in columns" :key="i">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in filtered" :key="file.name">
              <td>
                <div class="pf-table__name">
                  <span
                    class="pf-table__thumb"
                    :style="{ color: file.color, background: hexAlpha(file.color, 0.14) }"
                  >
                    {{ file.type }}
                  </span>
                  <span class="pf-table__filename">{{ file.name }}</span>
                </div>
              </td>
              <td
                ><BaseBadge tone="neutral">{{ file.type }}</BaseBadge></td
              >
              <td class="pf-table__muted">{{ file.size }}</td>
              <td class="pf-table__muted">{{ file.pages }}</td>
              <td class="pf-table__muted pf-table__nowrap">{{ file.modified }}</td>
              <td
                ><BaseBadge tone="info">{{ file.tool }}</BaseBadge></td
              >
              <td class="pf-table__actions"><FileActionsMenu /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Grid view -->
    <div v-else class="pf-files__grid">
      <BaseCard v-for="file in filtered" :key="file.name">
        <div class="pf-fcard">
          <div class="pf-fcard__preview">
            <div class="pf-fcard__icon" :style="{ color: file.color }"
              ><BaseIcon name="file-text" :size="44"
            /></div>
            <span class="pf-fcard__type" :style="{ background: file.color }">{{ file.type }}</span>
            <span class="pf-fcard__menu"><FileActionsMenu /></span>
          </div>
          <div class="pf-fcard__name">{{ file.name }}</div>
          <div class="pf-fcard__sub">{{ file.size }} · {{ file.modified }}</div>
        </div>
      </BaseCard>
    </div>

    <!-- Pagination -->
    <div v-if="filtered.length" class="pf-pager">
      <div class="pf-pager__count"
        >Showing {{ filtered.length }} of {{ MOCK_FILES.length }} files</div
      >
      <div class="pf-pager__pages">
        <button type="button" class="pf-pager__btn" aria-label="Previous page">
          <BaseIcon name="chevron-left" :size="16" />
        </button>
        <button
          v-for="(p, i) in ['1', '2', '3']"
          :key="p"
          type="button"
          class="pf-pager__btn pf-pager__btn--num"
          :class="{ 'pf-pager__btn--active': i === 0 }"
        >
          {{ p }}
        </button>
        <button type="button" class="pf-pager__btn" aria-label="Next page">
          <BaseIcon name="chevron-right" :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .pf-files {
    display: grid;
    gap: 20px;
  }
  .pf-files__toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  .pf-files__search {
    flex: 1 1 240px;
    min-width: 200px;
  }
  .pf-viewtoggle {
    display: flex;
    background: hsl(var(--color-surface-muted));
    border-radius: var(--radius-lg);
    padding: 4px;
    border: 1px solid hsl(var(--color-border));
  }
  .pf-viewtoggle__btn {
    width: 38px;
    height: 34px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-viewtoggle__btn--active {
    background: hsl(var(--color-surface));
    color: hsl(var(--color-primary));
    box-shadow: var(--shadow-sm);
  }

  .pf-table-scroll {
    overflow-x: auto;
  }
  .pf-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 640px;
  }
  .pf-table th {
    text-align: left;
    padding: 14px 18px;
    font-size: 12px;
    font-weight: 700;
    color: hsl(var(--color-text-faint));
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid hsl(var(--color-border));
    white-space: nowrap;
  }
  .pf-table td {
    padding: 13px 18px;
    border-bottom: 1px solid hsl(var(--color-border));
    vertical-align: middle;
  }
  .pf-table tbody tr {
    cursor: pointer;
    transition: background 0.15s;
  }
  .pf-table tbody tr:hover {
    background: hsl(var(--color-chip));
  }
  .pf-table__name {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pf-table__thumb {
    width: 34px;
    height: 42px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8.5px;
    font-weight: 800;
    flex: none;
  }
  .pf-table__filename {
    font-weight: 600;
    font-size: 14px;
    color: hsl(var(--color-text));
  }
  .pf-table__muted {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
  }
  .pf-table__nowrap {
    white-space: nowrap;
  }
  .pf-table__actions {
    text-align: right;
  }

  .pf-files__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .pf-fcard {
    padding: 16px;
  }
  .pf-fcard__preview {
    position: relative;
    height: 120px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    overflow: hidden;
  }
  .pf-fcard__icon {
    opacity: 0.5;
  }
  .pf-fcard__type {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 10px;
    font-weight: 800;
    color: #fff;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .pf-fcard__menu {
    position: absolute;
    top: 8px;
    right: 8px;
  }
  .pf-fcard__name {
    font-weight: 600;
    font-size: 13.5px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-fcard__sub {
    font-size: 12px;
    color: hsl(var(--color-text-faint));
    margin-top: 3px;
  }

  .pf-pager {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pf-pager__count {
    font-size: 13.5px;
    color: hsl(var(--color-text-faint));
  }
  .pf-pager__pages {
    display: flex;
    gap: 6px;
  }
  .pf-pager__btn {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13.5px;
  }
  .pf-pager__btn--active {
    border-color: transparent;
    background: hsl(var(--color-primary));
    color: #fff;
  }
</style>
