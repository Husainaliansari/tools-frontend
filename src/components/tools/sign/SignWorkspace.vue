<script setup lang="ts">
  /**
   * SignWorkspace — the premium Sign PDF flow: Upload → Sign → Review →
   * Download. Replaces the generic tool workspace for the sign tool only;
   * processing still runs through the existing backend sign endpoint.
   */
  import { computed, reactive, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import UploadDropzone from '@components/tools/workflow/UploadDropzone.vue'
  import FileThumb from '@components/tools/workflow/FileThumb.vue'
  import { formatLimitMB } from '@constants/planLimits'
  import { useFeedback } from '@composables'
  import { uploadSpecFor } from '@services/pdfTools.service'
  import { useAuthStore } from '@stores/auth.store'
  import type { PdfTool } from '@types'
  import { composeOverlays } from './sign-compose'
  import type { SignElement } from './sign-types'
  import SignEditor from './SignEditor.vue'
  import SignReviewModal, { type ReviewItem } from './SignReviewModal.vue'
  import { useSignFlow } from './useSignFlow'

  const props = defineProps<{ tool: PdfTool }>()
  const emit = defineEmits<{ active: [boolean] }>()

  const { showToast } = useFeedback()
  const auth = useAuthStore()
  const flow = useSignFlow()

  type Stage = 'upload' | 'edit' | 'processing' | 'done' | 'error'
  const stage = ref<Stage>('upload')

  watch(stage, (newVal) => {
    emit('active', newVal !== 'upload')
  }, { immediate: true })

  // ─── Upload rules: PDFs only (the signature artwork is made in the editor) ──
  const spec = computed(() => {
    const base = uploadSpecFor(props.tool, auth.userPlan)
    return {
      ...base,
      extensions: ['.pdf'],
      accept: '.pdf',
      maxFiles: Math.min(base.maxFiles, 10),
    }
  })

  // ─── Selection & per-document editor state ──────────────────────────────────
  const files = ref<File[]>([])
  const activeIndex = ref(0)
  /** Placed elements / discovered page sizes, keyed by file index. */
  const elementsByFile = reactive<Record<number, SignElement[]>>({})
  const pageSizesByFile = reactive<Record<number, Record<number, { width: number; height: number }>>>({})
  const validationError = ref<string | null>(null)

  const fileInput = ref<HTMLInputElement | null>(null)

  function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function addFiles(selected: File[] | FileList): void {
    validationError.value = null
    let totalBytes = files.value.reduce((sum, file) => sum + file.size, 0)
    for (const file of Array.from(selected)) {
      if (!/\.pdf$/i.test(file.name)) {
        validationError.value = `Only PDF files can be signed — “${file.name}” was not added.`
        break
      }
      if (file.size > spec.value.maxSizeMB * 1024 * 1024) {
        validationError.value = `“${file.name}” is ${formatBytes(file.size)} — over the ${formatLimitMB(spec.value.maxSizeMB)} per-file limit of your ${spec.value.plan.label} plan.`
        break
      }
      if (files.value.length >= spec.value.maxFiles) {
        validationError.value = `You can sign up to ${spec.value.maxFiles} documents at once.`
        break
      }
      if (totalBytes + file.size > spec.value.maxTotalSizeMB * 1024 * 1024) {
        validationError.value = `“${file.name}” would exceed the ${formatLimitMB(spec.value.maxTotalSizeMB)} total limit of your ${spec.value.plan.label} plan.`
        break
      }
      totalBytes += file.size
      const index = files.value.length
      files.value.push(file)
      elementsByFile[index] = elementsByFile[index] ?? []
      pageSizesByFile[index] = pageSizesByFile[index] ?? {}
    }
    if (files.value.length) stage.value = 'edit'
  }

  function onPicked(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files?.length) addFiles(input.files)
    input.value = ''
  }

  function removeFile(index: number): void {
    files.value.splice(index, 1)
    // Keep the keyed maps aligned with the shifted indices.
    for (let at = index; at <= files.value.length; at += 1) {
      elementsByFile[at] = elementsByFile[at + 1] ?? []
      pageSizesByFile[at] = pageSizesByFile[at + 1] ?? {}
    }
    delete elementsByFile[files.value.length + 1]
    delete pageSizesByFile[files.value.length + 1]
    activeIndex.value = Math.min(activeIndex.value, Math.max(0, files.value.length - 1))
    if (!files.value.length) startOver()
  }

  function startOver(): void {
    flow.reset()
    files.value = []
    activeIndex.value = 0
    for (const key of Object.keys(elementsByFile)) delete elementsByFile[Number(key)]
    for (const key of Object.keys(pageSizesByFile)) delete pageSizesByFile[Number(key)]
    validationError.value = null
    reviewItems.value = []
    stage.value = 'upload'
  }

  const activeFile = computed<File | null>(() => files.value[activeIndex.value] ?? null)

  function elementCount(index: number): number {
    return elementsByFile[index]?.length ?? 0
  }
  const totalElements = computed(() =>
    files.value.reduce((sum, _, index) => sum + elementCount(index), 0),
  )
  const totalSignedPages = computed(() => {
    let pages = 0
    for (let index = 0; index < files.value.length; index += 1) {
      pages += new Set((elementsByFile[index] ?? []).map((element) => element.page)).size
    }
    return pages
  })

  // ─── Review & apply ──────────────────────────────────────────────────────────
  const reviewItems = ref<ReviewItem[]>([])
  const reviewOpen = ref(false)
  const composing = ref(false)

  async function openReview(): Promise<void> {
    if (!totalElements.value) {
      showToast('Place at least one signature or field on a page first.', 'error')
      return
    }
    composing.value = true
    try {
      const items: ReviewItem[] = []
      for (const [index, file] of files.value.entries()) {
        const elements = elementsByFile[index] ?? []
        const overlays = elements.length
          ? await composeOverlays(elements, pageSizesByFile[index] ?? {})
          : []
        items.push({
          name: file.name,
          file,
          overlays,
          pageSizes: pageSizesByFile[index] ?? {},
          skipped: !overlays.length,
        })
      }
      reviewItems.value = items
      reviewOpen.value = true
    } catch {
      showToast('Could not prepare the signature preview. Please try again.', 'error')
    } finally {
      composing.value = false
    }
  }

  async function apply(): Promise<void> {
    reviewOpen.value = false
    const items = reviewItems.value
      .filter((item) => !item.skipped)
      .map((item) => ({ name: item.name, file: item.file, overlays: item.overlays }))
    if (!items.length) return
    stage.value = 'processing'
    const ok = await flow.process(items)
    if (stage.value !== 'processing') return // cancelled back to editing
    stage.value = ok ? 'done' : 'error'
  }

  function cancelProcessing(): void {
    flow.cancel()
    stage.value = 'edit'
  }

  function retry(): void {
    stage.value = 'edit'
  }

  function downloadAll(): void {
    if (flow.downloadAllUrl.value) globalThis.open(flow.downloadAllUrl.value, '_blank')
    showToast('Download started')
  }

  // ─── Stepper ─────────────────────────────────────────────────────────────────
  const STEPS = [
    { key: 'upload', label: 'Upload', icon: 'upload' },
    { key: 'sign', label: 'Sign', icon: 'file-signature' },
    { key: 'review', label: 'Review', icon: 'eye' },
    { key: 'download', label: 'Download', icon: 'download' },
  ]
  const stepIndex = computed(() => {
    if (stage.value === 'upload') return 0
    if (stage.value === 'edit') return reviewOpen.value ? 2 : 1
    if (stage.value === 'processing' || stage.value === 'error') return 2
    return 3
  })

  const roundedProgress = computed(() => Math.round(flow.progress.value))
