<script setup lang="ts">
  /**
   * DownloadsPage — history of processed/downloaded files.
   */
  import { computed, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import EmptyState from '@components/ui/EmptyState.vue'
  import { MOCK_DOWNLOADS } from '@constants'
  import { hexAlpha } from '@utils'
  import { useFeedback } from '@composables'

  const { showToast, confirm } = useFeedback()
  const query = ref('')

  const filtered = computed(() =>
    MOCK_DOWNLOADS.filter((d) => d.name.toLowerCase().includes(query.value.trim().toLowerCase())),
  )

  function clearHistory() {
    confirm({
      title: 'Clear download history?',
      body: 'This removes all download records. Your files won’t be deleted.',
      confirmLabel: 'Clear',
      toast: 'History cleared',
    })
  }

  function removeItem() {
    confirm({
      title: 'Delete this download?',
      body: 'The record will be removed from your history.',
      toast: 'Removed',
    })
  }
</script>

<template>
  <div class="pf-dl animate-fade-up">
    <div class="pf-dl__toolbar">
      <div class="pf-dl__search">
        <BaseInput v-model="query" icon="search" placeholder="Search downloads…" />
      </div>
      <BaseButton variant="secondary" icon="filter" @click="showToast('Filter panel')"
        >Filter</BaseButton
      >
      <BaseButton variant="secondary" icon="trash" @click="clearHistory">Clear history</BaseButton>
    </div>

    <BaseCard>
      <div class="pf-dl__list">
        <template v-if="filtered.length">
          <div v-for="item in filtered" :key="item.name" class="pf-dl__item">
            <div
              class="pf-dl__thumb"
              :style="{ color: item.color, background: hexAlpha(item.color, 0.14) }"
            >
              {{ item.type }}
            </div>
            <div class="pf-dl__meta">
              <div class="pf-dl__name">{{ item.name }}</div>
              <div class="pf-dl__sub">
                <span>{{ item.size }}</span>
                <span>·</span>
                <span class="pf-dl__date"
                  ><BaseIcon name="clock" :size="12" /> {{ item.date }}</span
                >
              </div>
            </div>
            <BaseBadge tone="neutral">{{ item.type }}</BaseBadge>
            <div class="pf-dl__actions">
              <BaseButton
                variant="soft"
                size="sm"
                icon="download"
                @click="showToast('Downloading…')"
              />
              <button
                type="button"
                class="pf-dl__delete"
                aria-label="Delete download"
                @click="removeItem"
              >
                <BaseIcon name="trash" :size="16" />
              </button>
            </div>
          </div>
        </template>
        <EmptyState
          v-else
          icon="download"
          title="No downloads yet"
          body="Files you download will show up here for easy access."
        />
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
  .pf-dl {
    display: grid;
    gap: 20px;
  }
  .pf-dl__toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  .pf-dl__search {
    flex: 1 1 240px;
    min-width: 200px;
  }
  .pf-dl__list {
    padding: 8px;
  }
  .pf-dl__item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 14px;
    border-radius: var(--radius-lg);
    transition: background 0.15s;
  }
  .pf-dl__item:hover {
    background: hsl(var(--color-chip));
  }
  .pf-dl__thumb {
    width: 42px;
    height: 52px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    font-size: 9px;
    font-weight: 800;
  }
  .pf-dl__meta {
    flex: 1;
    min-width: 0;
  }
  .pf-dl__name {
    font-weight: 600;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-dl__sub {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 2px;
  }
  .pf-dl__date {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .pf-dl__actions {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .pf-dl__delete {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-dl__delete:hover {
    color: hsl(var(--color-danger));
  }
</style>
