<script setup lang="ts">
  /**
   * FileCard — premium card for one selected file, shared by the ready and
   * processing stages so every tool gets the same file experience.
   *
   * Shows a real thumbnail (PDF first page / image), name, size and page
   * count, plus quick actions (Preview, Replace, Download original, Remove).
   * While a run is in flight the actions give way to a circular per-file
   * progress indicator, status badge, ETA and early result download.
   */
  import { computed } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import ProgressRing from '@components/ui/ProgressRing.vue'
  import FileThumb from '@components/tools/workflow/FileThumb.vue'
  import { useFileThumbnail } from '@composables'
  import type { BadgeTone, ToolFile, ToolFileStatus } from '@types'

  const props = withDefaults(
    defineProps<{
      file: ToolFile
      /** 'ready' shows quick actions; 'processing' shows live pipeline state. */
      mode?: 'ready' | 'processing'
      /** Accent color of the running tool (progress ring gradient end). */
      toolColor?: string
      /** Allow the Replace action (hidden when the selection is locked). */
      canReplace?: boolean
      /** Download URL for this file's finished result(s), when available. */
      resultUrl?: string | null
    }>(),
    { mode: 'ready', toolColor: undefined, canReplace: true, resultUrl: null },
  )

  const emit = defineEmits<{
    preview: []
    replace: []
    remove: []
    'download-original': []
  }>()

  const raw = computed(() => props.file.raw ?? null)
  const { thumbnail } = useFileThumbnail(raw)

  const pageLabel = computed(() => {
    const pages = thumbnail.value?.pages
    if (!pages) return null
    return pages === 1 ? '1 page' : `${pages} pages`
  })

  const STATUS_META: Record<
    ToolFileStatus,
    { label: string; tone: BadgeTone; icon: string; motion?: 'spin' | 'pulse' | 'pop' }
  > = {
    waiting: { label: 'Waiting', tone: 'neutral', icon: 'clock' },
    uploading: { label: 'Uploading', tone: 'info', icon: 'upload', motion: 'pulse' },
    converting: { label: 'Processing', tone: 'info', icon: 'refresh', motion: 'spin' },
    completed: { label: 'Completed', tone: 'success', icon: 'check-circle', motion: 'pop' },
    failed: { label: 'Failed', tone: 'danger', icon: 'alert-circle' },
  }

  const status = computed(() => STATUS_META[props.file.status ?? 'waiting'])
  const isActive = computed(
    () => props.file.status === 'uploading' || props.file.status === 'converting',
  )
  const percent = computed(() => Math.round(props.file.progress ?? 0))

  const etaLabel = computed(() => {
    const seconds = props.file.etaSeconds
    if (!seconds) return null
    if (seconds < 90) return `~${seconds}s left`
    return `~${Math.floor(seconds / 60)}m ${seconds % 60}s left`
  })

  const actions = computed(() => [
    { key: 'preview', icon: 'eye', label: 'Preview', show: Boolean(raw.value) },
    { key: 'replace', icon: 'refresh', label: 'Replace', show: props.canReplace },
    {
      key: 'download-original',
      icon: 'download',
      label: 'Download original',
      show: Boolean(raw.value),
    },
    { key: 'remove', icon: 'trash', label: 'Remove', show: true, danger: true },
  ])

  function onAction(key: string): void {
    if (key === 'preview') emit('preview')
    else if (key === 'replace') emit('replace')
    else if (key === 'download-original') emit('download-original')
    else if (key === 'remove') emit('remove')
  }
</script>

<template>
  <div
    class="pf-fcard"
    :class="{
      'pf-fcard--active': mode === 'processing' && isActive,
      'pf-fcard--done': file.status === 'completed',
      'pf-fcard--failed': file.status === 'failed',
    }"
  >
    <button
      v-if="raw"
      type="button"
      class="pf-fcard__thumb-btn"
      :aria-label="`Preview ${file.name}`"
      @click="emit('preview')"
    >
      <FileThumb :file="raw" :name="file.name" :size="52" />
      <span class="pf-fcard__thumb-zoom" aria-hidden="true">
        <BaseIcon name="zoom-in" :size="15" />
      </span>
    </button>
    <FileThumb v-else :file="raw" :name="file.name" :size="52" />

    <div class="pf-fcard__meta">
      <div class="pf-fcard__name" :title="file.name">{{ file.name }}</div>
      <div class="pf-fcard__sub">
        <span>{{ file.size }}</span>
        <template v-if="pageLabel">
          <span class="pf-fcard__dot" aria-hidden="true">·</span>
          <span>{{ pageLabel }}</span>
        </template>
        <template v-if="mode === 'processing' && etaLabel && isActive">
          <span class="pf-fcard__dot" aria-hidden="true">·</span>
          <span class="pf-fcard__eta">{{ etaLabel }}</span>
        </template>
      </div>
      <div v-if="mode === 'processing' && file.status === 'failed'" class="pf-fcard__error">
        {{ file.error }}
      </div>
    </div>

    <!-- Ready: quick actions -->
    <div v-if="mode === 'ready'" class="pf-fcard__actions">
      <button
        v-for="action in actions.filter((a) => a.show)"
        :key="action.key"
        type="button"
        class="pf-fcard__action"
        :class="{ 'pf-fcard__action--danger': action.danger }"
        :aria-label="`${action.label} ${file.name}`"
        :title="action.label"
        @click="onAction(action.key)"
      >
        <BaseIcon :name="action.icon" :size="16" />
      </button>
    </div>

    <!-- Processing: circular progress + status -->
    <div v-else class="pf-fcard__pipeline">
      <BaseBadge :tone="status.tone">
        <span
          class="pf-fcard__status-icon"
          :class="status.motion && `pf-fcard__status-icon--${status.motion}`"
        >
          <BaseIcon :name="status.icon" :size="12" />
        </span>
        {{ status.label }}
      </BaseBadge>

      <div v-if="file.status !== 'failed'" class="pf-fcard__ring">
        <ProgressRing
          :progress="percent"
          :color="toolColor"
          :label="`${file.name} progress`"
        >
          <span class="pf-fcard__ring-pct">{{ percent }}<small>%</small></span>
        </ProgressRing>
      </div>

      <a
        v-if="file.status === 'completed' && resultUrl"
        class="pf-fcard__result"
        :href="resultUrl"
        target="_blank"
        rel="noopener"
        :aria-label="`Download processed ${file.name}`"
        title="Download result"
      >
        <BaseIcon name="download" :size="16" />
      </a>
    </div>
  </div>