</script>

<template>
  <input
    ref="fileInput"
    type="file"
    accept=".pdf"
    multiple
    class="sw__hidden"
    @change="onPicked"
  />

  <!-- ══ Workflow stepper ══ -->
  <nav class="sw__steps" aria-label="Signing progress">
    <template v-for="(step, index) in STEPS" :key="step.key">
      <div
        class="sw__step"
        :class="{
          'sw__step--active': index === stepIndex,
          'sw__step--done': index < stepIndex,
        }"
        :aria-current="index === stepIndex ? 'step' : undefined"
      >
        <span class="sw__step-dot">
          <BaseIcon v-if="index < stepIndex" name="check" :size="13" />
          <BaseIcon v-else :name="step.icon" :size="13" />
        </span>
        <span class="sw__step-label">{{ step.label }}</span>
      </div>
      <span v-if="index < STEPS.length - 1" class="sw__step-line" aria-hidden="true" />
    </template>
  </nav>

  <Transition name="sw-stage" mode="out-in">
    <!-- ══ 1 · Upload ══ -->
    <BaseCard v-if="stage === 'upload'" key="upload">
      <UploadDropzone
        :spec="spec"
        :error="validationError"
        @pick="fileInput?.click()"
        @files="addFiles($event)"
      />
    </BaseCard>

    <!-- ══ 2 · Sign (editor) ══ -->
    <div v-else-if="stage === 'edit'" key="edit" class="sw__edit">
      <div v-if="files.length > 1" class="sw__tabs" role="tablist" aria-label="Documents">
        <button
          v-for="(file, index) in files"
          :key="`${index}-${file.name}`"
          type="button"
          role="tab"
          class="sw__tab"
          :class="{ 'sw__tab--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @click="activeIndex = index"
        >
          <BaseIcon name="file-text" :size="14" />
          <span class="sw__tab-name">{{ file.name }}</span>
          <span v-if="elementCount(index)" class="sw__tab-count">{{ elementCount(index) }}</span>
          <span
            class="sw__tab-remove"
            role="button"
            tabindex="0"
            :aria-label="`Remove ${file.name}`"
            @click.stop="removeFile(index)"
            @keydown.enter.stop="removeFile(index)"
          >
            <BaseIcon name="x" :size="12" />
          </span>
        </button>
        <button
          v-if="files.length < spec.maxFiles"
          type="button"
          class="sw__tab sw__tab--add"
          title="Add another PDF"
          @click="fileInput?.click()"
        >
          <BaseIcon name="plus" :size="14" /> Add PDF
        </button>
      </div>

      <div v-if="validationError" class="sw__error-note" role="alert">
        <BaseIcon name="alert-circle" :size="15" /> {{ validationError }}
      </div>

      <SignEditor
        v-if="activeFile"
        :key="`${activeIndex}-${activeFile.name}`"
        v-model:elements="elementsByFile[activeIndex]"
        v-model:page-sizes="pageSizesByFile[activeIndex]"
        :file="activeFile"
      />

      <!-- Action bar -->
      <div class="sw__actionbar">
        <div class="sw__action-info">
          <template v-if="totalElements">
            <BaseBadge tone="purple">
              {{ totalElements }} element{{ totalElements === 1 ? '' : 's' }}
            </BaseBadge>
            <span class="sw__action-sub">
              across {{ totalSignedPages }} page{{ totalSignedPages === 1 ? '' : 's' }}
              <template v-if="files.length > 1"> · {{ files.length }} documents</template>
            </span>
          </template>
          <span v-else class="sw__action-sub">
            Drag a signature, text or stamp onto the page to get started.
          </span>
        </div>
        <div class="sw__action-buttons">
          <button type="button" class="sw__restart" @click="startOver">
            <BaseIcon name="refresh" :size="14" /> Start over
          </button>
          <BaseButton
            v-if="files.length === 1 && files.length < spec.maxFiles"
            variant="secondary"
            icon="plus"
            @click="fileInput?.click()"
          >
            Add PDF
          </BaseButton>
          <BaseButton
            size="lg"
            icon="eye"
            :loading="composing"
            :disabled="!totalElements"
            @click="openReview"
          >
            Review &amp; apply
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- ══ 3 · Processing ══ -->
    <BaseCard v-else-if="stage === 'processing'" key="processing">
      <div class="sw__processing">
        <div class="sw__ring" role="progressbar" :aria-valuenow="roundedProgress" aria-valuemin="0" aria-valuemax="100" aria-label="Signing progress">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle class="sw__ring-track" cx="50" cy="50" r="42" />
            <circle
              class="sw__ring-bar"
              cx="50"
              cy="50"
              r="42"
              :style="{ strokeDashoffset: 264 - (264 * flow.progress.value) / 100 }"
            />
          </svg>
          <span class="sw__ring-pct">{{ roundedProgress }}%</span>
        </div>
        <div class="sw__processing-title">Applying your signature…</div>
        <div class="sw__processing-sub" aria-live="polite">
          Your elements are being flattened into the document — this keeps the original quality.
        </div>

        <div class="sw__tasks">
          <div v-for="task in flow.tasks.value" :key="task.name" class="sw__task">
            <BaseIcon
              :name="task.status === 'completed' ? 'check-circle' : task.status === 'failed' ? 'alert-circle' : 'file-text'"
              :size="16"
              class="sw__task-icon"
              :class="{
                'sw__task-icon--ok': task.status === 'completed',
                'sw__task-icon--bad': task.status === 'failed',
              }"
            />
            <div class="sw__task-body">
              <div class="sw__task-row">
                <span class="sw__task-name">{{ task.name }}</span>
                <span class="sw__task-state">
                  {{
                    task.status === 'completed'
                      ? 'Done'
                      : task.status === 'failed'
                        ? 'Failed'
                        : task.currentPage
                          ? `Signing page ${task.currentPage}…`
                          : 'Waiting…'
                  }}
                </span>
              </div>
              <div class="sw__task-bar">
                <div
                  class="sw__task-fill"
                  :class="{ 'sw__task-fill--bad': task.status === 'failed' }"
                  :style="{ width: `${task.progress}%` }"
                />
              </div>
              <div v-if="task.error" class="sw__task-error">{{ task.error }}</div>
            </div>
          </div>
        </div>

        <button type="button" class="sw__cancel" @click="cancelProcessing">Cancel</button>
      </div>
    </BaseCard>

    <!-- ══ Error ══ -->
    <BaseCard v-else-if="stage === 'error'" key="error">
      <div class="sw__done">
        <div class="sw__done-mark sw__done-mark--error animate-fade-up">
          <BaseIcon name="alert-circle" :size="38" />
        </div>
        <h2 class="sw__done-title">Something went wrong</h2>
        <p class="sw__done-sub">{{ flow.errorMessage.value }}</p>
        <div class="sw__done-actions">
          <BaseButton size="lg" icon="refresh" @click="retry">Back to editing</BaseButton>
          <BaseButton variant="secondary" size="lg" @click="startOver">Start over</BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- ══ 4 · Done ══ -->
    <BaseCard v-else key="done">
      <div class="sw__done">
        <div class="sw__done-glow" aria-hidden="true"></div>
        <div class="sw__done-mark animate-fade-up">
          <svg class="sw__done-check" viewBox="0 0 52 52" aria-hidden="true">
            <circle class="sw__done-check-ring" cx="26" cy="26" r="23" />
            <path class="sw__done-check-path" d="M15 27 L23 35 L38 18" />
          </svg>
        </div>
        <h2 class="sw__done-title">Signed and sealed!</h2>
        <p class="sw__done-sub">
          {{
            flow.failedCount.value > 0
              ? `${flow.completedCount.value} of ${flow.tasks.value.length} documents signed — ${flow.failedCount.value} failed.`
              : flow.tasks.value.length > 1
                ? `All ${flow.tasks.value.length} documents have been signed.`
                : 'Your document has been signed.'
          }}
        </p>

        <div v-if="flow.tasks.value.some((task) => task.status === 'failed')" class="sw__failed">
          <div
            v-for="task in flow.tasks.value.filter((candidate) => candidate.status === 'failed')"
            :key="task.name"
            class="sw__failed-row"
          >
            <BaseIcon name="alert-circle" :size="15" />
            <span class="sw__failed-name">{{ task.name }}</span>
            <span class="sw__failed-msg">{{ task.error }}</span>
          </div>
        </div>

        <div class="sw__results">
          <a
            v-for="file in flow.outputs.value"
            :key="file.id"
            class="sw__result"
            :href="flow.fileDownloadUrl(file)"
            target="_blank"
            rel="noopener"
          >
            <FileThumb :file="null" :name="file.original_name" :size="44" />
            <div class="sw__result-body">
              <div class="sw__result-name">{{ file.original_name }}</div>
              <div class="sw__result-sub">{{ file.size_human }} · ready to download</div>
            </div>
            <BaseBadge tone="success">Signed</BaseBadge>
          </a>
        </div>

        <div class="sw__done-actions">
          <BaseButton size="lg" icon="download" @click="downloadAll">
            {{ flow.outputs.value.length > 1 ? 'Download all (ZIP)' : 'Download' }}
          </BaseButton>
          <BaseButton variant="secondary" size="lg" icon="refresh" @click="startOver">
            Sign another document
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </Transition>

  <SignReviewModal
    v-if="reviewOpen"
    :items="reviewItems"
    @close="reviewOpen = false"
    @apply="apply"
  />
