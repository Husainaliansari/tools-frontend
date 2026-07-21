<script setup lang="ts">
  /**
   * ToolWorkspace — the interactive upload → ready → processing → done flow for
   * a tool page. Files upload to the backend, the tool runs as a background
   * job, and results download from the API.
   */
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import ConversionAnimation from '@components/tools/ConversionAnimation.vue'
  import ToolOptions from '@components/tools/ToolOptions.vue'
  import FileCard from '@components/tools/workflow/FileCard.vue'
  import FileThumb from '@components/tools/workflow/FileThumb.vue'
  import FilePreviewModal from '@components/tools/workflow/FilePreviewModal.vue'
  import ProcessingStages from '@components/tools/workflow/ProcessingStages.vue'
  import UploadDropzone from '@components/tools/workflow/UploadDropzone.vue'
  import RedactEditor from '@components/tools/redact/RedactEditor.vue'
  import { toBackendAreas, type RedactionRegion } from '@components/tools/redact/redact-types'
  import { ROUTE_NAMES } from '@constants'
  import { sourceFormat, targetFormat } from '@constants/formats'
  import { formatLimitMB } from '@constants/planLimits'
  import { useToolFlow, useFeedback } from '@composables'
  import { pdfToolsService, uploadSpecFor } from '@services/pdfTools.service'
  import { useAuthStore } from '@stores/auth.store'
  import type { PdfTool, ToolFile } from '@types'

  const props = defineProps<{ tool: PdfTool }>()

  const router = useRouter()
  const { showToast } = useFeedback()
  const {
    stage,
    files,
    progress,
    errorMessage,
    validationError,
    outputs,
    downloadAllUrl,
    completedCount,
    failedCount,
    totalBytes,
    totalSizeLabel,
    addFiles,
    removeFile,
    replaceFile,
    reset,
    cancel,
    process,
    fileDownloadUrl,
  } = useToolFlow()

  const fileInput = ref<HTMLInputElement | null>(null)
  const replaceInput = ref<HTMLInputElement | null>(null)
  const replaceIndex = ref<number | null>(null)
  const previewFile = ref<File | null>(null)
  const toolOptions = ref<Record<string, unknown>>({})
  /** Watermark: stamp image picked inside the options panel, uploaded with the job. */
  const stampFile = ref<File | null>(null)

  const auth = useAuthStore()
  const uploadSpec = computed(() => uploadSpecFor(props.tool, auth.userPlan))
  const optionsProblem = computed(() => toolOptions.value.__invalid as string | null)

  // ─── Redact: interactive area editor state ─────────────────────────────────
  const isRedact = computed(() => props.tool.slug === 'redact')
  /** Regions drawn per selected-file index (each file runs its own job). */
  const redactRegions = ref<Record<number, RedactionRegion[]>>({})
  /** Which file is open in the editor when several are selected. */
  const redactFileIndex = ref(0)

  const redactFile = computed<File | null>(
    () => files.value[redactFileIndex.value]?.raw ?? null,
  )

  function redactCount(index: number): number {
    return redactRegions.value[index]?.length ?? 0
  }

  /** Remove a file and keep the per-file region map aligned with indices. */
  function removeFileAt(index: number): void {
    removeFile(index)
    if (!isRedact.value) return
    const next: Record<number, RedactionRegion[]> = {}
    for (const [key, value] of Object.entries(redactRegions.value)) {
      const at = Number(key)
      if (at < index) next[at] = value
      else if (at > index) next[at - 1] = value
    }
    redactRegions.value = next
    redactFileIndex.value = Math.min(
      redactFileIndex.value,
      Math.max(0, files.value.length - 1),
    )
  }

  /** Full restart, also dropping any drawn redaction regions. */
  function startOver(): void {
    reset()
    redactRegions.value = {}
    redactFileIndex.value = 0
  }

  /** True when the selection already contains a JPG/PNG (usable as a stamp). */
  const hasImageInput = computed(() =>
    files.value.some((file) => /\.(png|jpe?g)$/i.test(file.name)),
  )

  const roundedProgress = computed(() => Math.round(progress.value))

  /** Converter tools share a uniform "Convert" action label; other tools keep their name. */
  const actionLabel = computed(() =>
    props.tool.category === 'Convert to PDF' || props.tool.category === 'Convert from PDF'
      ? 'Convert'
      : props.tool.name,
  )

  // ─── Conversion animation: source → destination formats ───────────────────
  const srcFormat = computed(() => sourceFormat(props.tool, files.value))
  const dstFormat = computed(() => targetFormat(props.tool))

  const failedFiles = computed(() => files.value.filter((file) => file.status === 'failed'))

  /** Download link for one file's finished result(s) — ZIP when several. */
  function fileResultUrl(file: ToolFile): string | null {
    if (!file.outputs?.length) return null
    return file.outputs.length === 1
      ? fileDownloadUrl(file.outputs[0])
      : pdfToolsService.archiveDownloadUrl(
          file.outputs.map((output) => output.id),
          props.tool.slug,
        )
  }

  function formatEta(seconds: number): string {
    if (seconds < 90) return `~${seconds}s left`
    const minutes = Math.floor(seconds / 60)
    return `~${minutes}m ${seconds % 60}s left`
  }

  /** Whole-run ETA: the slowest in-flight file's estimate. */
  const overallEta = computed<string | null>(() => {
    const pending = files.value
      .filter((file) => file.status === 'uploading' || file.status === 'converting')
      .map((file) => file.etaSeconds ?? 0)
    const worst = Math.max(0, ...pending)
    return worst > 0 ? formatEta(worst) : null
  })

  /** Live one-liner naming the dominant activity — announced politely. */
  const stageSubtitle = computed(() => {
    if (files.value.some((file) => file.status === 'uploading'))
      return 'Uploading your files securely…'
    if (files.value.length > 1)
      return `${completedCount.value} of ${files.value.length} files completed — finished files can be downloaded right away.`
    return 'Working on your file. This usually takes just a few seconds.'
  })

  // ─── Run duration + result statistics (display only) ──────────────────────
  let runStartedAt = 0
  const durationLabel = ref<string | null>(null)

  watch(stage, (next, previous) => {
    if (next === 'processing') {
      runStartedAt = globalThis.performance.now()
      durationLabel.value = null
    } else if (next === 'done' && previous === 'processing' && runStartedAt) {
      const seconds = Math.max(1, Math.round((globalThis.performance.now() - runStartedAt) / 1000))
      durationLabel.value =
        seconds < 90 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    }
  })

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const outputBytes = computed(() =>
    outputs.value.reduce((sum, file) => sum + (file.size_bytes ?? 0), 0),
  )

  /** Size reduction percentage when the result is smaller than the input. */
  const sizeSavings = computed<number | null>(() => {
    if (!outputs.value.length || !totalBytes.value || !outputBytes.value) return null
    const saved = 1 - outputBytes.value / totalBytes.value
    return saved >= 0.01 ? Math.round(saved * 100) : null
  })

  /** Success-screen summary facts; compression savings appear when real. */
  const summaryStats = computed(() => {
    const stats: { icon: string; label: string; value: string; tone?: 'success' }[] = [
      {
        icon: 'file-text',
        label: files.value.length === 1 ? 'File processed' : 'Files processed',
        value: `${completedCount.value} of ${files.value.length}`,
      },
    ]
    if (outputBytes.value)
      stats.push({ icon: 'download', label: 'Output size', value: formatBytes(outputBytes.value) })
    if (durationLabel.value)
      stats.push({ icon: 'clock', label: 'Time taken', value: durationLabel.value })
    if (sizeSavings.value)
      stats.push({
        icon: 'trending-up',
        label: 'Size reduced',
        value: `−${sizeSavings.value}%`,
        tone: 'success',
      })
    return stats
  })

  /** Fallback name shown for demo (unimplemented) tools. */
  const resultName = computed(
    () =>
      `${props.tool.name.replace(/ /g, '-').toLowerCase()}-result.${props.tool.output ? props.tool.output.toLowerCase() : 'pdf'}`,
  )

  // ─── File pickers & quick actions ──────────────────────────────────────────
  function openPicker() {
    fileInput.value?.click()
  }

  function onPicked(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files?.length) addFiles(props.tool, input.files)
    input.value = '' // allow re-selecting the same file
  }

  function openReplacePicker(index: number) {
    replaceIndex.value = index
    replaceInput.value?.click()
  }

  function onReplacePicked(event: Event) {
    const input = event.target as HTMLInputElement
    const picked = input.files?.[0]
    if (picked && replaceIndex.value !== null) {
      replaceFile(props.tool, replaceIndex.value, picked)
      if (validationError.value) showToast(validationError.value, 'error')
      else showToast(`Replaced with “${picked.name}”`)
    }
    replaceIndex.value = null
    input.value = ''
  }

  /** Save an untouched copy of the selected file back to disk. */
  function downloadOriginal(file: ToolFile) {
    if (!file.raw) return
    const url = URL.createObjectURL(file.raw)
    const anchor = globalThis.document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
    showToast('Original file download started')
  }

  function openPreview(file: ToolFile) {
    if (file.raw) previewFile.value = file.raw
  }

  function run() {
    if (optionsProblem.value) {
      showToast(optionsProblem.value, 'error')
      return
    }
    const { __invalid, ...options } = toolOptions.value

    if (isRedact.value) {
      // Every file needs something to remove: drawn areas or text terms.
      const texts = (options.texts as string[] | undefined) ?? []
      const uncovered = files.value.findIndex((_, index) => !redactCount(index))
      if (!texts.length && uncovered !== -1) {
        showToast(
          files.value.length > 1
            ? `Draw at least one area on “${files.value[uncovered].name}” or add text terms.`
            : 'Draw at least one redaction area on the preview, or enter text to remove.',
          'error',
        )
        return
      }
      void process(props.tool, options, [], (index) => ({
        areas: toBackendAreas(redactRegions.value[index] ?? []),
      }))
      return
    }
    // The watermark stamp image (picked in the options panel) uploads with
    // the job's files without appearing in the selection list.
    const extraFiles =
      props.tool.slug === 'watermark' && options.mode === 'image' && stampFile.value
        ? [stampFile.value]
        : []
    void process(props.tool, options, extraFiles)
  }

  function downloadAll() {
    if (downloadAllUrl.value) {
      globalThis.open(downloadAllUrl.value, '_blank')
    }
    showToast('Download started')
  }
