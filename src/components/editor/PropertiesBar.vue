<script setup lang="ts">
  /**
   * PropertiesBar — contextual controls for the current selection.
   *
   * Fixed, dedicated toolbar area below the ribbon that remains visible and
   * stable at all times (fixed 48px height), preventing canvas viewports
   * from resizing or shifting.
   */
  import { computed } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseColorPicker from '@components/ui/BaseColorPicker.vue'
  import NumberStepper from '@components/ui/NumberStepper.vue'
  import { useEditor } from './useEditor'
  import { STAMP_PRESETS, type FieldAnnotation, type ToolId } from '@/lib/pdf'

  const editor = useEditor()
  const hasContentSelection = computed(() => !!editor.selectedContentId.value)

  // ─── Content-mode selection ────────────────────────────────────────────────
  const cEdit = computed(() => editor.selectedContentEdit.value)
  const cDet = computed(() => editor.selectedDetected.value)
  const cKind = computed(() => cEdit.value?.kind ?? cDet.value?.kind ?? null)
  const cText = computed(() => {
    const e = cEdit.value
    if (e && e.kind === 'text') return e
    const d = cDet.value
    if (d && d.kind === 'text') return d
    return null
  })

  const cColor = computed({
    // Show the block's true colour: the edit's colour if materialised, else the
    // colour sampled from the canvas on selection. Never a hardcoded default.
    get: () => {
      const e = cEdit.value
      if (e && e.kind === 'text') return e.color
      const d = cDet.value
      if (d && d.kind === 'text') return editor.sampledColors.value[d.id] ?? '#111827'
      return '#111827'
    },
    set: (val: string) => editor.editSelectedContent({ color: val }),
  })

  const cAlign = computed({
    get: () => (cEdit.value && cEdit.value.kind === 'text' ? cEdit.value.align : cText.value?.align || 'left'),
    set: (v: string) => editor.editSelectedContent({ align: v as 'left' | 'center' | 'right' }),
  })

  const SYSTEM_FONTS = [
    'Calibri',
    'Helvetica',
    'Arial',
    'Times New Roman',
    'Georgia',
    'Garamond',
    'Courier New',
    'Verdana',
    'Trebuchet MS',
    'Tahoma',
    'Cambria',
    'Palatino',
    'Roboto',
    'Open Sans',
    'Inter',
    'Aptos',
    'Segoe UI',
  ]

  const availableFonts = computed(() => {
    const list = [...SYSTEM_FONTS]
    const cur = cText.value?.fontFamily
    if (cur && !list.includes(cur)) {
      list.unshift(cur)
    }
    return list
  })

  // Stepper numeric models for Content Text
  const cFontSize = computed({
    get: () => Math.round(cText.value?.fontSize ?? 12),
    set: (val: number) => editor.editSelectedContent({ fontSize: val }),
  })
  const cLineHeightPct = computed({
    get: () => Math.round((cText.value?.lineHeight ?? 1.25) * 100),
    set: (val: number) => editor.editSelectedContent({ lineHeight: val / 100 }),
  })
  const cLetterSpacing = computed({
    get: () => Math.round(cText.value?.letterSpacing ?? 0),
    set: (val: number) => editor.editSelectedContent({ letterSpacing: val }),
  })
  const cParagraphSpacing = computed({
    get: () => Math.round(cText.value?.paragraphSpacing ?? 0),
    set: (val: number) => editor.editSelectedContent({ paragraphSpacing: val }),
  })
  const cOpacityPct = computed({
    get: () => Math.round((cEdit.value?.opacity ?? 1) * 100),
    set: (val: number) => editor.editSelectedContent({ opacity: val / 100 }),
  })
  // BaseColorPicker's opacity model is 0–1 (it does its own ×100 for display).
  const cOpacity01 = computed({
    get: () => cEdit.value?.opacity ?? 1,
    set: (val: number) => editor.editSelectedContent({ opacity: val }),
  })

  const isLocked = computed(() => {
    if (sel.value) return !!sel.value.locked
    if (cEdit.value) return !!cEdit.value.locked
    return false
  })
  const isGrouped = computed(() => {
    if (sel.value) return !!sel.value.groupId
    if (cEdit.value) return !!cEdit.value.groupId
    return false
  })

  // ─── Annotate-mode selection ────────────────────────────────────────────────
  const sel = computed(() => editor.selected.value)
  const multiCount = computed(() => editor.selectedIds.value.length + editor.selectedContentIds.value.length)
  const context = computed<ToolId>(() => sel.value?.type ?? editor.activeTool.value)

  const CLASSIC_COLOR: ToolId[] = [
    'highlight',
    'underline',
    'strikethrough',
    'squiggly',
    'ink',
    'rect',
    'ellipse',
    'arrow',
    'line',
    'text',
    'note',
  ]
  const showColor = computed(() => CLASSIC_COLOR.includes(context.value))
  const showStroke = computed(() =>
    ['ink', 'rect', 'ellipse', 'arrow', 'line'].includes(context.value),
  )
  const showFill = computed(() => ['rect', 'ellipse'].includes(context.value))
  const showOpacity = computed(() =>
    ['highlight', 'rect', 'ellipse', 'arrow', 'line', 'ink'].includes(context.value),
  )
  const showFont = computed(() => context.value === 'text')
  const isStamp = computed(() => context.value === 'stamp')
  const isLink = computed(() => sel.value?.type === 'link')
  const isImage = computed(() => sel.value?.type === 'image')
  const isField = computed(() => context.value.startsWith('field-'))
  const selField = computed(() =>
    sel.value && sel.value.type.startsWith('field-') ? (sel.value as FieldAnnotation) : null,
  )

  const currentColor = computed<string>({
    get: () => {
      const s = sel.value
      if (s) {
        if ('color' in s) return s.color
        if ('stroke' in s) return s.stroke
      }
      return editor.style.value.color
    },
    set: (color: string) => {
      editor.setStyle({ color })
    },
  })

  // 0–1 opacity model for the color picker (see cOpacity01).
  const currentOpacity01 = computed({
    get: () =>
      (sel.value && 'opacity' in sel.value ? sel.value.opacity : editor.style.value.opacity) ?? 1,
    set: (v: number) => {
      editor.setStyle({ opacity: v })
    },
  })

  const currentStrokeWidth = computed({
    get: () => {
      const s = sel.value
      if (s?.type === 'ink') return s.size
      if (s && 'strokeWidth' in s) return s.strokeWidth
      return editor.style.value.strokeWidth
    },
    set: (strokeWidth: number) => {
      editor.setStyle({ strokeWidth })
    },
  })

  const currentFontSize = computed({
    get: () => (sel.value?.type === 'text' ? sel.value.fontSize : editor.style.value.fontSize),
    set: (fontSize: number) => {
      editor.setStyle({ fontSize })
    },
  })

  const currentFillColor = computed<string | null>({
    get: () => (sel.value && 'fill' in sel.value ? sel.value.fill : editor.style.value.fill),
    set: (fill: string | null) => {
      editor.setStyle({ fill })
    },
  })

  const align = computed({
    get: () => (sel.value?.type === 'text' ? sel.value.align : 'left'),
    set: (value: string) => {
      if (sel.value?.type === 'text') editor.updateAnnotation(sel.value.id, { align: value as 'left' })
    },
  })

  function toggleFill(on: boolean): void {
    editor.setStyle({ fill: on ? currentColor.value : null })
  }

  // Stamp presets
  const stampLabel = computed({
    get: () => (sel.value?.type === 'stamp' ? sel.value.label : editor.stampPreset.value.label),
    set: (label: string) => {
      const preset = STAMP_PRESETS.find((p) => p.label === label) ?? STAMP_PRESETS[0]
      editor.stampPreset.value = preset
      if (sel.value?.type === 'stamp') {
        editor.updateAnnotation(sel.value.id, { label: preset.label, color: preset.color })
      }
    },
  })

  const linkUrl = computed({
    get: () => (sel.value?.type === 'link' ? sel.value.url : ''),
    set: (url: string) => {
      if (sel.value?.type === 'link') editor.updateAnnotation(sel.value.id, { url }, { record: false })
    },
  })

  const imageOpacityPct = computed({
    get: () => (sel.value?.type === 'image' ? Math.round(sel.value.opacity * 100) : 100),
    set: (pct: number) => {
      if (sel.value?.type === 'image') editor.updateAnnotation(sel.value.id, { opacity: pct / 100 })
    },
  })

  function patchField(patch: Partial<FieldAnnotation>): void {
    if (selField.value) editor.updateAnnotation(selField.value.id, patch)
  }

  const fieldOptions = computed({
    get: () => selField.value?.options.join(', ') ?? '',
    set: (raw: string) =>
      patchField({ options: raw.split(',').map((o) => o.trim()).filter(Boolean) }),
  })

  const editModeLabel = computed(() =>
    editor.editMode.value === 'text'
      ? 'Edit Text'
      : editor.editMode.value === 'object'
        ? 'Edit Object'
        : 'Edit Content',
  )
  const editModeHint = computed(() =>
    editor.editMode.value === 'text'
      ? 'Click a text block to edit it, or double-click to type. Formatting is preserved.'
      : editor.editMode.value === 'object'
        ? 'Click an image or shape to move, resize, or delete it · Drag empty space to lift a region.'
        : 'Click any text or object to edit · Drag empty space to lift a region.',
  )

  const hasSelection = computed(() => !!sel.value)
  const contextLabel = computed(() => {
    if (multiCount.value > 1) return `${multiCount.value} selected`
    if (sel.value || cEdit.value) return 'Selected'
    if (['select', 'hand'].includes(context.value)) return ''
    return 'New'
  })
  const showBar = computed(
    () =>
      multiCount.value > 1 ||
      hasSelection.value ||
      hasContentSelection.value ||
      showColor.value ||
      showFont.value ||
      isStamp.value ||
      isField.value ||
      (editor.activeTool.value === 'image' && !!editor.pendingImage.value),
  )