</template>

<style scoped>
  .sw__hidden {
    display: none;
  }

  /* ── Stepper ── */
  .sw__steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .sw__step {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    color: hsl(var(--color-text-faint));
    font-size: 12.5px;
    font-weight: 700;
    transition: all 0.25s ease;
  }
  .sw__step-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-faint));
    transition: all 0.25s ease;
  }
  .sw__step--active {
    border-color: hsl(var(--color-primary) / 0.5);
    color: hsl(var(--color-primary));
    box-shadow: 0 0 0 3px hsl(var(--color-primary) / 0.1);
  }
  .sw__step--active .sw__step-dot {
    background: hsl(var(--color-primary));
    color: white;
  }
  .sw__step--done {
    color: hsl(var(--color-success));
    border-color: hsl(var(--color-success) / 0.35);
  }
  .sw__step--done .sw__step-dot {
    background: hsl(var(--color-success) / 0.15);
    color: hsl(var(--color-success));
  }
  .sw__step-line {
    width: 26px;
    height: 1.5px;
    background: hsl(var(--color-border-strong));
    flex: none;
  }

  /* ── Stage transition ── */
  .sw-stage-enter-active {
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
  }
  .sw-stage-leave-active {
    transition: opacity 0.15s ease;
  }
  .sw-stage-enter-from {
    opacity: 0;
    transform: translateY(8px);
  }
  .sw-stage-leave-to {
    opacity: 0;
  }

  /* ── Edit stage ── */
  .sw__edit {
    display: grid;
    gap: 14px;
  }
  .sw__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sw__tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: 280px;
    padding: 7px 12px;
    border-radius: var(--radius-full);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 0;
  }
  .sw__tab:hover {
    border-color: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
  }
  .sw__tab--active {
    border-color: hsl(var(--color-primary) / 0.5);
    background: hsl(var(--color-primary) / 0.1);
    color: hsl(var(--color-primary));
  }
  .sw__tab--add {
    border-style: dashed;
  }
  .sw__tab-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .sw__tab-count {
    flex: none;
    min-width: 20px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-purple));
    color: white;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
  }
  .sw__tab-remove {
    display: flex;
    padding: 2px;
    border-radius: 50%;
    color: hsl(var(--color-text-faint));
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sw__tab-remove:hover {
    background: hsl(var(--color-danger) / 0.12);
    color: hsl(var(--color-danger));
  }

  .sw__error-note {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.1);
    color: hsl(var(--color-danger));
    font-weight: 600;
    font-size: 13.5px;
  }

  /* ── Action bar ── */
  .sw__actionbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 16px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    box-shadow: var(--shadow-sm);
    position: sticky;
    bottom: 12px;
    z-index: 20;
  }
  .sw__action-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .sw__action-sub {
    font-size: 13px;
    color: hsl(var(--color-text-muted));
    font-weight: 600;
  }
  .sw__action-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .sw__restart {
    background: none;
    border: none;
    color: hsl(var(--color-text-faint));
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 8px 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: var(--radius-md);
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }
  .sw__restart:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }

  /* ── Processing ── */
  .sw__processing {
    padding: clamp(28px, 6vw, 44px) clamp(16px, 4vw, 32px);
    text-align: center;
  }
  .sw__ring {
    position: relative;
    width: 108px;
    height: 108px;
    margin: 0 auto 16px;
  }
  .sw__ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .sw__ring-track {
    fill: none;
    stroke: hsl(var(--color-chip));
    stroke-width: 8;
  }
  .sw__ring-bar {
    fill: none;
    stroke: hsl(var(--color-primary));
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 264;
    transition: stroke-dashoffset 0.35s ease;
  }
  .sw__ring-pct {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
    font-weight: 800;
    color: hsl(var(--color-text));
    font-variant-numeric: tabular-nums;
  }
  .sw__processing-title {
    font-weight: 700;
    font-size: 19px;
    color: hsl(var(--color-text));
    margin-bottom: 8px;
  }
  .sw__processing-sub {
    font-size: 14px;
    color: hsl(var(--color-text-muted));
    margin-bottom: 22px;
  }
  .sw__tasks {
    display: grid;
    gap: 10px;
    max-width: 560px;
    margin: 0 auto;
    text-align: left;
  }
  .sw__task {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }
  .sw__task-icon {
    color: hsl(var(--color-text-faint));
    margin-top: 2px;
    flex: none;
  }
  .sw__task-icon--ok {
    color: hsl(var(--color-success));
  }
  .sw__task-icon--bad {
    color: hsl(var(--color-danger));
  }
  .sw__task-body {
    flex: 1;
    min-width: 0;
  }
  .sw__task-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .sw__task-name {
    font-size: 13px;
    font-weight: 700;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sw__task-state {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .sw__task-bar {
    height: 5px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
    overflow: hidden;
  }
  .sw__task-fill {
    height: 100%;
    border-radius: inherit;
    background: hsl(var(--color-primary));
    transition: width 0.3s ease;
  }
  .sw__task-fill--bad {
    background: hsl(var(--color-danger));
  }
  .sw__task-error {
    margin-top: 6px;
    font-size: 12px;
    color: hsl(var(--color-danger));
  }
  .sw__cancel {
    margin-top: 24px;
    background: none;
    border: 1px solid hsl(var(--color-border));
    color: hsl(var(--color-text-muted));
    padding: 9px 18px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sw__cancel:hover {
    border-color: hsl(var(--color-danger) / 0.4);
    color: hsl(var(--color-danger));
    background: hsl(var(--color-danger) / 0.05);
  }

  /* ── Done / error ── */
  .sw__done {
    position: relative;
    padding: clamp(28px, 6vw, 40px) clamp(16px, 4vw, 32px);
    text-align: center;
    overflow: hidden;
  }
  .sw__done-glow {
    position: absolute;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    width: 420px;
    height: 220px;
    background: radial-gradient(closest-side, hsl(var(--color-success) / 0.14), transparent);
    pointer-events: none;
  }
  .sw__done-mark {
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
  .sw__done-mark--error {
    background: hsl(var(--color-danger) / 0.14);
    color: hsl(var(--color-danger));
  }
  .sw__done-check {
    width: 52px;
    height: 52px;
  }
  .sw__done-check-ring {
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 145;
    stroke-dashoffset: 145;
    transform: rotate(-90deg);
    transform-origin: center;
    animation: sw-draw 0.55s ease-out forwards;
  }
  .sw__done-check-path {
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 34;
    stroke-dashoffset: 34;
    animation: sw-draw 0.4s ease 0.45s forwards;
  }
  .sw__done-title {
    font-size: 24px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 8px;
    letter-spacing: -0.01em;
  }
  .sw__done-sub {
    font-size: 15.5px;
    color: hsl(var(--color-text-muted));
    margin: 0 0 22px;
  }
  .sw__failed {
    display: grid;
    gap: 8px;
    max-width: 560px;
    margin: 0 auto 18px;
    text-align: left;
  }
  .sw__failed-row {
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
  .sw__failed-row > svg {
    align-self: center;
    flex: none;
  }
  .sw__failed-name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .sw__failed-msg {
    color: hsl(var(--color-danger) / 0.85);
    overflow-wrap: anywhere;
  }
  .sw__results {
    display: grid;
    gap: 10px;
    width: 100%;
    max-width: 460px;
    margin: 0 auto;
  }
  .sw__result {
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
    min-width: 0;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }
  .sw__result:hover {
    border-color: hsl(var(--color-success) / 0.45);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .sw__result-body {
    flex: 1;
    min-width: 0;
  }
  .sw__result-name {
    font-weight: 700;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sw__result-sub {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
  }
  .sw__done-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 26px;
    flex-wrap: wrap;
  }

  @keyframes sw-draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (max-width: 520px) {
    .sw__done-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .sw__done-actions > * {
      width: 100%;
    }
    .sw__step-label {
      display: none;
    }
    .sw__step {
      padding: 6px 8px;
    }
    .sw__step-line {
      width: 14px;
    }
    .sw__actionbar {
      position: static;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sw-stage-enter-active,
    .sw-stage-leave-active {
      transition: none;
    }
    .sw__done-check-ring,
    .sw__done-check-path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