</script>

<template>
  <!-- Hidden real file inputs driving every "select"/"replace" affordance -->
  <input
    ref="fileInput"
    type="file"
    class="pf-hidden-input"
    :accept="uploadSpec.accept"
    :multiple="uploadSpec.maxFiles > 1"
    @change="onPicked"
  />
  <input
    ref="replaceInput"
    type="file"
    class="pf-hidden-input"
    :accept="uploadSpec.accept"
    @change="onReplacePicked"
  />

  <Transition name="pf-stage" mode="out-in">
    <!-- Idle: upload -->
    <BaseCard v-if="stage === 'idle'" key="idle">
      <UploadDropzone
        :spec="uploadSpec"
        :error="validationError"
        @pick="openPicker"
        @files="addFiles(tool, $event)"
      />
    </BaseCard>

    <!-- Ready: files + options -->
    <div v-else-if="stage === 'ready'" key="ready" class="pf-ready">
      <!-- Redact: interactive area editor over a live PDF preview -->
      <BaseCard v-if="isRedact && redactFile" class="pf-ready__editor">
        <div class="pf-redact">
          <div v-if="files.length > 1" class="pf-redact__tabs" role="tablist">
            <button
              v-for="(file, i) in files"
              :key="`${i}-${file.name}`"
              type="button"
              role="tab"
              class="pf-redact__tab"
              :class="{ 'pf-redact__tab--active': i === redactFileIndex }"
              :aria-selected="i === redactFileIndex"
              @click="redactFileIndex = i"
            >
              <BaseIcon name="file-text" :size="14" />
              <span class="pf-redact__tab-name">{{ file.name }}</span>
              <span v-if="redactCount(i)" class="pf-redact__tab-count">{{ redactCount(i) }}</span>
            </button>
          </div>
          <RedactEditor
            :key="`${redactFileIndex}-${redactFile.name}`"
            :file="redactFile"
            :regions="redactRegions[redactFileIndex] ?? []"
            @update:regions="redactRegions[redactFileIndex] = $event"
          />
        </div>
      </BaseCard>

      <BaseCard>
        <div class="pf-ready__panel">
          <div class="pf-ready__head">
            <div>
              <div class="pf-ready__title">Selected files ({{ files.length }})</div>
              <div v-if="uploadSpec.maxFiles > 1" class="pf-ready__totals">
                {{ files.length }} of {{ uploadSpec.maxFiles }} files · {{ totalSizeLabel }} of
                {{ formatLimitMB(uploadSpec.maxTotalSizeMB) }} total
              </div>
            </div>
            <BaseButton
              v-if="files.length < uploadSpec.maxFiles"
              variant="ghost"
              size="sm"
              icon="plus"
              @click="openPicker"
            >
              Add more
            </BaseButton>
            <BaseBadge v-else tone="neutral">Limit reached</BaseBadge>
          </div>
          <div v-if="validationError" class="pf-error-note" role="alert">
            <BaseIcon name="alert-circle" :size="15" /> {{ validationError }}
          </div>
          <TransitionGroup name="pf-list" tag="div" class="pf-ready__files">
            <FileCard
              v-for="(file, i) in files"
              :key="`${file.name}-${file.size}-${i}`"
              :file="file"
              mode="ready"
              @preview="openPreview(file)"
              @replace="openReplacePicker(i)"
              @remove="removeFileAt(i)"
              @download-original="downloadOriginal(file)"
            />
          </TransitionGroup>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="pf-ready__panel">
          <div class="pf-ready__opts-head">
            <span :style="{ color: tool.color }"><BaseIcon name="settings" :size="19" /></span>
            <div class="pf-ready__title">Options</div>
          </div>
          <ToolOptions
            :tool="tool"
            :has-image-input="hasImageInput"
            :source-file="files[0]?.raw ?? null"
            :file-count="files.length"
            @update:options="toolOptions = $event"
            @update:stamp-file="stampFile = $event"
          />
          <div class="pf-ready__run">
            <BaseButton full size="lg" :icon="tool.icon" @click="run">{{ actionLabel }}</BaseButton>
          </div>
          <button type="button" class="pf-ready__restart" @click="startOver">
            <BaseIcon name="refresh" :size="14" /> Start over
          </button>
        </div>
      </BaseCard>
    </div>

    <!-- Processing -->
    <BaseCard v-else-if="stage === 'processing'" key="processing">
      <div class="pf-processing">
        <!-- Hero: animated source → destination conversion scene -->
        <ConversionAnimation
          class="pf-processing__scene"
          :tool="tool"
          :progress="progress"
          :source-ext="srcFormat"
          :target-ext="dstFormat"
        />

        <ProcessingStages :files="files" :progress="progress" />

        <div
          class="pf-processing__readout"
          role="progressbar"
          :aria-valuenow="roundedProgress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${tool.name} overall progress`"
        >
          <span class="pf-processing__pct">{{ roundedProgress }}%</span>
          <span v-if="files.length > 1" class="pf-processing__count">
            {{ completedCount }}/{{ files.length }} files
          </span>
        </div>
        <!-- Fixed-height slot so the ETA appearing never shifts the layout -->
        <div class="pf-processing__eta" aria-live="polite">
          <span v-if="overallEta">
            <BaseIcon name="clock" :size="13" /> {{ overallEta }}
          </span>
        </div>

        <div class="pf-processing__title">{{ tool.name }}…</div>
        <div class="pf-processing__sub" aria-live="polite">{{ stageSubtitle }}</div>

        <!-- Per-file pipeline: each file uploads/converts independently -->
        <div v-if="files.length" class="pf-processing__files">
          <FileCard
            v-for="(file, i) in files"
            :key="`${file.name}-${i}`"
            :file="file"
            mode="processing"
            :tool-color="tool.color"
            :result-url="fileResultUrl(file)"
          />
        </div>

        <button type="button" class="pf-processing__cancel" @click="cancel">Cancel</button>
      </div>
    </BaseCard>

    <!-- Error -->
    <BaseCard v-else-if="stage === 'error'" key="error">
      <div class="pf-done">
        <div class="pf-done__check pf-done__check--error animate-fade-up">
          <BaseIcon name="alert-circle" :size="40" />
        </div>
        <h2 class="pf-done__title">Something went wrong</h2>
        <p class="pf-done__sub">{{ errorMessage }}</p>
        <div class="pf-done__actions">
          <BaseButton size="lg" icon="refresh" @click="cancel">Try again</BaseButton>
          <BaseButton variant="secondary" size="lg" @click="startOver">Start over</BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Done -->
    <BaseCard v-else key="done">
      <div class="pf-done">
        <div class="pf-done__glow" aria-hidden="true"></div>
        <div class="pf-done__check animate-fade-up">
          <svg class="pf-done__checksvg" viewBox="0 0 52 52" aria-hidden="true">
            <circle class="pf-done__check-ring" cx="26" cy="26" r="23" />
            <path class="pf-done__check-path" d="M15 27 L23 35 L38 18" />
          </svg>
        </div>
        <h2 class="pf-done__title">All done!</h2>
        <p class="pf-done__sub">
          {{
            failedCount > 0
              ? `${completedCount} of ${files.length} files processed with ${tool.name} — ${failedCount} failed.`
              : files.length > 1
                ? `All ${files.length} files have been processed with ${tool.name}.`
                : `Your file has been processed with ${tool.name}.`
          }}
        </p>

        <!-- Processing summary -->
        <div class="pf-done__stats" aria-label="Processing summary">
          <div
            v-for="stat in summaryStats"
            :key="stat.label"
            class="pf-done__stat"
            :class="{ 'pf-done__stat--success': stat.tone === 'success' }"
          >
            <BaseIcon :name="stat.icon" :size="15" class="pf-done__stat-icon" />
            <span class="pf-done__stat-value">{{ stat.value }}</span>
            <span class="pf-done__stat-label">{{ stat.label }}</span>
          </div>
        </div>

        <!-- Files that failed keep their own error; the rest downloaded fine -->
        <div v-if="failedFiles.length" class="pf-done__failed">
          <div v-for="(file, i) in failedFiles" :key="i" class="pf-done__failed-row">
            <BaseIcon name="alert-circle" :size="16" />
            <span class="pf-done__failed-name">{{ file.name }}</span>
            <span class="pf-done__failed-msg">{{ file.error }}</span>
          </div>
        </div>

        <!-- Real results -->
        <div v-if="outputs.length" class="pf-done__list">
          <a
            v-for="file in outputs"
            :key="file.id"
            class="pf-done__result"
            :href="fileDownloadUrl(file)"
            target="_blank"
            rel="noopener"
          >
            <!-- Remote results fall back to the format icon + extension badge -->
            <FileThumb :file="null" :name="file.original_name" :size="46" />
            <div class="pf-done__file">
              <div class="pf-done__filename">{{ file.original_name }}</div>
              <div class="pf-done__filesub">{{ file.size_human }} · ready to download</div>
            </div>
            <BaseBadge tone="success">Ready</BaseBadge>
          </a>
        </div>

        <!-- Demo tools (no backend yet) -->
        <div v-else class="pf-done__result">
          <FileThumb :file="null" :name="resultName" :size="46" />
          <div class="pf-done__file">
            <div class="pf-done__filename">{{ resultName }}</div>
            <div class="pf-done__filesub">ready to download</div>
          </div>
          <BaseBadge tone="success">Ready</BaseBadge>
        </div>

        <div class="pf-done__actions">
          <BaseButton size="lg" icon="download" class="pf-done__download" @click="downloadAll">
            {{ outputs.length > 1 ? 'Download all (ZIP)' : 'Download' }}
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="lg"
            icon="folder"
            @click="showToast('Saved to My Files')"
          >
            Save to My Files
          </BaseButton>
        </div>
        <div class="pf-done__links">
          <button type="button" class="pf-done__link" @click="downloadAll">
            <BaseIcon name="download" :size="15" /> Download again
          </button>
          <button type="button" class="pf-done__link" @click="startOver">
            <BaseIcon name="refresh" :size="15" /> Process another file
          </button>
          <button
            type="button"
            class="pf-done__link"
            @click="router.push({ name: ROUTE_NAMES.TOOLS })"
          >
            <BaseIcon name="grid" :size="15" /> More tools
          </button>
        </div>
      </div>
    </BaseCard>
  </Transition>

  <!-- Quick-action: full file preview -->
  <FilePreviewModal
    v-if="previewFile"
    :file="previewFile"
    @close="previewFile = null"
  />