</script>

<template>
  <div class="props">
    <!-- ─────────────────────── Content selection ───────────────────── -->
    <template v-if="hasContentSelection && multiCount <= 1">
      <template v-if="cKind === 'text'">
        <!-- Badge -->
        <span class="props__ctx">Text</span>
        <span class="props__divider" />

        <!-- Font Family & Size Group -->
        <div class="props__group">
          <select
            class="props__select"
            :value="cText?.fontFamily"
            aria-label="Font family"
            @change="editor.editSelectedContent({ fontFamily: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="f in availableFonts" :key="f" :value="f">
              {{ f }}{{ f === cText?.fontFamily && (cText?.embeddedFont || cText?.loadedFontFamily) ? ' (Embedded)' : '' }}
            </option>
          </select>

          <div class="props__ctrl">
            <span class="props__lbl">Size</span>
            <NumberStepper
              v-model="cFontSize"
              :min="4"
              :max="288"
              :step="1"
              unit="pt"
              label="Font size"
            />
          </div>
        </div>

        <span class="props__divider" />

        <!-- Weight & Style Group -->
        <div class="props__group">
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cText?.bold }"
            title="Bold (Ctrl+B)"
            @click="editor.editSelectedContent({ bold: !cText?.bold })"
          >
            <BaseIcon name="bold" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cText?.italic }"
            title="Italic (Ctrl+I)"
            @click="editor.editSelectedContent({ italic: !cText?.italic })"
          >
            <BaseIcon name="italic" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cText?.underline }"
            title="Underline"
            @click="editor.editSelectedContent({ underline: !cText?.underline })"
          >
            <BaseIcon name="underline" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cText?.strikethrough }"
            title="Strikethrough"
            @click="editor.editSelectedContent({ strikethrough: !cText?.strikethrough })"
          >
            <BaseIcon name="strikethrough" :size="15" />
          </button>
        </div>

        <span class="props__divider" />

        <!-- Alignment Group -->
        <div class="props__group">
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cAlign === 'left' }"
            title="Align Left"
            @click="cAlign = 'left'"
          >
            <BaseIcon name="align-left" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cAlign === 'center' }"
            title="Align Center"
            @click="cAlign = 'center'"
          >
            <BaseIcon name="align-center" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cAlign === 'right' }"
            title="Align Right"
            @click="cAlign = 'right'"
          >
            <BaseIcon name="align-right" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': cAlign === 'justify' }"
            title="Justify"
            @click="cAlign = 'justify'"
          >
            <BaseIcon name="align-justify" :size="15" />
          </button>
        </div>

        <span class="props__divider" />

        <!-- Spacing Group -->
        <div class="props__group">
          <div class="props__ctrl">
            <span class="props__lbl">Line Ht</span>
            <NumberStepper
              v-model="cLineHeightPct"
              :min="50"
              :max="300"
              :step="5"
              unit="%"
              label="Line height"
            />
          </div>
          <div class="props__ctrl">
            <span class="props__lbl">Letter</span>
            <NumberStepper
              v-model="cLetterSpacing"
              :min="-5"
              :max="50"
              :step="0.5"
              unit="pt"
              label="Letter spacing"
            />
          </div>
          <div class="props__ctrl">
            <span class="props__lbl">Para</span>
            <NumberStepper
              v-model="cParagraphSpacing"
              :min="0"
              :max="100"
              :step="1"
              unit="pt"
              label="Paragraph spacing"
            />
          </div>
        </div>

        <span class="props__divider" />

        <!-- Color Picker -->
        <div class="props__group">
          <BaseColorPicker
            v-model="cColor"
            v-model:opacity="cOpacity01"
            :show-opacity="true"
            label="Text color"
          />
        </div>

        <span class="props__divider" />

        <!-- Actions -->
        <div class="props__group props__group--actions">
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': isLocked }"
            :title="isLocked ? 'Unlock' : 'Lock'"
            @click="isLocked ? editor.unlockSelection() : editor.lockSelection()"
          >
            <BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="15" />
          </button>
          <button type="button" class="props__del" title="Delete (Del)" @click="editor.removeSelectedAnnotations()">
            <BaseIcon name="trash" :size="15" /> Delete
          </button>
        </div>
      </template>

      <template v-else-if="cKind === 'image' || cKind === 'region' || cKind === 'graphic'">
        <span class="props__ctx">{{ cKind === 'image' ? 'Image' : cKind === 'graphic' ? 'Shape' : 'Object' }}</span>
        <span class="props__divider" />
        <div class="props__ctrl">
          <span class="props__lbl">Opacity</span>
          <NumberStepper
            v-model="cOpacityPct"
            :min="10"
            :max="100"
            :step="5"
            unit="%"
            label="Opacity"
          />
        </div>
        <span class="props__divider" />
        <div class="props__group">
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': isLocked }"
            :title="isLocked ? 'Unlock' : 'Lock'"
            @click="isLocked ? editor.unlockSelection() : editor.lockSelection()"
          >
            <BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="15" />
          </button>
        </div>
        <button type="button" class="props__del" title="Delete (Del)" @click="editor.removeSelectedAnnotations()">
          <BaseIcon name="trash" :size="15" /> Delete
        </button>
      </template>
    </template>

    <!-- ───────────────────────── Annotate mode ──────────────────────── -->
    <template v-else-if="showBar">
      <span v-if="contextLabel" class="props__ctx">{{ contextLabel }}</span>
      <span v-if="contextLabel" class="props__divider" />

      <!-- Multi-select summary -->
      <template v-if="multiCount > 1">
        <div class="props__group">
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': isGrouped }"
            :title="isGrouped ? 'Ungroup objects' : 'Group objects'"
            @click="isGrouped ? editor.ungroupSelection() : editor.groupSelection()"
          >
            <BaseIcon :name="isGrouped ? 'grid' : 'layers'" :size="15" />
          </button>
          <button
            type="button"
            class="props__wbtn"
            :class="{ 'props__wbtn--on': isLocked }"
            :title="isLocked ? 'Unlock objects' : 'Lock objects'"
            @click="isLocked ? editor.unlockSelection() : editor.lockSelection()"
          >
            <BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="15" />
          </button>
        </div>
        <span class="props__hint">Shift/Ctrl-click or drag to multi-select · Group, align, distribute, and format</span>
        <button type="button" class="props__del" title="Delete selected (Del)" @click="editor.removeSelectedAnnotations()">
          <BaseIcon name="trash" :size="15" /> Delete {{ multiCount }}
        </button>
      </template>

      <template v-else>
        <!-- Image placement hint -->
        <span v-if="editor.activeTool.value === 'image' && editor.pendingImage.value" class="props__hint">
          Click on the page to place your image — click elsewhere to cancel.
        </span>

        <!-- Stamp preset -->
        <div v-if="isStamp" class="props__ctrl">
          <span class="props__lbl">Stamp</span>
          <select v-model="stampLabel" class="props__select" aria-label="Stamp preset">
            <option v-for="p in STAMP_PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
          </select>
        </div>

        <!-- Link URL -->
        <div v-if="isLink" class="props__ctrl props__ctrl--grow">
          <span class="props__lbl">URL</span>
          <input
            v-model="linkUrl"
            class="props__input"
            type="url"
            placeholder="https://example.com"
            aria-label="Link URL"
            @blur="editor.pushHistory(editor.snapshot())"
          />
        </div>

        <!-- Image transforms -->
        <template v-if="isImage">
          <div class="props__ctrl">
            <span class="props__lbl">Opacity</span>
            <NumberStepper
              v-model="imageOpacityPct"
              :min="10"
              :max="100"
              :step="5"
              unit="%"
              label="Image opacity"
            />
          </div>
          <span class="props__divider" />
          <div class="props__group">
            <button type="button" class="props__wbtn" title="Flip horizontally" @click="sel && editor.flipImage(sel.id, 'h')">
              <BaseIcon name="flip-h" :size="15" />
            </button>
            <button type="button" class="props__wbtn" title="Flip vertically" @click="sel && editor.flipImage(sel.id, 'v')">
              <BaseIcon name="flip-v" :size="15" />
            </button>
            <button
              type="button"
              class="props__wbtn"
              title="Reset rotation"
              @click="sel && editor.updateAnnotation(sel.id, { rotation: 0 })"
            >
              <BaseIcon name="rotate-ccw" :size="15" />
            </button>
          </div>
        </template>

        <!-- Form field properties -->
        <template v-if="selField">
          <div class="props__ctrl">
            <span class="props__lbl">Name</span>
            <input
              class="props__input props__input--sm"
              :value="selField.name"
              aria-label="Field name"
              @change="patchField({ name: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div
            v-if="selField.type === 'field-dropdown' || selField.type === 'field-radio'"
            class="props__ctrl props__ctrl--grow"
          >
            <span class="props__lbl">{{ selField.type === 'field-radio' ? 'Option value' : 'Options' }}</span>
            <input
              v-model="fieldOptions"
              class="props__input"
              :placeholder="selField.type === 'field-radio' ? 'Yes' : 'Option 1, Option 2'"
              aria-label="Field options"
            />
          </div>
          <div v-if="selField.type === 'field-text'" class="props__ctrl props__ctrl--grow">
            <span class="props__lbl">Default</span>
            <input
              class="props__input"
              :value="selField.value"
              placeholder="Default value"
              aria-label="Default value"
              @change="patchField({ value: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <label v-if="selField.type === 'field-checkbox'" class="props__check">
            <input
              type="checkbox"
              :checked="selField.value === 'checked'"
              @change="patchField({ value: ($event.target as HTMLInputElement).checked ? 'checked' : '' })"
            />
            Checked by default
          </label>
        </template>

        <!-- Classic styling -->
        <div v-if="showColor" class="props__ctrl">
          <span class="props__lbl">Color</span>
          <BaseColorPicker
            v-model="currentColor"
            v-model:opacity="currentOpacity01"
            :show-opacity="showOpacity"
            label="Annotation color"
          />
        </div>

        <div v-if="showFill" class="props__ctrl">
          <label class="props__check">
            <input type="checkbox" :checked="currentFillColor !== null" @change="toggleFill(($event.target as HTMLInputElement).checked)" />
            Fill
          </label>
          <BaseColorPicker
            v-if="currentFillColor !== null"
            v-model="currentFillColor"
            label="Fill color"
          />
        </div>

        <div v-if="showStroke" class="props__ctrl">
          <span class="props__lbl">Width</span>
          <NumberStepper
            v-model="currentStrokeWidth"
            :min="1"
            :max="20"
            :step="1"
            unit="px"
            label="Stroke width"
          />
        </div>

        <template v-if="showFont">
          <span class="props__divider" />
          <div class="props__ctrl">
            <span class="props__lbl">Size</span>
            <NumberStepper
              v-model="currentFontSize"
              :min="8"
              :max="144"
              :step="1"
              unit="pt"
              label="Font size"
            />
          </div>
          <div class="props__group">
            <button
              type="button"
              class="props__wbtn"
              :class="{ 'props__wbtn--on': align === 'left' }"
              title="Align Left"
              @click="align = 'left'"
            >
              <BaseIcon name="align-left" :size="15" />
            </button>
            <button
              type="button"
              class="props__wbtn"
              :class="{ 'props__wbtn--on': align === 'center' }"
              title="Align Center"
              @click="align = 'center'"
            >
              <BaseIcon name="align-center" :size="15" />
            </button>
            <button
              type="button"
              class="props__wbtn"
              :class="{ 'props__wbtn--on': align === 'right' }"
              title="Align Right"
              @click="align = 'right'"
            >
              <BaseIcon name="align-right" :size="15" />
            </button>
          </div>
        </template>

        <button
          v-if="hasSelection"
          type="button"
          class="props__del"
          title="Delete selected (Del)"
          @click="editor.removeSelectedAnnotations()"
        >
          <BaseIcon name="trash" :size="15" /> Delete
        </button>
      </template>
    </template>

    <!-- ────────────────── Content-edit mode, nothing selected ────────── -->
    <template v-else-if="editor.editMode.value !== 'none'">
      <span class="props__ctx">{{ editModeLabel }}</span>
      <BaseIcon name="mouse-pointer" :size="14" class="props__hint-icon" />
      <span class="props__hint">{{ editModeHint }}</span>
    </template>

    <!-- ────────────────────── Idle / Selection mode ──────────────────── -->
    <template v-else>
      <span class="props__ctx props__ctx--idle">Properties</span>
      <BaseIcon name="mouse-pointer" :size="14" class="props__hint-icon" />
      <span class="props__hint">
        Choose Edit → Edit Text or Edit Object to edit the page's own content.
      </span>
    </template>
  </div>
