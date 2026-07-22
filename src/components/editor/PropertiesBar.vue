<script setup lang="ts">
  /**
   * PropertiesBar — contextual formatting strip below the ribbon.
   *
   * Design principles (Foxit / Acrobat / Office):
   *   • Fixed 52px height — never resizes or shifts the canvas.
   *   • Shows only controls relevant to the current selection.
   *   • Keeps frequently used controls inline (font, size, B/I/U/S, colour,
   *     alignment); folds advanced text options (sub/superscript, spacing,
   *     lists, indent, tools) into a single "More" popover.
   *   • A "Panel" affordance opens the full right-side Properties panel for
   *     everything else — so the strip stays uncluttered.
   */
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseColorPicker from '@components/ui/BaseColorPicker.vue'
  import NumberStepper from '@components/ui/NumberStepper.vue'
  import FontPicker from './FontPicker.vue'
  import FontSizeField from './FontSizeField.vue'
  import { useEditor } from './useEditor'
  import { STAMP_PRESETS, boundsOf, type FieldAnnotation, type ToolId } from '@/lib/pdf'
  import { uuid } from '@utils'

  const editor = useEditor()

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

  // ─── Annotate-mode selection ────────────────────────────────────────────────
  const selAnno = computed(() => editor.selected.value)
  const isAnnoText = computed(() => selAnno.value?.type === 'text')
  const multiCount = computed(() => editor.selectedIds.value.length + editor.selectedContentIds.value.length)
  const context = computed<ToolId>(() => selAnno.value?.type ?? editor.activeTool.value)

  const isLocked = computed(() => {
    if (selAnno.value) return !!selAnno.value.locked
    if (cEdit.value) return !!cEdit.value.locked
    return false
  })
  const isGrouped = computed(() => {
    if (selAnno.value) return !!selAnno.value.groupId
    if (cEdit.value) return !!cEdit.value.groupId
    return false
  })

  const hasTextSelection = computed(() => !!cText.value || isAnnoText.value || editor.editMode.value === 'text' || editor.activeTool.value === 'text')

  // ─── "More" popover (advanced text controls) ────────────────────────────────
  // Teleported to <body> so it escapes the toolbar's overflow clipping.
  const showMore = ref(false)
  const moreBtn = ref<HTMLElement | null>(null)
  const popEl = ref<HTMLElement | null>(null)
  const popStyle = ref<Record<string, string>>({})

  function toggleMore(): void {
    if (showMore.value) {
      showMore.value = false
      return
    }
    const r = moreBtn.value?.getBoundingClientRect()
    if (r) popStyle.value = { top: `${r.bottom + 8}px`, left: `${r.left}px` }
    showMore.value = true
  }
  function onDocClick(e: MouseEvent): void {
    const t = e.target as Node
    if (!showMore.value) return
    if (moreBtn.value?.contains(t) || popEl.value?.contains(t)) return
    showMore.value = false
  }
  function closeMore(): void {
    showMore.value = false
  }
  onMounted(() => {
    globalThis.document.addEventListener('click', onDocClick)
    globalThis.addEventListener('resize', closeMore)
  })
  onBeforeUnmount(() => {
    globalThis.document.removeEventListener('click', onDocClick)
    globalThis.removeEventListener('resize', closeMore)
  })

  function openPanel(): void {
    editor.rightOpen.value = true
  }

  // ─── Mock Table State ────────────────────────────────────────────────────────
  const tableRows = ref(3)
  const tableCols = ref(3)
  const tableZebra = ref(false)
  const tableHeader = ref(true)
  const tableBorderWidth = ref(1)
  const tableBorderColor = ref('#cccccc')
  const tableBgColor = ref('#ffffff')

  function deleteTable(): void {
    editor.setTool('select')
  }

  // ─── Text Properties Setup ───────────────────────────────────────────────────
  const currentFontFamily = computed({
    get: () => cText.value?.fontFamily || (isAnnoText.value ? (selAnno.value as any)?.fontFamily : editor.style.value.fontFamily) || 'Calibri',
    set: (val: string) => {
      if (cText.value) editor.editSelectedContent({ fontFamily: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { fontFamily: val } as any)
      else editor.setStyle({ fontFamily: val } as any)
    },
  })

  const currentFontSize = computed({
    get: () => Math.round(cText.value?.fontSize || (isAnnoText.value ? (selAnno.value as any)?.fontSize : editor.style.value.fontSize) || 12),
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ fontSize: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { fontSize: val } as any)
      else editor.setStyle({ fontSize: val })
    },
  })

  const textColor = computed({
    get: () => {
      // A detected-but-not-yet-materialised text object carries no `color`;
      // fall back to its sampled colour, then a sane default (never undefined,
      // which would crash the colour picker).
      if (cText.value) return cText.value.color || editor.sampledColors.value[cText.value.id] || '#111827'
      if (isAnnoText.value && selAnno.value) return (selAnno.value as any).color || '#111827'
      return editor.style.value.color || '#111827'
    },
    set: (val: string) => {
      if (cText.value) editor.editSelectedContent({ color: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { color: val } as any)
      else editor.setStyle({ color: val })
    },
  })

  const highlightColor = computed({
    get: () => {
      if (cText.value) return cText.value.highlightColor || '#fef08a'
      if (isAnnoText.value && selAnno.value) return (selAnno.value as any).highlightColor || '#fef08a'
      return (editor.style.value as any).highlightColor || '#fef08a'
    },
    set: (val: string | null) => {
      if (cText.value) editor.editSelectedContent({ highlightColor: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { highlightColor: val } as any)
      else editor.setStyle({ highlightColor: val } as any)
    },
  })

  const lineRatio = computed({
    get: () => Math.round((cText.value?.lineHeight || (isAnnoText.value ? (selAnno.value as any)?.lineHeight : editor.style.value.lineHeight) || 1.25) * 100),
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ lineHeight: val / 100 })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { lineHeight: val / 100 } as any)
      else editor.setStyle({ lineHeight: val / 100 })
    },
  })

  const letterSpacingPt = computed({
    get: () => cText.value?.letterSpacing || (isAnnoText.value ? (selAnno.value as any)?.letterSpacing : editor.style.value.letterSpacing) || 0,
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ letterSpacing: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { letterSpacing: val } as any)
      else editor.setStyle({ letterSpacing: val })
    },
  })

  const wordSpacingPt = computed({
    get: () => cText.value?.wordSpacing || (isAnnoText.value ? (selAnno.value as any)?.wordSpacing : (editor.style.value as any)?.wordSpacing) || 0,
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ wordSpacing: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { wordSpacing: val } as any)
      else editor.setStyle({ wordSpacing: val } as any)
    },
  })

  const alignMode = computed({
    get: () => cText.value?.align || (isAnnoText.value ? (selAnno.value as any)?.align : (editor.style.value as any)?.align) || 'left',
    set: (val: string) => {
      if (cText.value) editor.editSelectedContent({ align: val as any })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { align: val as any })
      else editor.setStyle({ align: val } as any)
    },
  })

  const currentOpacityPct = computed({
    get: () => Math.round((cEdit.value?.opacity || (selAnno.value && 'opacity' in selAnno.value ? selAnno.value.opacity : editor.style.value.opacity) || 1) * 100),
    set: (val: number) => {
      if (cEdit.value) editor.editSelectedContent({ opacity: val / 100 })
      else if (selAnno.value) editor.updateAnnotation(selAnno.value.id, { opacity: val / 100 } as any)
      else editor.setStyle({ opacity: val / 100 })
    },
  })

  function toggleBold(): void {
    if (cText.value) editor.editSelectedContent({ bold: !cText.value.bold })
    else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { bold: !(selAnno.value as any).bold } as any)
    else editor.setStyle({ bold: !(editor.style.value as any).bold } as any)
  }

  function toggleItalic(): void {
    if (cText.value) editor.editSelectedContent({ italic: !cText.value.italic })
    else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { italic: !(selAnno.value as any).italic } as any)
    else editor.setStyle({ italic: !(editor.style.value as any).italic } as any)
  }

  function toggleUnderline(): void {
    if (cText.value) editor.editSelectedContent({ underline: !cText.value.underline })
    else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { underline: !(selAnno.value as any).underline } as any)
    else editor.setStyle({ underline: !(editor.style.value as any).underline } as any)
  }

  function toggleStrikethrough(): void {
    if (cText.value) editor.editSelectedContent({ strikethrough: !cText.value.strikethrough })
    else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { strikethrough: !(selAnno.value as any).strikethrough } as any)
    else editor.setStyle({ strikethrough: !(editor.style.value as any).strikethrough } as any)
  }

  function toggleSuperscript(): void {
    if (cText.value) editor.editSelectedContent({ superscript: !cText.value.superscript, subscript: false })
    else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { superscript: !(selAnno.value as any).superscript, subscript: false } as any)
    else editor.setStyle({ superscript: !(editor.style.value as any).superscript, subscript: false } as any)
  }

  function toggleSubscript(): void {
    if (cText.value) editor.editSelectedContent({ subscript: !cText.value.subscript, superscript: false })
    else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { subscript: !(selAnno.value as any).subscript, superscript: false } as any)
    else editor.setStyle({ subscript: !(editor.style.value as any).subscript, superscript: false } as any)
  }

  function toggleBullet(kind: 'disc' | 'decimal'): void {
    if (cText.value) {
      const cur = cText.value.bulletStyle
      editor.editSelectedContent({ bulletStyle: cur === kind ? 'none' : kind })
    } else if (isAnnoText.value && selAnno.value) {
      const cur = (selAnno.value as any).bulletStyle
      editor.updateAnnotation(selAnno.value.id, { bulletStyle: cur === kind ? 'none' : kind } as any)
    } else {
      const cur = (editor.style.value as any).bulletStyle
      editor.setStyle({ bulletStyle: cur === kind ? 'none' : kind } as any)
    }
  }

  function changeIndent(delta: number): void {
    if (cText.value) {
      const lvl = Math.max(0, (cText.value.indentLevel || 0) + delta)
      editor.editSelectedContent({ indentLevel: lvl })
    } else if (isAnnoText.value && selAnno.value) {
      const lvl = Math.max(0, ((selAnno.value as any).indentLevel || 0) + delta)
      editor.updateAnnotation(selAnno.value.id, { indentLevel: lvl } as any)
    } else {
      const lvl = Math.max(0, ((editor.style.value as any).indentLevel || 0) + delta)
      editor.setStyle({ indentLevel: lvl } as any)
    }
  }

  function addHyperlink(): void {
    const bounds = cText.value ? boundsOf(cText.value as any) : selAnno.value ? boundsOf(selAnno.value) : null
    const page = cText.value ? cText.value.page : selAnno.value ? selAnno.value.page : editor.currentPage.value
    editor.addAnnotation({
      id: uuid(),
      page,
      type: 'link' as const,
      x: bounds ? bounds.x : 100,
      y: bounds ? bounds.y : 100,
      w: bounds ? bounds.w : 120,
      h: bounds ? bounds.h : 20,
      url: '',
    })
    editor.setTool('select')
    showMore.value = false
  }

  // ─── Stamp presets ───────────────────────────────────────────────────────────
  const stampLabel = computed({
    get: () => (selAnno.value?.type === 'stamp' ? selAnno.value.label : editor.stampPreset.value.label),
    set: (label: string) => {
      const preset = STAMP_PRESETS.find((p) => p.label === label) ?? STAMP_PRESETS[0]
      editor.stampPreset.value = preset
      if (selAnno.value?.type === 'stamp') editor.updateAnnotation(selAnno.value.id, { label: preset.label, color: preset.color })
    },
  })

  const linkUrl = computed({
    get: () => (selAnno.value?.type === 'link' ? selAnno.value.url : ''),
    set: (url: string) => {
      if (selAnno.value?.type === 'link') editor.updateAnnotation(selAnno.value.id, { url }, { record: false })
    },
  })

  const imageOpacityPct = computed({
    get: () => (selAnno.value?.type === 'image' ? Math.round(selAnno.value.opacity * 100) : 100),
    set: (pct: number) => {
      if (selAnno.value?.type === 'image') editor.updateAnnotation(selAnno.value.id, { opacity: pct / 100 })
    },
  })

  function patchField(patch: Partial<FieldAnnotation>): void {
    if (selField.value) editor.updateAnnotation(selField.value.id, patch)
  }

  const fieldOptions = computed({
    get: () => selField.value?.options.join(', ') ?? '',
    set: (raw: string) => patchField({ options: raw.split(',').map((o) => o.trim()).filter(Boolean) }),
  })

  // ─── Classical Styling & Annotations ────────────────────────────────────────
  const showStroke = computed(() => ['ink', 'rect', 'ellipse', 'arrow', 'line'].includes(context.value))
  const showFill = computed(() => ['rect', 'ellipse'].includes(context.value))
  const isStamp = computed(() => context.value === 'stamp')
  const isLink = computed(() => selAnno.value?.type === 'link')
  const isImage = computed(() => selAnno.value?.type === 'image')
  const selField = computed(() =>
    selAnno.value && selAnno.value.type.startsWith('field-') ? (selAnno.value as FieldAnnotation) : null,
  )

  const currentColor = computed<string>({
    get: () => {
      const s = selAnno.value
      if (s) {
        if ('color' in s) return s.color
        if ('stroke' in s) return s.stroke
      }
      return editor.style.value.color
    },
    set: (color: string) => editor.setStyle({ color }),
  })

  const currentStrokeWidth = computed({
    get: () => {
      const s = selAnno.value
      if (s?.type === 'ink') return s.size
      if (s && 'strokeWidth' in s) return s.strokeWidth
      return editor.style.value.strokeWidth
    },
    set: (strokeWidth: number) => editor.setStyle({ strokeWidth }),
  })

  const currentFillColor = computed<string | null>({
    get: () => (selAnno.value && 'fill' in selAnno.value ? selAnno.value.fill : editor.style.value.fill),
    set: (fill: string | null) => editor.setStyle({ fill }),
  })

  function toggleFill(on: boolean): void {
    editor.setStyle({ fill: on ? currentColor.value : null })
  }

  // ─── Context label + accent for the leading chip ─────────────────────────────
  const ctx = computed(() => {
    if (multiCount.value > 1) return { label: `${multiCount.value} selected`, icon: 'box-select', accent: 'indigo' }
    if (hasTextSelection.value) return { label: 'Text', icon: 'type', accent: 'primary' }
    if (isImage.value || cKind.value === 'image') return { label: 'Image', icon: 'image', accent: 'purple' }
    if (selField.value) {
      const map: Record<string, string> = {
        'field-text': 'Text Field', 'field-checkbox': 'Checkbox',
        'field-radio': 'Radio Button', 'field-dropdown': 'Dropdown',
      }
      return { label: map[selField.value.type] ?? 'Form Field', icon: 'form-input', accent: 'success' }
    }
    if (isStamp.value) return { label: 'Stamp', icon: 'stamp', accent: 'warning' }
    if (isLink.value) return { label: 'Hyperlink', icon: 'link', accent: 'info' }
    if (showStroke.value || showFill.value) return { label: 'Shape', icon: 'square', accent: 'indigo' }
    if (editor.activeTool.value === 'table') return { label: 'Table', icon: 'table', accent: 'primary' }
    return { label: 'Document', icon: 'file-text', accent: 'muted' }
  })
