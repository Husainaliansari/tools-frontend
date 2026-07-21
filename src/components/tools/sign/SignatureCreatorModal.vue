<script setup lang="ts">
  /**
   * SignatureCreatorModal — create a signature or initials by drawing,
   * typing (handwriting fonts), or uploading an image. Optionally saves the
   * result to the reusable signature library.
   */
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { INK_COLORS, SIGNATURE_FONTS } from './sign-types'
  import SignaturePad from './SignaturePad.vue'

  const props = withDefaults(
    defineProps<{
      kind?: 'signature' | 'initials'
    }>(),
    { kind: 'signature' },
  )

  const emit = defineEmits<{
    close: []
    created: [payload: { dataUrl: string; save: boolean }]
  }>()

  type Tab = 'draw' | 'type' | 'upload'
  const tab = ref<Tab>('draw')
  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'draw', label: 'Draw', icon: 'edit' },
    { key: 'type', label: 'Type', icon: 'type' },
    { key: 'upload', label: 'Upload', icon: 'upload' },
  ]

  const saveToLibrary = ref(true)
  const inkColor = ref<string>(INK_COLORS[0].value)
  const strokeWidth = ref(2.5)

  // ─── Draw ────────────────────────────────────────────────────────────────────
  const pad = ref<InstanceType<typeof SignaturePad> | null>(null)
  const padEmpty = ref(true)

  // ─── Type ────────────────────────────────────────────────────────────────────
  const typedText = ref('')
  const typedFont = ref(SIGNATURE_FONTS[0].family)

  /**
   * Initials are short by definition — a handful of letters (optionally
   * dotted/spaced), while a signature is a full name. Enforce that split so
   * the two fields stay meaningfully different: initials are capped short and
   * normalised to uppercase letters, signatures allow a full free-form name.
   */
  const INITIALS_MAX = 5
  const SIGNATURE_MAX = 60
  const typeMaxLength = computed(() => (props.kind === 'initials' ? INITIALS_MAX : SIGNATURE_MAX))

  function onTypedInput(value: string): void {
    if (props.kind === 'initials') {
      typedText.value = value
        .toUpperCase()
        .replace(/[^A-Z.\s]/g, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, INITIALS_MAX)
    } else {
      typedText.value = value.slice(0, SIGNATURE_MAX)
    }
  }

  /** Rasterize the typed signature at high resolution → transparent PNG. */
  function typedToDataUrl(): string | null {
    const text = typedText.value.trim()
    if (!text) return null
    const fontSize = 96
    const canvas = globalThis.document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null
    const font = `${fontSize}px ${typedFont.value}`
    context.font = font
    const metrics = context.measureText(text)
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.35
    const pad = 18
    canvas.width = Math.ceil(metrics.width + pad * 2)
    canvas.height = Math.ceil(ascent + descent + pad * 2)
    const outContext = canvas.getContext('2d')
    if (!outContext) return null
    outContext.font = font
    outContext.fillStyle = inkColor.value
    outContext.textBaseline = 'alphabetic'
    outContext.fillText(text, pad, pad + ascent)
    return canvas.toDataURL('image/png')
  }

  // ─── Upload ──────────────────────────────────────────────────────────────────
  const uploadInput = ref<HTMLInputElement | null>(null)
  const uploadedRaw = ref<string | null>(null)
  const removeBackground = ref(true)
  const uploadedProcessed = ref<string | null>(null)
  const uploadDragging = ref(false)

  function onUploadPicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) readUpload(file)
    ;(event.target as HTMLInputElement).value = ''
  }

  function onUploadDrop(event: DragEvent): void {
    uploadDragging.value = false
    const file = event.dataTransfer?.files?.[0]
    if (file && /image\/(png|jpe?g)/.test(file.type)) readUpload(file)
  }

  function readUpload(file: File): void {
    const reader = new FileReader()
    reader.onload = () => {
      uploadedRaw.value = typeof reader.result === 'string' ? reader.result : null
    }
    reader.readAsDataURL(file)
  }

  /** Soft-key near-white pixels to transparent so paper scans read as ink. */
  function keyOutWhite(source: string): Promise<string> {
    return new Promise((resolve) => {
      const image = new globalThis.Image()
      image.onload = () => {
        const canvas = globalThis.document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) return resolve(source)
        context.drawImage(image, 0, 0)
        const data = context.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = data.data
        for (let index = 0; index < pixels.length; index += 4) {
          const luminance =
            0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2]
          // Full opacity below 190, fully transparent above 242, ramp between.
          if (luminance > 242) pixels[index + 3] = 0
          else if (luminance > 190) {
            pixels[index + 3] = Math.round(pixels[index + 3] * (1 - (luminance - 190) / 52))
          }
        }
        context.putImageData(data, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      image.onerror = () => resolve(source)
      image.src = source
    })
  }

  watch([uploadedRaw, removeBackground], async () => {
    if (!uploadedRaw.value) {
      uploadedProcessed.value = null
      return
    }
    uploadedProcessed.value = removeBackground.value
      ? await keyOutWhite(uploadedRaw.value)
      : uploadedRaw.value
  })

  // ─── Confirm ─────────────────────────────────────────────────────────────────
  const canConfirm = computed(() => {
    if (tab.value === 'draw') return !padEmpty.value
    if (tab.value === 'type') return typedText.value.trim().length > 0
    return !!uploadedProcessed.value
  })

  function confirm(): void {
    const dataUrl =
      tab.value === 'draw'
        ? (pad.value?.toDataUrl() ?? null)
        : tab.value === 'type'
          ? typedToDataUrl()
          : uploadedProcessed.value
    if (!dataUrl) return
    emit('created', { dataUrl, save: saveToLibrary.value })
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') emit('close')
  }

  onMounted(() => globalThis.addEventListener('keydown', onKeyDown))
  onBeforeUnmount(() => globalThis.removeEventListener('keydown', onKeyDown))

  const title = computed(() =>
    props.kind === 'initials' ? 'Create your initials' : 'Create your signature',
  )
  const placeholder = computed(() =>
    props.kind === 'initials' ? 'Your initials (e.g. JD)' : 'Type your name',
  )