</template>

<style scoped>
  .props {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
    padding: 0 14px;
    height: 48px;
    min-height: 48px;
    max-height: 48px;
    background: hsl(var(--color-surface-muted));
    border-bottom: 1px solid hsl(var(--color-border));
    flex: none;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }
  .props::-webkit-scrollbar {
    height: 3px;
  }
  .props::-webkit-scrollbar-thumb {
    background: hsl(var(--color-border));
    border-radius: var(--radius-full);
  }

  .props__group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .props__group--actions {
    margin-left: auto;
  }

  .props__divider {
    width: 1px;
    height: 22px;
    background: hsl(var(--color-border));
    margin: 0 4px;
    flex: none;
  }

  .props__ctx {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--color-primary));
    background: hsl(var(--color-primary) / 0.1);
    padding: 3px 8px;
    border-radius: var(--radius-full);
    white-space: nowrap;
    flex: none;
  }
  .props__ctx--idle {
    color: hsl(var(--color-text-muted));
    background: hsl(var(--color-border) / 0.6);
  }

  .props__ctrl {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .props__ctrl--grow {
    flex: 1;
    min-width: 200px;
    max-width: 380px;
  }

  .props__lbl {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    white-space: nowrap;
  }

  .props__select {
    height: 30px;
    padding: 0 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    max-width: 170px;
    flex: none;
    outline: none;
    transition: border-color 0.15s;
  }
  .props__select:focus {
    border-color: hsl(var(--color-primary));
  }

  .props__input {
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 10px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12px;
  }
  .props__input--sm {
    flex: none;
    width: 130px;
  }
  .props__input:focus {
    outline: 2px solid hsl(var(--color-primary) / 0.4);
    border-color: hsl(var(--color-primary));
  }

  .props__wbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
    flex: none;
  }
  .props__wbtn:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .props__wbtn--on {
    background: hsl(var(--color-primary) / 0.12);
    border-color: hsl(var(--color-primary) / 0.4);
    color: hsl(var(--color-primary));
  }

  .props__check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    white-space: nowrap;
    flex: none;
  }

  .props__hint {
    font-size: 12px;
    font-weight: 500;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
  }
  .props__hint-icon {
    color: hsl(var(--color-text-faint));
    flex: none;
  }

  .props__del {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: 1px solid hsl(var(--color-danger) / 0.3);
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.08);
    color: hsl(var(--color-danger));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex: none;
  }
  .props__del:hover {
    background: hsl(var(--color-danger) / 0.14);
  }
</style>