</script>

<template>
  <div class="pb">
    <!-- Context chip -->
    <div class="pb__ctx" :class="`pb__ctx--${ctx.accent}`">
      <BaseIcon :name="ctx.icon" :size="14" />
      <span class="pb__ctx-label">{{ ctx.label }}</span>
    </div>

    <span class="pb__div" />

    <!-- ══ MULTI-SELECTION ══ -->
    <template v-if="multiCount > 1">
      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': isLocked }" :title="isLocked ? 'Unlock' : 'Lock'" @click="isLocked ? editor.unlockSelection() : editor.lockSelection()">
          <BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="14" />
        </button>
        <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': isGrouped }" :title="isGrouped ? 'Ungroup' : 'Group'" @click="isGrouped ? editor.ungroupSelection() : editor.groupSelection()">
          <BaseIcon :name="isGrouped ? 'grid' : 'layers'" :size="14" />
        </button>
      </div>

      <span class="pb__div" />

      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" title="Align left" @click="editor.alignSelection('left')"><BaseIcon name="align-obj-left" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Align center" @click="editor.alignSelection('center')"><BaseIcon name="align-obj-center" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Align right" @click="editor.alignSelection('right')"><BaseIcon name="align-obj-right" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Align top" @click="editor.alignSelection('top')"><BaseIcon name="align-obj-top" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Align middle" @click="editor.alignSelection('middle')"><BaseIcon name="align-obj-middle" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Align bottom" @click="editor.alignSelection('bottom')"><BaseIcon name="align-obj-bottom" :size="14" /></button>
      </div>

      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" title="Distribute horizontally" @click="editor.distributeSelection('h')"><BaseIcon name="distribute-h" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Distribute vertically" @click="editor.distributeSelection('v')"><BaseIcon name="distribute-v" :size="14" /></button>
      </div>

      <span class="pb__div" />
      <button type="button" class="pb__del" title="Delete selection" @click="editor.removeSelectedAnnotations()"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ TEXT ══ -->
    <template v-else-if="hasTextSelection">
      <!-- Font -->
      <FontPicker v-model="currentFontFamily" :document-fonts="editor.documentFonts.value" />
      <FontSizeField v-model="currentFontSize" />

      <span class="pb__div" />

      <!-- Style -->
      <div class="pb__seg">
        <button type="button" class="pb__seg-btn pb__seg-btn--txt" :class="{ 'pb__seg-btn--on': cText?.bold || (isAnnoText && (selAnno as any)?.bold) }" title="Bold (Ctrl+B)" @click="toggleBold"><span class="font-bold">B</span></button>
        <button type="button" class="pb__seg-btn pb__seg-btn--txt" :class="{ 'pb__seg-btn--on': cText?.italic || (isAnnoText && (selAnno as any)?.italic) }" title="Italic (Ctrl+I)" @click="toggleItalic"><span class="italic font-serif">I</span></button>
        <button type="button" class="pb__seg-btn pb__seg-btn--txt" :class="{ 'pb__seg-btn--on': cText?.underline || (isAnnoText && (selAnno as any)?.underline) }" title="Underline (Ctrl+U)" @click="toggleUnderline"><span class="underline">U</span></button>
        <button type="button" class="pb__seg-btn pb__seg-btn--txt" :class="{ 'pb__seg-btn--on': cText?.strikethrough || (isAnnoText && (selAnno as any)?.strikethrough) }" title="Strikethrough" @click="toggleStrikethrough"><span class="line-through">S</span></button>
      </div>

      <!-- Colours -->
      <div class="pb__swatches">
        <BaseColorPicker v-model="textColor" swatch-only label="Text colour" />
        <BaseColorPicker v-model="highlightColor" swatch-only label="Highlight colour" />
      </div>

      <span class="pb__div" />

      <!-- Alignment -->
      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': alignMode === 'left' }" title="Align left" @click="alignMode = 'left'"><BaseIcon name="align-left" :size="14" /></button>
        <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': alignMode === 'center' }" title="Align center" @click="alignMode = 'center'"><BaseIcon name="align-center" :size="14" /></button>
        <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': alignMode === 'right' }" title="Align right" @click="alignMode = 'right'"><BaseIcon name="align-right" :size="14" /></button>
        <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': alignMode === 'justify' }" title="Justify" @click="alignMode = 'justify'"><BaseIcon name="align-justify" :size="14" /></button>
      </div>

      <span class="pb__div" />

      <!-- More (advanced) -->
      <button ref="moreBtn" type="button" class="pb__more-btn" :class="{ 'pb__more-btn--on': showMore }" title="More text options" @click.stop="toggleMore">
        <BaseIcon name="dots" :size="15" />
        <span class="pb__more-label">More</span>
      </button>

      <Teleport to="body">
        <transition name="pb-pop">
          <div v-if="showMore" ref="popEl" class="pb__pop" role="menu" :style="popStyle">
            <div class="pb__pop-group">
              <span class="pb__pop-label">Script</span>
              <div class="pb__seg">
                <button type="button" class="pb__seg-btn pb__seg-btn--txt" :class="{ 'pb__seg-btn--on': cText?.superscript || (isAnnoText && (selAnno as any)?.superscript) }" title="Superscript" @click="toggleSuperscript">x²</button>
                <button type="button" class="pb__seg-btn pb__seg-btn--txt" :class="{ 'pb__seg-btn--on': cText?.subscript || (isAnnoText && (selAnno as any)?.subscript) }" title="Subscript" @click="toggleSubscript">x₂</button>
              </div>
            </div>

            <div class="pb__pop-group">
              <span class="pb__pop-label">Lists &amp; indent</span>
              <div class="pb__seg">
                <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': cText?.bulletStyle === 'disc' || (selAnno as any)?.bulletStyle === 'disc' }" title="Bulleted list" @click="toggleBullet('disc')"><BaseIcon name="list" :size="14" /></button>
                <button type="button" class="pb__seg-btn" :class="{ 'pb__seg-btn--on': cText?.bulletStyle === 'decimal' || (selAnno as any)?.bulletStyle === 'decimal' }" title="Numbered list" @click="toggleBullet('decimal')"><BaseIcon name="list-ordered" :size="14" /></button>
              </div>
              <div class="pb__seg">
                <button type="button" class="pb__seg-btn" title="Decrease indent" @click="changeIndent(-1)"><BaseIcon name="indent-decrease" :size="14" /></button>
                <button type="button" class="pb__seg-btn" title="Increase indent" @click="changeIndent(1)"><BaseIcon name="indent-increase" :size="14" /></button>
              </div>
            </div>

            <div class="pb__pop-group pb__pop-group--col">
              <span class="pb__pop-label">Spacing</span>
              <div class="pb__pop-row">
                <label class="pb__pop-field"><span>Line</span>
                  <select v-model.number="lineRatio" class="pb__select pb__select--wide" aria-label="Line spacing">
                    <option v-for="lh in [100, 115, 125, 150, 200, 250, 300]" :key="lh" :value="lh">{{ (lh / 100).toFixed(2) }}</option>
                  </select>
                </label>
              </div>
              <div class="pb__pop-row">
                <label class="pb__pop-field"><span>Character</span>
                  <select v-model.number="letterSpacingPt" class="pb__select pb__select--wide" aria-label="Character spacing">
                    <option v-for="ls in [-2, -1, 0, 1, 2, 3, 4, 5, 8, 12, 16]" :key="ls" :value="ls">{{ ls }}</option>
                  </select>
                </label>
                <label class="pb__pop-field"><span>Word</span>
                  <select v-model.number="wordSpacingPt" class="pb__select pb__select--wide" aria-label="Word spacing">
                    <option v-for="ws in [-2, -1, 0, 1, 2, 3, 4, 5, 8, 12, 16]" :key="ws" :value="ws">{{ ws }}</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="pb__pop-group pb__pop-group--actions">
              <button type="button" class="pb__pop-action" title="Add hyperlink" @click="addHyperlink"><BaseIcon name="link" :size="14" /> Hyperlink</button>
              <button type="button" class="pb__pop-action" :class="{ 'pb__pop-action--on': editor.formatPainterActive.value }" title="Format painter" @click="editor.toggleFormatPainter()"><BaseIcon name="format-painter" :size="14" /> Format painter</button>
              <button type="button" class="pb__pop-action" title="Clear formatting" @click="editor.clearFormatting()"><BaseIcon name="clear-formatting" :size="14" /> Clear formatting</button>
            </div>
          </div>
        </transition>
      </Teleport>

      <div class="pb__spacer" />
      <button type="button" class="pb__panel" title="Open Properties panel" @click="openPanel"><BaseIcon name="settings" :size="14" /><span class="pb__panel-label">Panel</span></button>
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ IMAGE ══ -->
    <template v-else-if="isImage || cKind === 'image'">
      <label class="pb__field"><span>Opacity</span><NumberStepper v-model="imageOpacityPct" :min="10" :max="100" :step="5" unit="%" label="Image opacity" /></label>
      <span class="pb__div" />
      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" title="Flip horizontally" @click="selAnno && editor.flipImage(selAnno.id, 'h')"><BaseIcon name="flip-h" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Flip vertically" @click="selAnno && editor.flipImage(selAnno.id, 'v')"><BaseIcon name="flip-v" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Reset rotation" @click="selAnno && editor.updateAnnotation(selAnno.id, { rotation: 0 })"><BaseIcon name="rotate-ccw" :size="14" /></button>
      </div>
      <span class="pb__div" />
      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" title="Bring to front" @click="editor.reorderSelection('front')"><BaseIcon name="bring-front" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Send to back" @click="editor.reorderSelection('back')"><BaseIcon name="send-back" :size="14" /></button>
      </div>
      <span class="pb__div" />
      <button type="button" class="pb__btn" :class="{ 'pb__btn--on': isLocked }" :title="isLocked ? 'Unlock' : 'Lock'" @click="isLocked ? editor.unlockSelection() : editor.lockSelection()"><BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="14" /></button>
      <button type="button" class="pb__del" title="Delete image" @click="editor.removeSelectedAnnotations()"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__panel" title="Open Properties panel" @click="openPanel"><BaseIcon name="settings" :size="14" /><span class="pb__panel-label">Panel</span></button>
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ SHAPE ══ -->
    <template v-else-if="showStroke || showFill">
      <label class="pb__field"><span>Stroke</span><BaseColorPicker v-model="currentColor" swatch-only label="Stroke colour" /></label>
      <label v-if="showStroke" class="pb__field"><span>Width</span><NumberStepper v-model="currentStrokeWidth" :min="1" :max="20" :step="1" unit="px" label="Stroke width" /></label>
      <span class="pb__div" />
      <label class="pb__check"><input type="checkbox" :checked="currentFillColor !== null" @change="toggleFill(($event.target as HTMLInputElement).checked)" /> Fill</label>
      <BaseColorPicker v-if="currentFillColor !== null" v-model="currentFillColor" swatch-only label="Fill colour" />
      <span class="pb__div" />
      <label class="pb__field"><span>Opacity</span><NumberStepper v-model="currentOpacityPct" :min="10" :max="100" :step="5" unit="%" label="Opacity" /></label>
      <div class="pb__seg">
        <button type="button" class="pb__seg-btn" title="Bring to front" @click="editor.reorderSelection('front')"><BaseIcon name="bring-front" :size="14" /></button>
        <button type="button" class="pb__seg-btn" title="Send to back" @click="editor.reorderSelection('back')"><BaseIcon name="send-back" :size="14" /></button>
      </div>
      <span class="pb__div" />
      <button type="button" class="pb__btn" :class="{ 'pb__btn--on': isLocked }" :title="isLocked ? 'Unlock' : 'Lock'" @click="isLocked ? editor.unlockSelection() : editor.lockSelection()"><BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="14" /></button>
      <button type="button" class="pb__del" title="Delete shape" @click="editor.removeSelectedAnnotations()"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__panel" title="Open Properties panel" @click="openPanel"><BaseIcon name="settings" :size="14" /><span class="pb__panel-label">Panel</span></button>
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ TABLE (mock) ══ -->
    <template v-else-if="editor.activeTool.value === 'table'">
      <label class="pb__field"><span>Rows</span><NumberStepper v-model="tableRows" :min="1" :max="50" :step="1" label="Rows" /></label>
      <label class="pb__field"><span>Cols</span><NumberStepper v-model="tableCols" :min="1" :max="50" :step="1" label="Columns" /></label>
      <label class="pb__check"><input v-model="tableHeader" type="checkbox" /> Header</label>
      <label class="pb__check"><input v-model="tableZebra" type="checkbox" /> Zebra</label>
      <span class="pb__div" />
      <label class="pb__field"><span>Border</span><BaseColorPicker v-model="tableBorderColor" swatch-only label="Border colour" /></label>
      <NumberStepper v-model="tableBorderWidth" :min="0" :max="10" :step="1" unit="px" label="Border width" />
      <label class="pb__field"><span>Fill</span><BaseColorPicker v-model="tableBgColor" swatch-only label="Background colour" /></label>
      <span class="pb__div" />
      <button type="button" class="pb__del" title="Delete table" @click="deleteTable"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__panel" title="Open Properties panel" @click="openPanel"><BaseIcon name="settings" :size="14" /><span class="pb__panel-label">Panel</span></button>
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ STAMP ══ -->
    <template v-else-if="isStamp">
      <label class="pb__field"><span>Preset</span>
        <select v-model="stampLabel" class="pb__select pb__select--wide" aria-label="Stamp preset">
          <option v-for="p in STAMP_PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
        </select>
      </label>
      <span class="pb__div" />
      <button type="button" class="pb__del" title="Delete stamp" @click="editor.removeSelectedAnnotations()"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ LINK ══ -->
    <template v-else-if="isLink">
      <label class="pb__field pb__field--grow"><span>URL</span>
        <input v-model="linkUrl" class="pb__input pb__input--link" type="url" placeholder="https://example.com" aria-label="Link URL" @blur="editor.pushHistory(editor.snapshot())" />
      </label>
      <span class="pb__div" />
      <button type="button" class="pb__del" title="Delete link" @click="editor.removeSelectedAnnotations()"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ FORM FIELD ══ -->
    <template v-else-if="selField">
      <label class="pb__field"><span>Name</span>
        <input class="pb__input" style="width: 120px;" :value="selField.name" placeholder="Field name" aria-label="Field name" @change="patchField({ name: ($event.target as HTMLInputElement).value })" />
      </label>
      <label v-if="selField.type === 'field-dropdown' || selField.type === 'field-radio'" class="pb__field pb__field--grow"><span>Options</span>
        <input v-model="fieldOptions" class="pb__input" style="min-width: 180px;" :placeholder="selField.type === 'field-radio' ? 'Yes' : 'Option 1, Option 2'" aria-label="Field options" />
      </label>
      <label v-else-if="selField.type === 'field-text'" class="pb__field pb__field--grow"><span>Default</span>
        <input class="pb__input" style="min-width: 180px;" :value="selField.value" placeholder="Default value" aria-label="Default value" @change="patchField({ value: ($event.target as HTMLInputElement).value })" />
      </label>
      <label v-else-if="selField.type === 'field-checkbox'" class="pb__check">
        <input type="checkbox" :checked="selField.value === 'checked'" @change="patchField({ value: ($event.target as HTMLInputElement).checked ? 'checked' : '' })" /> Checked by default
      </label>
      <span class="pb__div" />
      <button type="button" class="pb__del" title="Delete field" @click="editor.removeSelectedAnnotations()"><BaseIcon name="trash" :size="14" /> Delete</button>

      <div class="pb__spacer" />
      <button type="button" class="pb__panel" title="Open Properties panel" @click="openPanel"><BaseIcon name="settings" :size="14" /><span class="pb__panel-label">Panel</span></button>
      <button type="button" class="pb__close" title="Clear selection" @click="editor.clearAllSelection()"><BaseIcon name="x" :size="15" /></button>
    </template>

    <!-- ══ IDLE / DOCUMENT ══ -->
    <template v-else>
      <div class="pb__info">
        <span class="pb__info-item" :title="editor.fileName.value">File: <strong>{{ editor.fileName.value }}</strong></span>
        <span class="pb__div" />
        <span class="pb__info-item">Pages: <strong>{{ editor.pageCount.value || 0 }}</strong></span>
        <template v-if="editor.metadata.value?.title">
          <span class="pb__div" />
          <span class="pb__info-item" :title="editor.metadata.value.title">Title: <strong>{{ editor.metadata.value.title }}</strong></span>
        </template>
      </div>
      <span class="pb__hint"><BaseIcon name="info" :size="13" /> Select a tool or object to see its properties here.</span>

      <div class="pb__spacer" />
      <button type="button" class="pb__panel" title="Open Properties panel" @click="openPanel"><BaseIcon name="settings" :size="14" /><span class="pb__panel-label">Panel</span></button>
    </template>
  </div>