</template>

<style scoped>
  .pf-fcard {
    display: flex;
    align-items: center;
    gap: clamp(10px, 2vw, 14px);
    padding: 12px clamp(10px, 2vw, 14px);
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    min-width: 0;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
    animation: fadeUp 0.25s ease;
  }
  .pf-fcard:hover {
    border-color: hsl(var(--color-border-strong));
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .pf-fcard--active {
    border-color: hsl(var(--color-primary) / 0.35);
    box-shadow: 0 2px 14px -6px hsl(var(--color-primary) / 0.4);
  }
  .pf-fcard--done {
    border-color: hsl(var(--color-success) / 0.35);
  }
  .pf-fcard--failed {
    border-color: hsl(var(--color-danger) / 0.4);
    background: hsl(var(--color-danger) / 0.03);
  }

  .pf-fcard__thumb-btn {
    position: relative;
    flex: none;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
    border-radius: 10px;
  }
  .pf-fcard__thumb-zoom {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgb(10 15 30 / 0.45);
    color: #fff;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .pf-fcard__thumb-btn:hover .pf-fcard__thumb-zoom,
  .pf-fcard__thumb-btn:focus-visible .pf-fcard__thumb-zoom {
    opacity: 1;
  }

  .pf-fcard__meta {
    flex: 1;
    min-width: 0;
  }
  .pf-fcard__name {
    font-weight: 600;
    font-size: 14px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-fcard__sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    font-variant-numeric: tabular-nums;
    flex-wrap: wrap;
  }
  .pf-fcard__dot {
    color: hsl(var(--color-border-strong));
  }
  .pf-fcard__eta {
    color: hsl(var(--color-text-muted));
    font-weight: 600;
  }
  .pf-fcard__error {
    margin-top: 4px;
    font-size: 12.5px;
    color: hsl(var(--color-danger));
    overflow-wrap: anywhere;
  }

  /* Quick actions — revealed on hover/focus for a calm resting state */
  .pf-fcard__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }
  .pf-fcard__action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }
  .pf-fcard__action:hover,
  .pf-fcard__action:focus-visible {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-primary));
    transform: translateY(-1px);
  }
  .pf-fcard__action--danger:hover,
  .pf-fcard__action--danger:focus-visible {
    background: hsl(var(--color-danger) / 0.1);
    color: hsl(var(--color-danger));
  }

  /* Processing pipeline cluster */
  .pf-fcard__pipeline {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
  }
  .pf-fcard__ring {
    width: 44px;
    flex: none;
  }
  .pf-fcard__ring-pct {
    font-size: 10.5px;
    font-weight: 800;
    color: hsl(var(--color-text));
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .pf-fcard__ring-pct small {
    font-size: 7.5px;
    font-weight: 700;
    color: hsl(var(--color-text-faint));
  }
  .pf-fcard__status-icon {
    display: inline-flex;
  }
  .pf-fcard__status-icon--spin {
    animation: spin 1.4s linear infinite;
  }
  .pf-fcard__status-icon--pulse {
    animation: pulseDot 1.2s ease-in-out infinite;
  }
  .pf-fcard__status-icon--pop {
    animation: pf-card-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .pf-fcard__result {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: hsl(var(--color-success));
    background: hsl(var(--color-success) / 0.12);
    transition: background 0.15s;
    animation: pf-card-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .pf-fcard__result:hover {
    background: hsl(var(--color-success) / 0.22);
  }

  @keyframes pf-card-pop {
    0% {
      transform: scale(0.4);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 480px) {
    .pf-fcard__ring {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-fcard,
    .pf-fcard__status-icon--spin,
    .pf-fcard__status-icon--pulse,
    .pf-fcard__status-icon--pop,
    .pf-fcard__result {
      animation: none;
    }
    .pf-fcard:hover {
      transform: none;
    }
  }
</style>
