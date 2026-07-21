<script setup lang="ts">
  /**
   * UploadDropzone — the modern first-touch upload surface shared by every
   * tool. Owns its drag state (with depth counting so child elements don't
   * flicker the highlight), announces validation problems, and offers the
   * cloud-import shortcuts. Selection handling stays with the parent.
   */
  import { computed, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { formatLimitMB } from '@constants/planLimits'
  import type { UploadSpec } from '@services/pdfTools.service'

  const props = defineProps<{
    spec: UploadSpec
    /** Current validation problem, shown inline under the CTA. */
    error?: string | null
  }>()

  const emit = defineEmits<{
    pick: []
    files: [files: FileList]
  }>()

  const dragDepth = ref(0)
  const dragActive = computed(() => dragDepth.value > 0)

  const extensionsLabel = computed(() =>
    props.spec.extensions.map((ext) => ext.slice(1).toUpperCase()).join(', '),
  )
  const filesLabel = computed(() =>
    props.spec.maxFiles === 1 ? 'Single file' : `Up to ${props.spec.maxFiles} files`,
  )

  function onDragEnter(): void {
    dragDepth.value += 1
  }
  function onDragLeave(): void {
    dragDepth.value = Math.max(0, dragDepth.value - 1)
  }
  function onDrop(event: DragEvent): void {
    dragDepth.value = 0
    if (event.dataTransfer?.files.length) emit('files', event.dataTransfer.files)
  }

  const importSources = [
    { icon: 'cloud', label: 'Google Drive' },
    { icon: 'cloud', label: 'Dropbox' },
    { icon: 'globe', label: 'From URL' },
  ]
</script>

<template>
  <div class="pf-drop-wrap">
    <div
      class="pf-drop"
      :class="{ 'pf-drop--active': dragActive, 'pf-drop--error': !!error }"
      role="button"
      tabindex="0"
      aria-label="Upload files: drag and drop here, or press Enter to browse"
      @click="emit('pick')"
      @keydown.enter.prevent="emit('pick')"
      @keydown.space.prevent="emit('pick')"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Animated corner brackets frame the active drop target -->
      <span class="pf-drop__corner pf-drop__corner--tl" aria-hidden="true" />
      <span class="pf-drop__corner pf-drop__corner--tr" aria-hidden="true" />
      <span class="pf-drop__corner pf-drop__corner--bl" aria-hidden="true" />
      <span class="pf-drop__corner pf-drop__corner--br" aria-hidden="true" />

      <div class="pf-drop__icon" :class="{ 'animate-floaty': !dragActive }">
        <BaseIcon :name="dragActive ? 'file-down' : 'upload'" :size="32" />
        <span class="pf-drop__icon-ring" aria-hidden="true" />
      </div>

      <div class="pf-drop__title">
        {{ dragActive ? 'Drop to add your files' : 'Drag & drop your files here' }}
      </div>
      <div class="pf-drop__sub">or click anywhere in this area to browse</div>

      <BaseButton size="lg" icon="plus" class="pf-drop__cta" @click.stop="emit('pick')">
        Select files
      </BaseButton>

      <!-- Capability chips: formats, count and size limits at a glance -->
      <div class="pf-drop__limits" aria-label="Upload limits">
        <span class="pf-drop__limit">
          <BaseIcon name="file-text" :size="13" /> {{ extensionsLabel }}
        </span>
        <span class="pf-drop__limit"> <BaseIcon name="layers" :size="13" /> {{ filesLabel }} </span>
        <span class="pf-drop__limit">
          <BaseIcon name="gauge" :size="13" />
          Max {{ formatLimitMB(spec.maxSizeMB) }}<template v-if="spec.maxFiles > 1">
            / file · {{ formatLimitMB(spec.maxTotalSizeMB) }} total</template
          >
        </span>
      </div>

      <div v-if="error" class="pf-drop__error" role="alert">
        <BaseIcon name="alert-circle" :size="15" /> {{ error }}
      </div>
    </div>

    <div class="pf-drop__sources">
      <button
        v-for="src in importSources"
        :key="src.label"
        type="button"
        class="pf-drop__source"
        @click="emit('pick')"
      >
        <BaseIcon :name="src.icon" :size="16" />
        {{ src.label }}
      </button>
    </div>

    <div class="pf-drop__secure">
      <BaseIcon name="shield" :size="15" />
      Your files are encrypted in transit and deleted automatically after 24 hours.
    </div>
  </div>
</template>

<style scoped>
  .pf-drop-wrap {
    padding: clamp(16px, 4vw, 40px);
  }

  .pf-drop {
    position: relative;
    border: 2px dashed hsl(var(--color-border-strong));
    border-radius: var(--radius-2xl);
    padding: clamp(30px, 6vw, 56px) clamp(14px, 3vw, 24px);
    text-align: center;
    background: hsl(var(--color-surface-muted));
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background 0.25s ease,
      box-shadow 0.25s ease,
      transform 0.2s ease;
  }
  .pf-drop:hover {
    border-color: hsl(var(--color-primary) / 0.55);
    background: hsl(var(--color-primary) / 0.03);
  }
  .pf-drop--active {
    border-color: hsl(var(--color-primary));
    border-style: solid;
    background: hsl(var(--color-primary) / 0.06);
    box-shadow:
      0 0 0 4px hsl(var(--color-primary) / 0.12),
      var(--shadow-lg);
    transform: scale(1.005);
  }
  .pf-drop--error {
    border-color: hsl(var(--color-danger) / 0.55);
    animation: pf-drop-shake 0.35s ease;
  }

  /* Corner brackets — only visible while dragging */
  .pf-drop__corner {
    position: absolute;
    width: 22px;
    height: 22px;
    border: 3px solid hsl(var(--color-primary));
    opacity: 0;
    transition:
      opacity 0.2s ease,
      transform 0.25s ease;
    pointer-events: none;
  }
  .pf-drop__corner--tl {
    top: 10px;
    left: 10px;
    border-right: none;
    border-bottom: none;
    border-top-left-radius: 10px;
    transform: translate(6px, 6px);
  }
  .pf-drop__corner--tr {
    top: 10px;
    right: 10px;
    border-left: none;
    border-bottom: none;
    border-top-right-radius: 10px;
    transform: translate(-6px, 6px);
  }
  .pf-drop__corner--bl {
    bottom: 10px;
    left: 10px;
    border-right: none;
    border-top: none;
    border-bottom-left-radius: 10px;
    transform: translate(6px, -6px);
  }
  .pf-drop__corner--br {
    bottom: 10px;
    right: 10px;
    border-left: none;
    border-top: none;
    border-bottom-right-radius: 10px;
    transform: translate(-6px, -6px);
  }
  .pf-drop--active .pf-drop__corner {
    opacity: 1;
    transform: translate(0, 0);
  }

  .pf-drop__icon {
    position: relative;
    width: 76px;
    height: 76px;
    border-radius: 22px;
    background: linear-gradient(
      160deg,
      hsl(var(--color-primary) / 0.16),
      hsl(var(--color-indigo) / 0.1)
    );
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    transition: transform 0.2s ease;
  }
  .pf-drop--active .pf-drop__icon {
    transform: scale(1.08);
  }
  .pf-drop__icon-ring {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid hsl(var(--color-primary) / 0.4);
    opacity: 0;
  }
  .pf-drop--active .pf-drop__icon-ring {
    animation: pf-drop-halo 1.4s ease-out infinite;
  }

  .pf-drop__title {
    font-weight: 700;
    font-size: 19px;
    letter-spacing: -0.01em;
    color: hsl(var(--color-text));
    margin-bottom: 6px;
  }
  .pf-drop__sub {
    font-size: 14px;
    color: hsl(var(--color-text-muted));
    margin-bottom: 20px;
  }
  .pf-drop__cta {
    pointer-events: auto;
  }

  .pf-drop__limits {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 22px;
  }
  .pf-drop__limit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    color: hsl(var(--color-text-muted));
    font-size: 12px;
    font-weight: 600;
  }

  .pf-drop__error {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 18px;
    padding: 10px 16px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.1);
    color: hsl(var(--color-danger));
    font-weight: 600;
    font-size: 13.5px;
    animation: fadeUp 0.25s ease;
  }

  .pf-drop__sources {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  .pf-drop__source {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 15px;
    border-radius: var(--radius-md);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease,
      box-shadow 0.15s ease;
  }
  .pf-drop__source:hover {
    border-color: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .pf-drop__secure {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    margin-top: 20px;
    font-size: 13px;
    color: hsl(var(--color-text-faint));
  }

  @keyframes pf-drop-halo {
    0% {
      transform: scale(1);
      opacity: 0.55;
    }
    100% {
      transform: scale(1.45);
      opacity: 0;
    }
  }
  @keyframes pf-drop-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }

  @media (max-width: 520px) {
    .pf-drop__sources {
      gap: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-drop,
    .pf-drop--error,
    .pf-drop__error,
    .pf-drop__icon,
    .pf-drop__icon-ring,
    .pf-drop__corner,
    .pf-drop__source {
      animation: none;
      transition: none;
    }
    .pf-drop--active {
      transform: none;
    }
  }
</style>
