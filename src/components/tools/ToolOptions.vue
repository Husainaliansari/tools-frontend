<script setup lang="ts">
  /**
   * ToolOptions — renders the option controls appropriate to a given tool and
   * emits the backend-shaped options payload via `v-model:options`.
   * Unknown tools fall back to a smart-defaults note (empty options).
   *
   * The watermark tool delegates to the dedicated WatermarkPanel, which owns
   * its own state/validation and additionally emits the stamp image file.
   */
  import { computed, reactive, watch } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseToggle from '@components/ui/BaseToggle.vue'
  import BaseColorPicker from '@components/ui/BaseColorPicker.vue'
  import BaseSelect from '@components/ui/BaseSelect.vue'
  import BaseSlider from '@components/ui/BaseSlider.vue'
  import InfoTip from '@components/ui/InfoTip.vue'
  import SegmentedControl from '@components/ui/SegmentedControl.vue'
  import OptionGroup from '@components/tools/workflow/OptionGroup.vue'
  import WatermarkPanel from '@components/tools/watermark/WatermarkPanel.vue'
  import { usePdfMetadata } from '@composables'
  import { pageRangesError } from '@utils'
  import type { PdfTool } from '@types'

  const props = defineProps<{
    tool: PdfTool
    /** Watermark: true when the selected files already include a JPG/PNG. */
    hasImageInput?: boolean
    /**
     * Metadata Editor: the first selected PDF, so the panel can read and show
     * its current metadata (files aren't uploaded until the run starts).
     */
    sourceFile?: File | null
    /** Metadata Editor: how many files are selected (drives the "first file" note). */
    fileCount?: number
  }>()
  const emit = defineEmits<{
    'update:options': [value: Record<string, unknown>]
    'update:stampFile': [value: File | null]
  }>()

  // Local UI state (display labels); mapped to backend option keys below.
  const ui = reactive({
    compression: 'Recommended',
    splitMode: 'By range',
    splitRanges: '',
    pageSelection: '',
    pageOrder: '',
    rotation: '90°',
    applyTo: 'All pages',
    password: '',
    passwordConfirm: '',
    unlockPassword: '',
    removeWatermarkText: '',
    headerText: '',
    footerText: '',
    headerAlign: 'Center',
    footerAlign: 'Center',
    hfFont: 'Helvetica',
    hfFontSize: '10',
    hfStyle: 'Regular',
    hfColor: '#333333',
    hfOpacity: 100, // %
    hfMargin: 12, // mm
    hfPages: 'All pages',
    hfPageRange: '',
    numberPosition: 'Bottom center',
    startAt: '1',
    numberFormat: '1, 2, 3',
    pageSize: 'Fit to image',
    imageOutput: 'Separate PDFs',
    ocrAutoDetect: true,
    ocrLanguages: ['eng'] as string[],
    ocrRotatePages: true,
    ocrDeskew: false,
    ocrForceOcr: false,
    redactTexts: '',
    formFields: '',
    metaTitle: '',
    metaAuthor: '',
    metaSubject: '',
    metaKeywords: '',
    metaClearExisting: false,
  })

  // ─── Metadata Editor: read the source PDF's current metadata ────────────────
  const {
    metadata: currentMeta,
    loading: metaLoading,
    error: metaError,
    read: readPdfMetadata,
    reset: resetPdfMetadata,
  } = usePdfMetadata()

  /** True once the user edits a field, so a later re-read won't clobber input. */
  let metaFieldsTouched = false

  /** Load metadata whenever the selected source PDF changes, and prefill the
   *  editable fields with the current values (the "view" half of the tool). */
  watch(
    () => props.sourceFile,
    async (file) => {
      if (props.tool.slug !== 'metadata') return
      metaFieldsTouched = false
      if (!file) {
        resetPdfMetadata()
        return
      }
      const meta = await readPdfMetadata(file)
      // Don't overwrite anything the user has already typed for this selection.
      if (metaFieldsTouched) return
      ui.metaTitle = meta.title
      ui.metaAuthor = meta.author
      ui.metaSubject = meta.subject
      ui.metaKeywords = meta.keywords
    },
    { immediate: true },
  )

  function markMetaTouched(): void {
    metaFieldsTouched = true
  }

  /** Whether the loaded PDF carries any metadata at all (drives the empty note). */
  const hasCurrentMeta = computed(
    () =>
      !!currentMeta.value &&
      Object.values(currentMeta.value).some((value) => value.trim().length > 0),
  )

  /** Tesseract language packs installed on the backend
   *  (keep in sync with SUPPORTED_OCR_LANGUAGES in app/utils/ocr_language.py). */
  const OCR_LANGUAGES: { code: string; label: string }[] = [
    { code: 'eng', label: 'English' },
    { code: 'ara', label: 'Arabic' },
    { code: 'chi_sim', label: 'Chinese (Simplified)' },
    { code: 'chi_tra', label: 'Chinese (Traditional)' },
    { code: 'nld', label: 'Dutch' },
    { code: 'fra', label: 'French' },
    { code: 'deu', label: 'German' },
    { code: 'ell', label: 'Greek' },
    { code: 'heb', label: 'Hebrew' },
    { code: 'hin', label: 'Hindi' },
    { code: 'ita', label: 'Italian' },
    { code: 'jpn', label: 'Japanese' },
    { code: 'kor', label: 'Korean' },
    { code: 'pol', label: 'Polish' },
    { code: 'por', label: 'Portuguese' },
    { code: 'rus', label: 'Russian' },
    { code: 'spa', label: 'Spanish' },
    { code: 'tha', label: 'Thai' },
    { code: 'tur', label: 'Turkish' },
    { code: 'urd', label: 'Urdu' },
    { code: 'vie', label: 'Vietnamese' },
  ]

  /** Each extra model slows recognition; the backend enforces the same cap. */
  const OCR_MAX_LANGUAGES = 4

  function toggleOcrLanguage(code: string) {
    const index = ui.ocrLanguages.indexOf(code)
    if (index >= 0) ui.ocrLanguages.splice(index, 1)
    else if (ui.ocrLanguages.length < OCR_MAX_LANGUAGES) ui.ocrLanguages.push(code)
  }

  /** Live page-range error for Split, shown inline as the user types. */
  const splitRangeMessage = computed<string | null>(() =>
    props.tool.slug === 'split' && ui.splitMode === 'By range'
      ? pageRangesError(ui.splitRanges)
      : null,
  )

  /** Live page-selection error for Delete/Extract Pages, shown inline as the user types. */
  const pageSelectionMessage = computed<string | null>(() =>
    props.tool.slug === 'delete-pages' || props.tool.slug === 'extract-pages'
      ? pageRangesError(ui.pageSelection)
      : null,
  )

  /**
   * Validate the comma-separated page order used by Reorder Pages (e.g. "3, 1, 2").
   * Every entry must be a positive whole page number with no repeats; the
   * backend additionally checks the list covers every page of the document.
   * Returns an error message for malformed input, or null when empty or valid.
   */
  function pageOrderError(raw: string): string | null {
    const tokens = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (!tokens.length) return null // emptiness is handled as a separate "required" case
    const seen = new Set<number>()
    for (const token of tokens) {
      if (!/^\d+$/.test(token)) return `"${token}" isn't a valid page number. Try e.g. 3, 1, 2.`
      const page = Number(token)
      if (page < 1) return 'Page numbers start at 1.'
      if (seen.has(page)) return `Page ${page} appears more than once.`
      seen.add(page)
    }
    return null
  }

  /** Live page-order error for Reorder Pages, shown inline as the user types. */
  const pageOrderMessage = computed<string | null>(() =>
    props.tool.slug === 'reorder' ? pageOrderError(ui.pageOrder) : null,
  )

  /** Live custom-range error for Header & Footer, shown inline as the user types. */
  const hfPageRangeMessage = computed<string | null>(() =>
    props.tool.slug === 'header-footer' && ui.hfPages === 'Custom range'
      ? pageRangesError(ui.hfPageRange)
      : null,
  )

  /** Parse "name=John, email=j@x.com" (or one pair per comma) into a map. */
  function parseFieldPairs(raw: string): Record<string, string> {
    const fields: Record<string, string> = {}
    for (const pair of raw.split(',')) {
      const [name, ...rest] = pair.split('=')
      if (name?.trim() && rest.length) fields[name.trim()] = rest.join('=').trim()
    }
    return fields
  }

  /** True when the current inputs are incomplete/inconsistent. */
  const problem = computed<string | null>(() => {
    switch (props.tool.slug) {
      case 'split':
        if (ui.splitMode !== 'By range') return null
        if (!ui.splitRanges.trim()) return 'Enter at least one page range.'
        return pageRangesError(ui.splitRanges)
      case 'delete-pages':
        if (!ui.pageSelection.trim()) return 'Enter the pages to delete.'
        return pageRangesError(ui.pageSelection)
      case 'extract-pages':
        if (!ui.pageSelection.trim()) return 'Enter the pages to extract.'
        return pageRangesError(ui.pageSelection)
      case 'reorder':
        if (!ui.pageOrder.trim()) return 'Enter the new page order.'
        return pageOrderError(ui.pageOrder)
      case 'protect':
        if (ui.password.length < 4) return 'Password must be at least 4 characters.'
        if (ui.password !== ui.passwordConfirm) return 'Passwords do not match.'
        return null
      case 'unlock':
        return ui.unlockPassword ? null : 'Enter the document password.'
      case 'header-footer':
        if (!ui.headerText.trim() && !ui.footerText.trim())
          return 'Enter a header, a footer, or both.'
        if (ui.hfPages === 'Custom range') {
          if (!ui.hfPageRange.trim()) return 'Enter the pages to apply the header/footer to.'
          return pageRangesError(ui.hfPageRange)
        }
        return null
      case 'redact':
        // Areas are drawn in the editor; the workspace validates the
        // areas-or-texts requirement per file.
        return null
      case 'fill-forms':
        return Object.keys(parseFieldPairs(ui.formFields)).length
          ? null
          : 'Enter at least one field as name=value.'
      case 'metadata':
        // Mirrors the backend: at least one field, unless clearing everything.
        if (ui.metaClearExisting) return null
        return ui.metaTitle.trim() ||
          ui.metaAuthor.trim() ||
          ui.metaSubject.trim() ||
          ui.metaKeywords.trim()
          ? null
          : 'Enter a field to set, or turn on “Clear existing metadata”.'
      case 'ocr':
        return !ui.ocrAutoDetect && ui.ocrLanguages.length === 0
          ? 'Select at least one document language.'
          : null
      default:
        return null
    }
  })

  /** Backend options payload for the current tool. */
  const options = computed<Record<string, unknown>>(() => {
    switch (props.tool.slug) {
      case 'compress':
        return {
          quality: { Extreme: 'extreme', Recommended: 'recommended', Less: 'less' }[ui.compression],
        }
      case 'split':
        return ui.splitMode === 'Every page'
          ? { mode: 'every_page' }
          : {
              mode: 'ranges',
              ranges: ui.splitRanges
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean),
            }
      case 'delete-pages':
      case 'extract-pages':
        // Normalize to the backend's expected shape ("2,5-7") — drops empty
        // tokens so stray/trailing commas don't fail server-side validation.
        return {
          pages: ui.pageSelection
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .join(','),
        }
      case 'reorder':
        return {
          order: ui.pageOrder
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map(Number),
        }
      case 'rotate':
        return {
          angle: Number.parseInt(ui.rotation),
          apply_to: { 'All pages': 'all', 'Odd pages': 'odd', 'Even pages': 'even' }[ui.applyTo],
        }
      case 'protect':
        return { user_password: ui.password }
      case 'unlock':
        return { password: ui.unlockPassword }
      case 'remove-watermark': {
        const text = ui.removeWatermarkText.trim().slice(0, 100)
        return text ? { text } : {}
      }
      case 'header-footer': {
        const pages =
          {
            'All pages': 'all',
            'First page only': 'first',
            'Last page only': 'last',
            'Odd pages': 'odd',
            'Even pages': 'even',
            'Custom range': 'custom',
          }[ui.hfPages] ?? 'all'
        const fontSize = Math.min(36, Math.max(6, Number.parseInt(ui.hfFontSize) || 10))
        return {
          ...(ui.headerText.trim() ? { header_text: ui.headerText } : {}),
          ...(ui.footerText.trim() ? { footer_text: ui.footerText } : {}),
          header_align: ui.headerAlign.toLowerCase(),
          footer_align: ui.footerAlign.toLowerCase(),
          font_family:
            { Helvetica: 'helvetica', Times: 'times', Courier: 'courier' }[ui.hfFont] ??
            'helvetica',
          font_size: fontSize,
          bold: ui.hfStyle === 'Bold' || ui.hfStyle === 'Bold italic',
          italic: ui.hfStyle === 'Italic' || ui.hfStyle === 'Bold italic',
          color: ui.hfColor,
          opacity: Math.min(1, Math.max(0.1, ui.hfOpacity / 100)),
          margin_mm: ui.hfMargin,
          pages,
          ...(pages === 'custom' && ui.hfPageRange.trim()
            ? {
                page_range: ui.hfPageRange
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .join(','),
              }
            : {}),
        }
      }
      case 'page-numbers':
        return {
          position: {
            'Bottom center': 'bottom-center',
            'Bottom right': 'bottom-right',
            'Top center': 'top-center',
          }[ui.numberPosition],
          start_at: Math.max(1, Number.parseInt(ui.startAt) || 1),
          format: ui.numberFormat === 'Page 1 of N' ? 'Page {page} of {total}' : '{page}',
        }
      case 'jpg-to-pdf':
      case 'png-to-pdf':
        return {
          page_size: { 'Fit to image': 'fit', A4: 'a4', Letter: 'letter' }[ui.pageSize],
          // Frontend-only switch (stripped before the API call): one combined
          // document = single job; separate PDFs = one independent job per image.
          combine: ui.imageOutput === 'One combined PDF',
        }
      case 'ocr':
        return {
          auto_detect_language: ui.ocrAutoDetect,
          language:
            ui.ocrAutoDetect || ui.ocrLanguages.length === 0
              ? 'eng'
              : ui.ocrLanguages.join('+'),
          rotate_pages: ui.ocrRotatePages,
          deskew: ui.ocrDeskew,
          force_ocr: ui.ocrForceOcr,
        }
      case 'redact':
        return {
          texts: ui.redactTexts
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }
      case 'fill-forms':
        return { fields: parseFieldPairs(ui.formFields) }
      case 'metadata':
        return {
          ...(ui.metaTitle.trim() ? { title: ui.metaTitle } : {}),
          ...(ui.metaAuthor.trim() ? { author: ui.metaAuthor } : {}),
          ...(ui.metaSubject.trim() ? { subject: ui.metaSubject } : {}),
          ...(ui.metaKeywords.trim() ? { keywords: ui.metaKeywords } : {}),
          ...(ui.metaClearExisting ? { clear_existing: true } : {}),
        }
      default:
        return {}
    }
  })

  watch(
    [options, problem],
    () => {
      // WatermarkPanel owns and emits the watermark payload itself.
      if (props.tool.slug === 'watermark') return
      emit('update:options', { ...options.value, __invalid: problem.value })
    },
    { immediate: true, deep: true },
  )