</template>

<style scoped>
  .pb {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    height: 52px;
    min-height: 52px;
    max-height: 52px;
    background: hsl(var(--color-surface-muted));
    border-bottom: 1px solid hsl(var(--color-border));
    flex: none;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }
  .pb::-webkit-scrollbar { display: none; }

  /* ── Context chip ─────────────────────────────────────────────────────── */
  .pb__ctx {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    flex: none;
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-muted));
  }
  .pb__ctx-label { line-height: 1; }
  .pb__ctx--primary { background: hsl(var(--color-primary) / 0.12); color: hsl(var(--color-primary)); }
  .pb__ctx--indigo  { background: hsl(var(--color-indigo) / 0.12);  color: hsl(var(--color-indigo)); }
  .pb__ctx--purple  { background: hsl(var(--color-purple) / 0.12);  color: hsl(var(--color-purple)); }
  .pb__ctx--success { background: hsl(var(--color-success) / 0.12); color: hsl(var(--color-success)); }
  .pb__ctx--warning { background: hsl(var(--color-warning) / 0.14); color: hsl(var(--color-warning)); }
  .pb__ctx--info    { background: hsl(var(--color-info) / 0.12);    color: hsl(var(--color-info)); }

  /* ── Divider (whitespace comes from parent gap) ───────────────────────── */
  .pb__div {
    width: 1px;
    height: 22px;
    background: hsl(var(--color-border));
    flex: none;
  }

  /* ── Selects ──────────────────────────────────────────────────────────── */
  .pb__select {
    height: 30px;
    padding: 0 24px 0 9px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface)) url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") no-repeat right 5px center;
    background-size: 14px 14px;
    appearance: none;
    -webkit-appearance: none;
    color: hsl(var(--color-text));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    flex: none;
    transition: border-color 0.15s;
  }
  .pb__select:hover { border-color: hsl(var(--color-border-strong)); }
  .pb__select:focus { border-color: hsl(var(--color-primary)); }
  .pb__select--wide { width: 78px; }

  /* ── Segmented control ────────────────────────────────────────────────── */
  .pb__seg {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    flex: none;
  }
  .pb__seg--attached { padding: 2px; }
  .pb__seg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 24px;
    padding: 0 5px;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: hsl(var(--color-text-muted));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .pb__seg-btn--txt { font-family: inherit; }
  .pb__seg-btn:hover { background: hsl(var(--color-chip)); color: hsl(var(--color-text)); }
  .pb__seg-btn--on {
    background: hsl(var(--color-primary) / 0.14);
    color: hsl(var(--color-primary));
    box-shadow: inset 0 0 0 1px hsl(var(--color-primary) / 0.25);
  }

  /* ── Standalone icon button ───────────────────────────────────────────── */
  .pb__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    flex: none;
    transition: all 0.15s ease;
  }
  .pb__btn:hover { background: hsl(var(--color-chip)); color: hsl(var(--color-text)); }
  .pb__btn--on { background: hsl(var(--color-primary) / 0.12); border-color: hsl(var(--color-primary) / 0.4); color: hsl(var(--color-primary)); }

  /* ── Swatches, fields, checks ─────────────────────────────────────────── */
  .pb__swatches { display: inline-flex; align-items: center; gap: 4px; flex: none; }

  .pb__field {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: hsl(var(--color-text-faint));
    white-space: nowrap;
  }
  .pb__field--grow { flex: 1; min-width: 120px; }

  .pb__check {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    white-space: nowrap;
    flex: none;
    user-select: none;
  }
  .pb__check input { accent-color: hsl(var(--color-primary)); }

  .pb__input {
    height: 30px;
    padding: 0 9px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 12px;
    font-weight: 500;
    outline: none;
  }
  .pb__input:focus { border-color: hsl(var(--color-primary)); }
  .pb__input--link { width: 100%; max-width: 320px; }

  /* ── Delete ───────────────────────────────────────────────────────────── */
  .pb__del {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 11px;
    border: 1px solid hsl(var(--color-danger) / 0.3);
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.08);
    color: hsl(var(--color-danger));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex: none;
    transition: background 0.15s;
  }
  .pb__del:hover { background: hsl(var(--color-danger) / 0.16); }

  /* ── More popover ─────────────────────────────────────────────────────── */
  .pb__more-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 11px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pb__more-btn:hover, .pb__more-btn--on {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
    border-color: hsl(var(--color-border-strong));
  }
  .pb__pop {
    position: fixed;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 268px;
    padding: 14px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
  }
  .pb__pop-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .pb__pop-group--col { flex-direction: column; align-items: stretch; gap: 6px; }
  .pb__pop-group--actions { flex-direction: column; align-items: stretch; gap: 4px; padding-top: 10px; border-top: 1px solid hsl(var(--color-border) / 0.6); }
  .pb__pop-label {
    width: 88px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--color-text-faint));
  }
  .pb__pop-group--col .pb__pop-label { width: auto; }
  .pb__pop-row { display: flex; gap: 10px; }
  .pb__pop-field { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: hsl(var(--color-text-muted)); }
  .pb__pop-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text));
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .pb__pop-action:hover { background: hsl(var(--color-chip)); }
  .pb__pop-action--on { background: hsl(var(--color-primary) / 0.12); color: hsl(var(--color-primary)); }

  .pb-pop-enter-active, .pb-pop-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
  .pb-pop-enter-from, .pb-pop-leave-to { opacity: 0; transform: translateY(-4px); }

  /* ── Info / idle ──────────────────────────────────────────────────────── */
  .pb__info { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: hsl(var(--color-text-muted)); min-width: 0; }
  .pb__info-item { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
  .pb__info-item strong { color: hsl(var(--color-text)); }
  .pb__hint { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: hsl(var(--color-text-faint)); white-space: nowrap; }

  /* ── Right-side actions ───────────────────────────────────────────────── */
  .pb__spacer { flex: 1; min-width: 8px; }
  .pb__panel {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 11px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    flex: none;
    transition: all 0.15s ease;
  }
  .pb__panel:hover { background: hsl(var(--color-chip)); color: hsl(var(--color-text)); border-color: hsl(var(--color-border-strong)); }
  .pb__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: var(--radius-md);
    background: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    flex: none;
    transition: all 0.15s ease;
  }
  .pb__close:hover { background: hsl(var(--color-chip)); color: hsl(var(--color-text)); }

  @media (max-width: 900px) {
    .pb__panel-label, .pb__more-label { display: none; }
  }
</style>