</template>

<style scoped>
  .pf-hidden-input {
    display: none;
  }

  /* Stage-to-stage crossfade — no layout jumps between phases */
  .pf-stage-enter-active {
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
  }
  .pf-stage-leave-active {
    transition: opacity 0.15s ease;
  }
  .pf-stage-enter-from {
    opacity: 0;
    transform: translateY(8px);
  }
  .pf-stage-leave-to {
    opacity: 0;
  }

  /* File-list add/remove micro-interactions */
  .pf-list-enter-active,
  .pf-list-leave-active,
  .pf-list-move {
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
  }
  .pf-list-enter-from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  .pf-list-leave-to {
    opacity: 0;
    transform: scale(0.96);
  }
  .pf-list-leave-active {
    position: absolute;
    width: 100%;
  }

  /* Validation error note */
  .pf-error-note {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    margin: 14px 0;
    padding: 10px 16px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.1);
    color: hsl(var(--color-danger));
    font-weight: 600;
    font-size: 13.5px;
  }

  /* Ready */
  .pf-ready {
    display: grid;
    /* minmax(0, …) lets each card shrink below its content width, so long
       file names ellipsize instead of forcing horizontal scroll. */
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  .pf-ready > * {
    min-width: 0;
  }
  /* Redact editor spans the full row above the files/options cards. */
  .pf-ready__editor {
    grid-column: 1 / -1;
  }
  .pf-redact {
    padding: clamp(10px, 1.6vw, 14px);
  }
  .pf-redact__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }
  .pf-redact__tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: 260px;
    padding: 7px 12px;
    border-radius: var(--radius-full);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 0;
  }
  .pf-redact__tab:hover {
    border-color: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
  }
  .pf-redact__tab--active {
    border-color: hsl(var(--color-primary) / 0.5);
    background: hsl(var(--color-primary) / 0.1);
    color: hsl(var(--color-primary));
  }
  .pf-redact__tab-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .pf-redact__tab-count {
    flex: none;
    min-width: 20px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-primary));
    color: white;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
  }
  .pf-ready__panel {
    padding: clamp(16px, 2.5vw, 22px);
  }
  .pf-ready__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;
    margin-bottom: 16px;
  }
  .pf-ready__title {
    font-weight: 700;
    font-size: 16px;
    color: hsl(var(--color-text));
  }
  .pf-ready__totals {
    margin-top: 3px;
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    font-variant-numeric: tabular-nums;
  }
  .pf-ready__opts-head {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
  }
  .pf-ready__files {
    position: relative;
    display: grid;
    gap: 10px;
  }
  .pf-ready__run {
    margin-top: 22px;
  }
  .pf-ready__restart {
    width: 100%;
    margin-top: 10px;
    background: none;
    border: none;
    color: hsl(var(--color-text-faint));
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    padding: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: var(--radius-md);
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }
  .pf-ready__restart:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }

  /* Processing */
  .pf-processing {
    padding: clamp(28px, 6vw, 44px) clamp(16px, 4vw, 32px);
    text-align: center;
  }
  .pf-processing__scene {
    margin-bottom: 10px;
  }
  .pf-processing__readout {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 10px;
    margin: 10px 0 0;
  }
  .pf-processing__pct {
    font-weight: 800;
    font-size: clamp(24px, 6vw, 34px);
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
    font-variant-numeric: tabular-nums;
  }
  .pf-processing__count {
    font-weight: 700;
    font-size: clamp(11px, 2.6vw, 13px);
    color: hsl(var(--color-text-muted));
    font-variant-numeric: tabular-nums;
  }
  .pf-processing__eta {
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    font-variant-numeric: tabular-nums;
  }
  .pf-processing__eta > span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    animation: fadeIn 0.3s ease;
  }
  .pf-processing__title {
    font-weight: 700;
    font-size: 19px;
    color: hsl(var(--color-text));
    margin-bottom: 8px;
  }
  .pf-processing__sub {
    font-size: 14.5px;
    color: hsl(var(--color-text-muted));
    margin-bottom: 22px;
    min-height: 22px;
  }
  .pf-processing__files {
    display: grid;
    gap: 10px;
    max-width: 640px;
    margin: 0 auto;
    text-align: left;
  }
  .pf-processing__cancel {
    margin-top: 24px;
    background: none;
    border: 1px solid hsl(var(--color-border));
    color: hsl(var(--color-text-muted));
    padding: 9px 18px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease,
      background 0.15s ease;
  }
  .pf-processing__cancel:hover {
    border-color: hsl(var(--color-danger) / 0.4);
    color: hsl(var(--color-danger));
    background: hsl(var(--color-danger) / 0.05);
  }

  /* Done */
  .pf-done {
    position: relative;
    padding: clamp(28px, 6vw, 40px) clamp(16px, 4vw, 32px);
    text-align: center;
    overflow: hidden;
  }
  .pf-done__glow {
    position: absolute;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    width: 420px;
    height: 220px;
    background: radial-gradient(closest-side, hsl(var(--color-success) / 0.14), transparent);
    pointer-events: none;
  }
  .pf-done__check {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: var(--radius-2xl);
    background: hsl(var(--color-success) / 0.14);
    color: hsl(var(--color-success));
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  .pf-done__check--error {
    background: hsl(var(--color-danger) / 0.14);
    color: hsl(var(--color-danger));
  }
  .pf-done__checksvg {
    width: 52px;
    height: 52px;
  }
  .pf-done__check-ring {
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 145;
    stroke-dashoffset: 145;
    transform: rotate(-90deg);
    transform-origin: center;
    animation: pf-draw 0.55s ease-out forwards;
  }
  .pf-done__check-path {
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 34;
    stroke-dashoffset: 34;
    animation: pf-draw 0.4s ease 0.45s forwards;
  }
  .pf-done__title {
    font-size: 24px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 8px;
    letter-spacing: -0.01em;
  }
  .pf-done__sub {
    font-size: 15.5px;
    color: hsl(var(--color-text-muted));
    margin: 0 0 22px;
  }

  /* Summary stat chips */
  .pf-done__stats {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 auto 24px;
    max-width: 560px;
  }
  .pf-done__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 108px;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    animation: fadeUp 0.35s ease backwards;
  }
  .pf-done__stat:nth-child(2) {
    animation-delay: 0.06s;
  }
  .pf-done__stat:nth-child(3) {
    animation-delay: 0.12s;
  }
  .pf-done__stat:nth-child(4) {
    animation-delay: 0.18s;
  }
  .pf-done__stat--success {
    border-color: hsl(var(--color-success) / 0.35);
    background: hsl(var(--color-success) / 0.07);
  }
  .pf-done__stat-icon {
    color: hsl(var(--color-text-faint));
  }
  .pf-done__stat--success .pf-done__stat-icon {
    color: hsl(var(--color-success));
  }
  .pf-done__stat-value {
    font-size: 15.5px;
    font-weight: 800;
    color: hsl(var(--color-text));
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
  .pf-done__stat--success .pf-done__stat-value {
    color: hsl(var(--color-success));
  }
  .pf-done__stat-label {
    font-size: 11.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
  }

  .pf-done__failed {
    display: grid;
    gap: 8px;
    max-width: 560px;
    margin: 0 auto 18px;
    text-align: left;
  }
  .pf-done__failed-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.08);
    color: hsl(var(--color-danger));
    font-size: 13px;
    flex-wrap: wrap;
  }
  .pf-done__failed-row > svg {
    align-self: center;
    flex: none;
  }
  .pf-done__failed-name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .pf-done__failed-msg {
    color: hsl(var(--color-danger) / 0.85);
    overflow-wrap: anywhere;
  }

  .pf-done__list {
    display: grid;
    gap: 10px;
    width: 100%;
    max-width: 460px;
    margin: 0 auto;
  }
  .pf-done__result {
    max-width: 460px;
    margin: 0 auto;
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: clamp(10px, 2.5vw, 14px);
    padding: clamp(12px, 3vw, 16px) clamp(12px, 3vw, 18px);
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
    text-align: left;
    text-decoration: none;
    color: inherit;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }
  a.pf-done__result:hover {
    border-color: hsl(var(--color-success) / 0.45);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .pf-done__file {
    flex: 1;
    min-width: 0;
  }
  .pf-done__filename {
    font-weight: 700;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-done__filesub {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
  }
  .pf-done__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 26px;
    flex-wrap: wrap;
  }
  .pf-done__download {
    min-width: 220px;
  }
  .pf-done__links {
    display: flex;
    gap: 12px 20px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 22px;
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
  }
  .pf-done__link {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    color: inherit;
    padding: 6px 10px;
    border-radius: var(--radius-md);
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }
  .pf-done__link:hover {
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.06);
  }

  @media (max-width: 899px) {
    .pf-ready {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 520px) {
    /* Full-width, stacked actions: comfortable touch targets on phones. */
    .pf-done__actions {
      flex-direction: column;
      align-items: stretch;
    }
    .pf-done__actions > * {
      width: 100%;
    }
    .pf-done__stat {
      flex: 1;
      min-width: 96px;
      padding: 10px 10px;
    }
  }

  @keyframes pf-draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-stage-enter-active,
    .pf-stage-leave-active,
    .pf-list-enter-active,
    .pf-list-leave-active,
    .pf-list-move {
      transition: none;
    }
    .pf-done__stat,
    .pf-processing__eta > span {
      animation: none;
    }
    .pf-done__check-ring,
    .pf-done__check-path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