</script>

<template>
  <div class="pf-opts">
    <!-- Compress -->
    <template v-if="tool.slug === 'compress' || tool.slug === 'compress-scanned'">
      <div class="pf-opts__row">
        <div class="pf-opts__label-row">
          <label class="pf-opts__label">Compression level</label>
          <InfoTip
            text="Extreme gives the smallest file at reduced quality; Less keeps the highest quality with a larger file."
          />
        </div>
        <SegmentedControl v-model="ui.compression" :options="['Extreme', 'Recommended', 'Less']" />
      </div>
      <div class="pf-opts__hint">
        <BaseIcon name="info" :size="15" />
        <span>Extreme = smallest file · Recommended = best balance · Less = highest quality</span>
      </div>
    </template>

    <!-- Split -->
    <template v-else-if="tool.slug === 'split'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">Split mode</label>
        <SegmentedControl v-model="ui.splitMode" :options="['By range', 'Every page']" />
      </div>
      <div v-if="ui.splitMode === 'By range'" class="pf-opts__row">
        <div class="pf-opts__label-row">
          <label class="pf-opts__label">Page ranges</label>
          <InfoTip text="Each comma-separated range becomes its own PDF — e.g. 1-4, 5-8 produces two files." />
        </div>
        <BaseInput
          v-model="ui.splitRanges"
          placeholder="e.g. 1-4, 5-8, 9-12"
          :invalid="!!splitRangeMessage"
        />
        <div v-if="splitRangeMessage" class="pf-opts__error">
          <BaseIcon name="alert-circle" :size="14" /> {{ splitRangeMessage }}
        </div>
      </div>
    </template>

    <!-- Delete / Extract pages -->
    <template v-else-if="tool.slug === 'delete-pages' || tool.slug === 'extract-pages'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">
          {{ tool.slug === 'delete-pages' ? 'Pages to delete' : 'Pages to extract' }}
        </label>
        <BaseInput
          v-model="ui.pageSelection"
          placeholder="e.g. 2, 5-7"
          :invalid="!!pageSelectionMessage"
        />
        <div v-if="pageSelectionMessage" class="pf-opts__error">
          <BaseIcon name="alert-circle" :size="14" /> {{ pageSelectionMessage }}
        </div>
      </div>
      <div class="pf-opts__hint">
        <BaseIcon name="info" :size="15" />
        <span>
          Single pages or ranges, separated by commas.
          {{
            tool.slug === 'delete-pages'
              ? 'The selected pages are removed — at least one page must remain.'
              : 'The selected pages are copied into a new PDF.'
          }}
        </span>
      </div>
    </template>

    <!-- Reorder pages -->
    <template v-else-if="tool.slug === 'reorder'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">New page order</label>
        <BaseInput
          v-model="ui.pageOrder"
          placeholder="e.g. 3, 1, 2"
          :invalid="!!pageOrderMessage"
        />
        <div v-if="pageOrderMessage" class="pf-opts__error">
          <BaseIcon name="alert-circle" :size="14" /> {{ pageOrderMessage }}
        </div>
      </div>
      <div class="pf-opts__hint">
        <BaseIcon name="info" :size="15" />
        <span>
          List every page exactly once, separated by commas — e.g. in a 3-page file, 3, 1, 2 moves
          the last page to the front.
        </span>
      </div>
    </template>

    <!-- Rotate -->
    <template v-else-if="tool.slug === 'rotate'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">Rotation</label>
        <SegmentedControl v-model="ui.rotation" :options="['90°', '180°', '270°']" />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Apply to</label>
        <BaseSelect v-model="ui.applyTo" :options="['All pages', 'Odd pages', 'Even pages']" />
      </div>
    </template>

    <!-- Protect -->
    <template v-else-if="tool.slug === 'protect'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">Password</label>
        <BaseInput
          v-model="ui.password"
          icon="lock"
          type="password"
          placeholder="Enter a password"
        />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Confirm password</label>
        <BaseInput
          v-model="ui.passwordConfirm"
          icon="lock"
          type="password"
          placeholder="Re-enter password"
        />
      </div>
      <div class="pf-opts__hint">
        <BaseIcon name="shield" :size="15" />
        <span>Your document is protected with 256-bit AES encryption.</span>
      </div>
    </template>

    <!-- Unlock -->
    <template v-else-if="tool.slug === 'unlock'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">Document password</label>
        <BaseInput
          v-model="ui.unlockPassword"
          icon="unlock"
          type="password"
          placeholder="Current password"
        />
      </div>
    </template>

    <!-- Watermark -->
    <template v-else-if="tool.slug === 'watermark'">
      <WatermarkPanel
        :has-image-input="hasImageInput"
        @update:options="emit('update:options', $event)"
        @update:stamp-file="emit('update:stampFile', $event)"
      />
    </template>

    <!-- Remove Watermark -->
    <template v-else-if="tool.slug === 'remove-watermark'">
      <div class="pf-opts__hint">
        <BaseIcon name="sparkles" :size="15" />
        <span>
          Text and image watermarks are detected and removed automatically on every page —
          including diagonal, transparent, tiled and repeated watermarks, plus watermark
          annotations, stamps and layers. Watermarks that are part of a scanned page image can't
          be separated from the page.
        </span>
      </div>
      <div class="pf-opts__row">
        <div class="pf-opts__label-row">
          <label class="pf-opts__label">Watermark text (optional fallback)</label>
          <InfoTip text="Only needed if a watermark survives the automatic pass — the exact text is then targeted directly." />
        </div>
        <BaseInput
          v-model="ui.removeWatermarkText"
          placeholder="Only if a watermark survives — e.g. CONFIDENTIAL"
          maxlength="100"
        />
      </div>
    </template>

    <!-- Header & Footer -->
    <template v-else-if="tool.slug === 'header-footer'">
      <OptionGroup
        title="Content"
        icon="type"
        tip="Enter a header, a footer, or both. Placeholders are replaced on every page."
      >
        <div class="pf-opts__row">
          <label class="pf-opts__label">Header text</label>
          <BaseInput v-model="ui.headerText" placeholder="e.g. ACME Corp — {date}" />
        </div>
        <div v-if="ui.headerText.trim()" class="pf-opts__row">
          <label class="pf-opts__label">Header position</label>
          <SegmentedControl v-model="ui.headerAlign" :options="['Left', 'Center', 'Right']" />
        </div>
        <div class="pf-opts__row">
          <label class="pf-opts__label">Footer text</label>
          <BaseInput v-model="ui.footerText" placeholder="e.g. Page {page} of {total}" />
        </div>
        <div v-if="ui.footerText.trim()" class="pf-opts__row">
          <label class="pf-opts__label">Footer position</label>
          <SegmentedControl v-model="ui.footerAlign" :options="['Left', 'Center', 'Right']" />
        </div>
        <div class="pf-opts__hint">
          <BaseIcon name="info" :size="15" />
          <span>Placeholders: {page}, {total}, {date}, {time}, {filename}</span>
        </div>
      </OptionGroup>

      <OptionGroup title="Appearance" icon="edit">
        <div class="pf-opts__row">
          <label class="pf-opts__label">Font</label>
          <BaseSelect v-model="ui.hfFont" :options="['Helvetica', 'Times', 'Courier']" />
        </div>
        <div class="pf-opts__row">
          <label class="pf-opts__label">Style</label>
          <SegmentedControl
            v-model="ui.hfStyle"
            :options="['Regular', 'Bold', 'Italic', 'Bold italic']"
          />
        </div>
        <div class="pf-opts__row">
          <label class="pf-opts__label">Font size (pt)</label>
          <BaseInput v-model="ui.hfFontSize" type="number" min="6" max="36" />
        </div>
        <div class="pf-opts__row">
          <label class="pf-opts__label">Text color</label>
          <BaseColorPicker v-model="ui.hfColor" label="Text color" />
        </div>
        <div class="pf-opts__row">
          <BaseSlider v-model="ui.hfOpacity" :min="10" :max="100" unit="%" label="Opacity" />
        </div>
        <div class="pf-opts__row">
          <BaseSlider v-model="ui.hfMargin" :min="5" :max="40" unit="mm" label="Margin" />
        </div>
      </OptionGroup>

      <OptionGroup
        title="Pages"
        icon="layers"
        tip="Choose which pages receive the header and footer."
      >
        <div class="pf-opts__row">
          <label class="pf-opts__label">Apply to</label>
          <BaseSelect
            v-model="ui.hfPages"
            :options="[
              'All pages',
              'First page only',
              'Last page only',
              'Odd pages',
              'Even pages',
              'Custom range',
            ]"
          />
        </div>
        <div v-if="ui.hfPages === 'Custom range'" class="pf-opts__row">
          <label class="pf-opts__label">Page range</label>
          <BaseInput
            v-model="ui.hfPageRange"
            placeholder="e.g. 1-3, 7"
            :invalid="!!hfPageRangeMessage"
          />
          <div v-if="hfPageRangeMessage" class="pf-opts__error">
            <BaseIcon name="alert-circle" :size="14" /> {{ hfPageRangeMessage }}
          </div>
        </div>
      </OptionGroup>
    </template>

    <!-- Page numbers -->
    <template v-else-if="tool.slug === 'page-numbers'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">Position</label>
        <BaseSelect
          v-model="ui.numberPosition"
          :options="['Bottom center', 'Bottom right', 'Top center']"
        />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Starting number</label>
        <BaseInput v-model="ui.startAt" type="number" />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Format</label>
        <BaseSelect v-model="ui.numberFormat" :options="['1, 2, 3', 'Page 1 of N']" />
      </div>
    </template>

    <!-- OCR -->
    <template v-else-if="tool.slug === 'ocr'">
      <div class="pf-ocr">
        <div class="pf-ocr__card">
          <div class="pf-ocr__switch">
            <BaseIcon name="sparkles" :size="18" class="pf-ocr__switch-icon" />
            <div class="pf-ocr__switch-text">
              <span class="pf-ocr__switch-title">Auto-detect language</span>
              <span class="pf-ocr__switch-desc">
                The document's script and language are recognised automatically —
                including multi-language documents.
              </span>
            </div>
            <BaseToggle v-model="ui.ocrAutoDetect" label="Auto-detect language" />
          </div>

          <div v-if="!ui.ocrAutoDetect" class="pf-ocr__langs">
            <div class="pf-ocr__langs-head">
              <label class="pf-opts__label" style="margin-bottom: 0">
                Document languages
              </label>
              <span class="pf-ocr__langs-count">
                {{ ui.ocrLanguages.length }}/{{ OCR_MAX_LANGUAGES }}
              </span>
            </div>
            <div class="pf-ocr__chips">
              <button
                v-for="lang in OCR_LANGUAGES"
                :key="lang.code"
                type="button"
                class="pf-ocr__chip"
                :class="{ 'pf-ocr__chip--on': ui.ocrLanguages.includes(lang.code) }"
                :disabled="
                  !ui.ocrLanguages.includes(lang.code) &&
                  ui.ocrLanguages.length >= OCR_MAX_LANGUAGES
                "
                :aria-pressed="ui.ocrLanguages.includes(lang.code)"
                @click="toggleOcrLanguage(lang.code)"
              >
                <BaseIcon
                  v-if="ui.ocrLanguages.includes(lang.code)"
                  name="check"
                  :size="13"
                />
                {{ lang.label }}
              </button>
            </div>
            <div v-if="ui.ocrLanguages.length === 0" class="pf-opts__error">
              <BaseIcon name="alert-circle" :size="14" /> Select at least one language.
            </div>
            <div v-else class="pf-opts__note">
              Pick every language that appears in the document (up to
              {{ OCR_MAX_LANGUAGES }}) — fewer languages means faster, more
              accurate recognition.
            </div>
          </div>
        </div>

        <div class="pf-ocr__card">
          <div class="pf-ocr__group-title">Scan corrections</div>
          <div class="pf-ocr__switch">
            <div class="pf-ocr__switch-text">
              <span class="pf-ocr__switch-title">Auto-rotate pages</span>
              <span class="pf-ocr__switch-desc">
                Fixes pages scanned sideways or upside-down.
              </span>
            </div>
            <BaseToggle v-model="ui.ocrRotatePages" label="Auto-rotate pages" />
          </div>
          <div class="pf-ocr__switch">
            <div class="pf-ocr__switch-text">
              <span class="pf-ocr__switch-title">Straighten skewed pages</span>
              <span class="pf-ocr__switch-desc">
                Deskews slightly tilted scans before recognition.
              </span>
            </div>
            <BaseToggle v-model="ui.ocrDeskew" label="Straighten skewed pages" />
          </div>
          <div class="pf-ocr__switch">
            <div class="pf-ocr__switch-text">
              <span class="pf-ocr__switch-title">Force OCR</span>
              <span class="pf-ocr__switch-desc">
                Re-recognises every page, replacing any existing text layer. Pages
                that already contain text are otherwise left untouched.
              </span>
            </div>
            <BaseToggle v-model="ui.ocrForceOcr" label="Force OCR" />
          </div>
        </div>

        <div class="pf-opts__hint">
          <BaseIcon name="scan-text" :size="15" />
          <span>
            Your PDF keeps its original appearance — recognised text is added as an
            invisible, searchable and selectable layer.
          </span>
        </div>
      </div>
    </template>

    <!-- Redact -->
    <template v-else-if="tool.slug === 'redact'">
      <div class="pf-opts__row">
        <div class="pf-opts__label-row">
          <label class="pf-opts__label">Also remove matching text (optional)</label>
          <InfoTip text="Every occurrence of the comma-separated terms is found and removed, case-insensitively." />
        </div>
        <BaseInput v-model="ui.redactTexts" placeholder="e.g. John Doe, ACME-2024" />
      </div>
      <div class="pf-opts__hint">
        <BaseIcon name="info" :size="15" />
        <span>
          Draw redaction areas directly on the preview — drag to mark, then choose black, white,
          color, blur or pixelate per area. This field additionally finds and removes every
          occurrence of the comma-separated terms (case-insensitive). Everything marked is
          permanently removed from the file, not just hidden. If a term isn't found, the file is
          left untouched and we'll tell you which term was missing. Scanned pages have no
          searchable text — draw areas over them or run OCR first.
        </span>
      </div>
    </template>

    <!-- Fill forms -->
    <template v-else-if="tool.slug === 'fill-forms'">
      <div class="pf-opts__row">
        <div class="pf-opts__label-row">
          <label class="pf-opts__label">Field values</label>
          <InfoTip text="Field names must match the PDF form's field names exactly." />
        </div>
        <BaseInput v-model="ui.formFields" placeholder="name=Jane Doe, email=jane@x.com" />
      </div>
      <div class="pf-opts__hint">
        <BaseIcon name="info" :size="15" />
        <span>One field=value pair per comma.</span>
      </div>
    </template>

    <!-- Metadata -->
    <template v-else-if="tool.slug === 'metadata'">
      <!-- View: the source PDF's current metadata -->
      <div class="pf-meta__current">
        <div class="pf-meta__current-head">
          <BaseIcon name="info" :size="15" />
          <span>Current metadata</span>
          <span v-if="(fileCount ?? 0) > 1" class="pf-meta__current-note">first file</span>
        </div>

        <div v-if="metaLoading" class="pf-meta__current-msg">Reading document…</div>
        <div v-else-if="metaError" class="pf-meta__current-msg pf-meta__current-msg--warn">
          {{ metaError }}
        </div>
        <div v-else-if="!sourceFile" class="pf-meta__current-msg">Select a PDF to see its metadata.</div>
        <div v-else-if="!hasCurrentMeta" class="pf-meta__current-msg">
          This document has no metadata set yet.
        </div>
        <dl v-else class="pf-meta__grid">
          <template v-if="currentMeta?.title">
            <dt>Title</dt>
            <dd>{{ currentMeta.title }}</dd>
          </template>
          <template v-if="currentMeta?.author">
            <dt>Author</dt>
            <dd>{{ currentMeta.author }}</dd>
          </template>
          <template v-if="currentMeta?.subject">
            <dt>Subject</dt>
            <dd>{{ currentMeta.subject }}</dd>
          </template>
          <template v-if="currentMeta?.keywords">
            <dt>Keywords</dt>
            <dd>{{ currentMeta.keywords }}</dd>
          </template>
          <template v-if="currentMeta?.creator">
            <dt>Creator</dt>
            <dd>{{ currentMeta.creator }}</dd>
          </template>
          <template v-if="currentMeta?.producer">
            <dt>Producer</dt>
            <dd>{{ currentMeta.producer }}</dd>
          </template>
        </dl>
      </div>

      <!-- Edit: prefilled with the current values -->
      <div class="pf-opts__row">
        <label class="pf-opts__label">Title</label>
        <BaseInput
          v-model="ui.metaTitle"
          placeholder="Document title"
          @update:model-value="markMetaTouched"
        />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Author</label>
        <BaseInput
          v-model="ui.metaAuthor"
          placeholder="Author"
          @update:model-value="markMetaTouched"
        />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Subject</label>
        <BaseInput
          v-model="ui.metaSubject"
          placeholder="Subject"
          @update:model-value="markMetaTouched"
        />
      </div>
      <div class="pf-opts__row">
        <div class="pf-opts__label-row">
          <label class="pf-opts__label">Keywords</label>
          <InfoTip text="Comma-separated terms, e.g. invoice, 2025, draft." />
        </div>
        <BaseInput
          v-model="ui.metaKeywords"
          placeholder="invoice, 2025, draft"
          @update:model-value="markMetaTouched"
        />
      </div>

      <div class="pf-meta__clear">
        <div class="pf-meta__clear-text">
          <span class="pf-meta__clear-title">Clear existing metadata</span>
          <span class="pf-meta__clear-desc">
            Wipe every field first, then apply only what you enter above.
          </span>
        </div>
        <BaseToggle v-model="ui.metaClearExisting" label="Clear existing metadata" />
      </div>
    </template>

    <!-- Sign runs its own dedicated workspace (SignWorkspace) — no options here. -->

    <!-- Compare -->
    <template v-else-if="tool.slug === 'compare'">
      <div class="pf-opts__hint">
        <BaseIcon name="compare" :size="15" />
        <span>Select exactly two PDFs — you'll get a page-by-page difference report.</span>
      </div>
    </template>

    <!-- Merge -->
    <template v-else-if="tool.slug === 'merge'">
      <div class="pf-opts__hint">
        <BaseIcon name="layers" :size="15" />
        <span>Files merge in the order shown in your selection.</span>
      </div>
    </template>

    <!-- Image to PDF -->
    <template v-else-if="tool.slug === 'jpg-to-pdf' || tool.slug === 'png-to-pdf'">
      <div class="pf-opts__row">
        <label class="pf-opts__label">Page size</label>
        <BaseSelect v-model="ui.pageSize" :options="['Fit to image', 'A4', 'Letter']" />
      </div>
      <div class="pf-opts__row">
        <label class="pf-opts__label">Multiple images</label>
        <SegmentedControl
          v-model="ui.imageOutput"
          :options="['Separate PDFs', 'One combined PDF']"
        />
        <div class="pf-opts__note">
          {{
            ui.imageOutput === 'One combined PDF'
              ? 'All images become pages of a single PDF, in upload order.'
              : 'Each image converts on its own — download every PDF as soon as it finishes.'
          }}
        </div>
      </div>
    </template>

    <!-- Converters -->
    <template v-else-if="tool.output || tool.slug.includes('to-pdf')">
      <div class="pf-opts__hint">
        <BaseIcon name="file-output" :size="15" />
        <span>Converting to {{ tool.output ?? 'PDF' }}.</span>
      </div>
    </template>

    <!-- Default -->
    <template v-else>
      <div class="pf-opts__hint">
        <BaseIcon name="sparkles" :size="15" />
        <span>Smart defaults are applied. Click the button below to run this tool.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .pf-opts {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .pf-opts__row {
    min-width: 0;
  }
  .pf-opts__label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    margin-bottom: 8px;
  }
  /* Label + tooltip on one line, sharing the label's bottom rhythm */
  .pf-opts__label-row {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
  }
  .pf-opts__label-row .pf-opts__label {
    margin-bottom: 0;
  }
  .pf-opts__note {
    font-size: 13.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.5;
  }
  /* Informational callout with a leading icon */
  .pf-opts__hint {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 11px 13px;
    border-radius: var(--radius-md);
    background: hsl(var(--color-primary) / 0.05);
    border: 1px solid hsl(var(--color-primary) / 0.14);
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    line-height: 1.55;
  }
  .pf-opts__hint > svg {
    flex: none;
    margin-top: 2px;
    color: hsl(var(--color-primary));
  }
  .pf-opts__error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-danger));
  }

  /* --- OCR panel ------------------------------------------------------- */
  .pf-ocr {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .pf-ocr__card {
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface-muted) / 0.6);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .pf-ocr__group-title {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: hsl(var(--color-text-muted));
  }
  .pf-ocr__switch {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pf-ocr__switch-icon {
    color: hsl(var(--color-primary));
    flex: none;
  }
  .pf-ocr__switch-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .pf-ocr__switch-title {
    font-size: 13.5px;
    font-weight: 600;
  }
  .pf-ocr__switch-desc {
    font-size: 12.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.45;
  }
  .pf-ocr__langs {
    border-top: 1px solid hsl(var(--color-border));
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pf-ocr__langs-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pf-ocr__langs-count {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .pf-ocr__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pf-ocr__chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    border: 1px solid hsl(var(--color-border-strong));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  .pf-ocr__chip:hover:not(:disabled) {
    border-color: hsl(var(--color-primary));
  }
  .pf-ocr__chip--on {
    background: hsl(var(--color-primary));
    border-color: hsl(var(--color-primary));
    color: #fff;
    font-weight: 600;
  }
  .pf-ocr__chip:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* Metadata Editor — current-metadata view + clear toggle */
  .pf-meta__current {
    background: hsl(var(--color-surface-sunken, var(--color-surface)));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    padding: 12px 14px;
    margin-bottom: 4px;
  }
  .pf-meta__current-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: hsl(var(--color-text-faint));
    margin-bottom: 10px;
  }
  .pf-meta__current-note {
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;
    font-size: 11px;
    color: hsl(var(--color-text-muted, var(--color-text-faint)));
  }
  .pf-meta__current-msg {
    font-size: 13px;
    color: hsl(var(--color-text-faint));
  }
  .pf-meta__current-msg--warn {
    color: hsl(var(--color-danger));
  }
  .pf-meta__grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 14px;
    margin: 0;
  }
  .pf-meta__grid dt {
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-faint));
  }
  .pf-meta__grid dd {
    margin: 0;
    font-size: 13px;
    color: hsl(var(--color-text));
    word-break: break-word;
  }
  .pf-meta__clear {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 4px;
  }
  .pf-meta__clear-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .pf-meta__clear-title {
    font-size: 13.5px;
    font-weight: 600;
  }
  .pf-meta__clear-desc {
    font-size: 12px;
    color: hsl(var(--color-text-faint));
  }
</style>