</script>

<template>
  <Teleport to="body">
    <div class="sc__backdrop" role="dialog" aria-modal="true" :aria-label="title" @click.self="emit('close')">
      <div class="sc animate-fade-up">
        <header class="sc__head">
          <h3 class="sc__title">
            <BaseIcon name="file-signature" :size="19" />
            {{ title }}
          </h3>
          <button type="button" class="sc__close" aria-label="Close" @click="emit('close')">
            <BaseIcon name="x" :size="18" />
          </button>
        </header>

        <!-- Method tabs -->
        <div class="sc__tabs" role="tablist" aria-label="Signature method">
          <button
            v-for="item in TABS"
            :key="item.key"
            type="button"
            role="tab"
            class="sc__tab"
            :class="{ 'sc__tab--active': tab === item.key }"
            :aria-selected="tab === item.key"
            @click="tab = item.key"
          >
            <BaseIcon :name="item.icon" :size="15" />
            {{ item.label }}
          </button>
        </div>

        <div class="sc__body">
          <!-- Draw -->
          <div v-if="tab === 'draw'" class="sc__panel">
            <SignaturePad
              ref="pad"
              :color="inkColor"
              :stroke-width="strokeWidth"
              @update:empty="padEmpty = $event"
            />
            <div class="sc__row">
              <div class="sc__inks" role="group" aria-label="Ink color">
                <button
                  v-for="ink in INK_COLORS"
                  :key="ink.value"
                  type="button"
                  class="sc__ink"
                  :class="{ 'sc__ink--active': inkColor === ink.value }"
                  :style="{ background: ink.value }"
                  :title="ink.label"
                  :aria-label="`${ink.label} ink`"
                  @click="inkColor = ink.value"
                />
              </div>
              <label class="sc__stroke">
                <span>Pen</span>
                <input v-model.number="strokeWidth" type="range" min="1.5" max="4.5" step="0.5" />
              </label>
              <div class="sc__row-actions">
                <button type="button" class="sc__mini" :disabled="padEmpty" @click="pad?.undoStroke()">
                  <BaseIcon name="undo" :size="14" /> Undo
                </button>
                <button type="button" class="sc__mini" :disabled="padEmpty" @click="pad?.clear()">
                  <BaseIcon name="eraser" :size="14" /> Clear
                </button>
              </div>
            </div>
          </div>

          <!-- Type -->
          <div v-else-if="tab === 'type'" class="sc__panel">
            <input
              :value="typedText"
              class="sc__input"
              :class="{ 'sc__input--initials': kind === 'initials' }"
              type="text"
              :placeholder="placeholder"
              :maxlength="typeMaxLength"
              autofocus
              @input="onTypedInput(($event.target as HTMLInputElement).value)"
            />
            <p class="sc__hint">
              <BaseIcon name="info" :size="13" />
              {{
                kind === 'initials'
                  ? 'Initials only — up to a few letters (e.g. JD or J.D.).'
                  : 'Type your full name, then pick a signature style below.'
              }}
            </p>
            <div class="sc__fonts" role="radiogroup" aria-label="Signature style">
              <button
                v-for="font in SIGNATURE_FONTS"
                :key="font.label"
                type="button"
                role="radio"
                class="sc__font"
                :class="{ 'sc__font--active': typedFont === font.family }"
                :aria-checked="typedFont === font.family"
                @click="typedFont = font.family"
              >
                <span
                  class="sc__font-preview"
                  :style="{ fontFamily: font.family, color: inkColor }"
                >
                  {{ typedText.trim() || (kind === 'initials' ? 'AB' : 'Signature') }}
                </span>
                <span class="sc__font-label">{{ font.label }}</span>
              </button>
            </div>
            <div class="sc__inks" role="group" aria-label="Ink color">
              <button
                v-for="ink in INK_COLORS"
                :key="ink.value"
                type="button"
                class="sc__ink"
                :class="{ 'sc__ink--active': inkColor === ink.value }"
                :style="{ background: ink.value }"
                :title="ink.label"
                :aria-label="`${ink.label} ink`"
                @click="inkColor = ink.value"
              />
            </div>
          </div>

          <!-- Upload -->
          <div v-else class="sc__panel">
            <input
              ref="uploadInput"
              type="file"
              accept=".png,.jpg,.jpeg"
              class="sc__hidden"
              @change="onUploadPicked"
            />
            <div
              v-if="!uploadedProcessed"
              class="sc__dropzone"
              :class="{ 'sc__dropzone--active': uploadDragging }"
              role="button"
              tabindex="0"
              aria-label="Upload a signature image"
              @click="uploadInput?.click()"
              @keydown.enter.prevent="uploadInput?.click()"
              @dragover.prevent="uploadDragging = true"
              @dragleave="uploadDragging = false"
              @drop.prevent="onUploadDrop"
            >
              <BaseIcon name="image" :size="26" />
              <strong>Drop a photo of your signature</strong>
              <span>or click to browse — PNG or JPG</span>
            </div>
            <template v-else>
              <div class="sc__preview">
                <img :src="uploadedProcessed" alt="Uploaded signature preview" />
              </div>
              <div class="sc__row">
                <label class="sc__check">
                  <input v-model="removeBackground" type="checkbox" />
                  <span>Remove white background</span>
                </label>
                <div class="sc__row-actions">
                  <button type="button" class="sc__mini" @click="uploadInput?.click()">
                    <BaseIcon name="refresh" :size="14" /> Replace
                  </button>
                  <button
                    type="button"
                    class="sc__mini"
                    @click="((uploadedRaw = null), (uploadedProcessed = null))"
                  >
                    <BaseIcon name="trash" :size="14" /> Remove
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <footer class="sc__foot">
          <label class="sc__check">
            <input v-model="saveToLibrary" type="checkbox" />
            <span>Save for reuse</span>
          </label>
          <div class="sc__foot-actions">
            <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
            <BaseButton icon="check" :disabled="!canConfirm" @click="confirm">
              {{ kind === 'initials' ? 'Use initials' : 'Use signature' }}
            </BaseButton>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .sc__backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgb(9 14 26 / 0.55);
    backdrop-filter: blur(4px);
  }
  .sc {
    width: min(560px, 100%);
    max-height: calc(100vh - 36px);
    overflow: auto;
    border-radius: var(--radius-xl);
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-xl);
  }
  .sc__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 12px;
  }
  .sc__title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    font-size: 16.5px;
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.01em;
  }
  .sc__title > svg {
    color: hsl(var(--color-purple));
  }
  .sc__close {
    display: flex;
    padding: 7px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sc__close:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }

  .sc__tabs {
    display: flex;
    gap: 4px;
    margin: 0 18px;
    padding: 4px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    border: 1px solid hsl(var(--color-border));
  }
  .sc__tab {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 10px;
    border: none;
    border-radius: calc(var(--radius-lg) - 4px);
    background: transparent;
    color: hsl(var(--color-text-muted));
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      box-shadow 0.15s;
  }
  .sc__tab--active {
    background: hsl(var(--color-surface));
    color: hsl(var(--color-primary));
    box-shadow: var(--shadow-sm);
  }

  .sc__body {
    padding: 16px 18px;
  }
  .sc__panel {
    display: grid;
    gap: 14px;
  }

  .sc__row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .sc__row-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  .sc__mini {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 11px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .sc__mini:hover:not(:disabled) {
    border-color: hsl(var(--color-border-strong));
    color: hsl(var(--color-text));
  }
  .sc__mini:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .sc__inks {
    display: flex;
    gap: 8px;
  }
  .sc__ink {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid transparent;
    outline: 2px solid transparent;
    cursor: pointer;
    transition:
      transform 0.15s,
      outline-color 0.15s;
  }
  .sc__ink:hover {
    transform: scale(1.12);
  }
  .sc__ink--active {
    outline-color: hsl(var(--color-primary));
    outline-offset: 2px;
  }
  .sc__stroke {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .sc__stroke input {
    width: 90px;
    accent-color: hsl(var(--color-primary));
  }

  .sc__input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 15px;
    font-weight: 600;
    transition: border-color 0.15s;
  }
  .sc__input:focus {
    outline: none;
    border-color: hsl(var(--color-primary));
  }
  .sc__input--initials {
    text-align: center;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 18px;
  }
  .sc__hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: -4px 2px 0;
    font-size: 12px;
    font-weight: 500;
    color: hsl(var(--color-text-faint));
  }
  .sc__hint > svg {
    flex: none;
  }
  .sc__fonts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .sc__font {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 10px 10px;
    border: 1.5px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface));
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s,
      transform 0.15s;
    min-width: 0;
  }
  .sc__font:hover {
    border-color: hsl(var(--color-border-strong));
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  .sc__font--active {
    border-color: hsl(var(--color-primary));
    box-shadow: 0 0 0 3px hsl(var(--color-primary) / 0.14);
  }
  .sc__font-preview {
    font-size: 26px;
    line-height: 1.3;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sc__font-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: hsl(var(--color-text-faint));
  }

  .sc__hidden {
    display: none;
  }
  .sc__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 34px 20px;
    border: 1.5px dashed hsl(var(--color-border-strong));
    border-radius: var(--radius-lg);
    color: hsl(var(--color-text-muted));
    font-size: 13px;
    cursor: pointer;
    text-align: center;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .sc__dropzone:hover,
  .sc__dropzone--active {
    border-color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.05);
  }
  .sc__dropzone strong {
    color: hsl(var(--color-text));
    font-size: 14px;
  }
  .sc__preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 150px;
    padding: 14px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background:
      repeating-conic-gradient(hsl(var(--color-chip)) 0% 25%, transparent 0% 50%) 0 0 / 18px 18px,
      hsl(var(--color-surface));
  }
  .sc__preview img {
    max-width: 100%;
    max-height: 180px;
  }

  .sc__check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    user-select: none;
  }
  .sc__check input {
    accent-color: hsl(var(--color-primary));
    width: 15px;
    height: 15px;
  }

  .sc__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 18px 18px;
    border-top: 1px solid hsl(var(--color-border));
  }
  .sc__foot-actions {
    display: flex;
    gap: 10px;
  }

  @media (max-width: 480px) {
    .sc__fonts {
      grid-template-columns: 1fr;
    }
  }
</style>
