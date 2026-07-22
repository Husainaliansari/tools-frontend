<script setup lang="ts">
  /**
   * PropertiesSidebar — vertical context-sensitive sidebar.
   * Mirrors professional PDF editors (Foxit, Acrobat) with collapsible sections,
   * generous padding, responsive sizing, and zero canvas layout shifting.
   */
  import { computed, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseColorPicker from '@components/ui/BaseColorPicker.vue'
  import NumberStepper from '@components/ui/NumberStepper.vue'
  import FontPicker from './FontPicker.vue'
  import FontSizeField from './FontSizeField.vue'
  import { useEditor } from './useEditor'
  import { STAMP_PRESETS, boundsOf, type FieldAnnotation, type ToolId } from '@/lib/pdf'
  import { uuid } from '@utils'

  const editor = useEditor()

  // ─── Selection Detection ───────────────────────────────────────────────────
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

  const selAnno = computed(() => editor.selected.value)
  const isAnnoText = computed(() => selAnno.value?.type === 'text')
  const multiCount = computed(() => editor.selectedIds.value.length + editor.selectedContentIds.value.length)

  // ─── Active context detectors ──────────────────────────────────────────────
  const hasTextSelection = computed(() => !!cText.value || isAnnoText.value || editor.editMode.value === 'text' || editor.activeTool.value === 'text')
  const isStamp = computed(() => context.value === 'stamp')
  const isLink = computed(() => selAnno.value?.type === 'link')
  const isImage = computed(() => selAnno.value?.type === 'image')
  const selField = computed(() =>
    selAnno.value && selAnno.value.type.startsWith('field-') ? (selAnno.value as FieldAnnotation) : null
  )

  const showStroke = computed(() =>
    ['ink', 'rect', 'ellipse', 'arrow', 'line'].includes(context.value)
  )
  const showFill = computed(() => ['rect', 'ellipse'].includes(context.value))

  const context = computed<ToolId>(() => {
    if (editor.selectedContentId.value) return 'text'
    if (selAnno.value) return selAnno.value.type
    return editor.activeTool.value
  })

  // ─── Sidebar Context Heading ───────────────────────────────────────────────
  const sidebarTitle = computed(() => {
    if (multiCount.value > 1) return 'Multiple Properties'
    if (hasTextSelection.value) return 'Text Properties'
    if (isImage.value || cKind.value === 'image') return 'Image Properties'
    if (selField.value) return 'Field Properties'
    if (isStamp.value) return 'Stamp Properties'
    if (isLink.value) return 'Link Properties'
    if (showStroke.value || showFill.value) return 'Shape Properties'
    if (editor.activeTool.value === 'table') return 'Table Properties'
    return 'Document Properties'
  })

  // ─── Accordion Section Expansion Ref ───────────────────────────────────────
  const openSections = ref({
    font: true,
    paragraph: true,
    spacing: true,
    bullets: false,
    effects: false,
    link: false,
    table: true,
    field: true,
    advanced: false,
  })

  // ─── Font Properties Setup ───────────────────────────────────────────────────
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

  const currentFontWeight = computed({
    get: () => cText.value?.fontWeight || (isAnnoText.value ? (selAnno.value as any)?.fontWeight : (editor.style.value as any)?.fontWeight) || (cText.value?.bold || (isAnnoText.value && (selAnno.value as any)?.bold) ? 700 : 400),
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ fontWeight: val, bold: val >= 600 })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { fontWeight: val, bold: val >= 600 } as any)
      else editor.setStyle({ fontWeight: val } as any)
    },
  })


  const textColor = computed({
    get: () => {
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

  const paraBeforePt = computed({
    get: () => cText.value?.paragraphSpacingBefore || cText.value?.paragraphSpacing || (isAnnoText.value ? (selAnno.value as any)?.paragraphSpacingBefore : (editor.style.value as any)?.paragraphSpacingBefore) || 0,
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ paragraphSpacingBefore: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { paragraphSpacingBefore: val } as any)
      else editor.setStyle({ paragraphSpacingBefore: val } as any)
    },
  })

  const paraAfterPt = computed({
    get: () => cText.value?.paragraphSpacingAfter || (isAnnoText.value ? (selAnno.value as any)?.paragraphSpacingAfter : (editor.style.value as any)?.paragraphSpacingAfter) || 0,
    set: (val: number) => {
      if (cText.value) editor.editSelectedContent({ paragraphSpacingAfter: val })
      else if (isAnnoText.value && selAnno.value) editor.updateAnnotation(selAnno.value.id, { paragraphSpacingAfter: val } as any)
      else editor.setStyle({ paragraphSpacingAfter: val } as any)
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

  // ─── Actions & Modifiers ───────────────────────────────────────────────────
  function toggleBold(): void {
    if (cText.value) {
      editor.editSelectedContent({ bold: !cText.value.bold })
    } else if (isAnnoText.value && selAnno.value) {
      editor.updateAnnotation(selAnno.value.id, { bold: !(selAnno.value as any).bold } as any)
    } else {
      editor.setStyle({ bold: !(editor.style.value as any).bold } as any)
    }
  }

  function toggleItalic(): void {
    if (cText.value) {
      editor.editSelectedContent({ italic: !cText.value.italic })
    } else if (isAnnoText.value && selAnno.value) {
      editor.updateAnnotation(selAnno.value.id, { italic: !(selAnno.value as any).italic } as any)
    } else {
      editor.setStyle({ italic: !(editor.style.value as any).italic } as any)
    }
  }

  function toggleUnderline(): void {
    if (cText.value) {
      editor.editSelectedContent({ underline: !cText.value.underline })
    } else if (isAnnoText.value && selAnno.value) {
      editor.updateAnnotation(selAnno.value.id, { underline: !(selAnno.value as any).underline } as any)
    } else {
      editor.setStyle({ underline: !(editor.style.value as any).underline } as any)
    }
  }

  function toggleStrikethrough(): void {
    if (cText.value) {
      editor.editSelectedContent({ strikethrough: !cText.value.strikethrough })
    } else if (isAnnoText.value && selAnno.value) {
      editor.updateAnnotation(selAnno.value.id, { strikethrough: !(selAnno.value as any).strikethrough } as any)
    } else {
      editor.setStyle({ strikethrough: !(editor.style.value as any).strikethrough } as any)
    }
  }

  function toggleSuperscript(): void {
    if (cText.value) {
      editor.editSelectedContent({ superscript: !cText.value.superscript, subscript: false })
    } else if (isAnnoText.value && selAnno.value) {
      editor.updateAnnotation(selAnno.value.id, { superscript: !(selAnno.value as any).superscript, subscript: false } as any)
    } else {
      editor.setStyle({ superscript: !(editor.style.value as any).superscript, subscript: false } as any)
    }
  }

  function toggleSubscript(): void {
    if (cText.value) {
      editor.editSelectedContent({ subscript: !cText.value.subscript, superscript: false })
    } else if (isAnnoText.value && selAnno.value) {
      editor.updateAnnotation(selAnno.value.id, { subscript: !(selAnno.value as any).subscript, superscript: false } as any)
    } else {
      editor.setStyle({ subscript: !(editor.style.value as any).subscript, superscript: false } as any)
    }
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

    const newLink = {
      id: uuid(),
      page,
      type: 'link' as const,
      x: bounds ? bounds.x : 100,
      y: bounds ? bounds.y : 100,
      w: bounds ? bounds.w : 120,
      h: bounds ? bounds.h : 20,
      url: '',
    }
    editor.addAnnotation(newLink)
  }

  // ─── Classical Styling & Annotations ────────────────────────────────────────
  const currentColor = computed<string>({
    get: () => {
      const s = selAnno.value
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

  const currentStrokeWidth = computed({
    get: () => {
      const s = selAnno.value
      if (s?.type === 'ink') return s.size
      if (s && 'strokeWidth' in s) return s.strokeWidth
      return editor.style.value.strokeWidth
    },
    set: (strokeWidth: number) => {
      editor.setStyle({ strokeWidth })
    },
  })

  const currentFillColor = computed<string | null>({
    get: () => (selAnno.value && 'fill' in selAnno.value ? selAnno.value.fill : editor.style.value.fill),
    set: (fill: string | null) => {
      editor.setStyle({ fill })
    },
  })

  function toggleFill(on: boolean): void {
    editor.setStyle({ fill: on ? currentColor.value : null })
  }

  const currentOpacityPct = computed({
    get: () => Math.round((cEdit.value?.opacity || (selAnno.value && 'opacity' in selAnno.value ? selAnno.value.opacity : editor.style.value.opacity) || 1) * 100),
    set: (val: number) => {
      if (cEdit.value) editor.editSelectedContent({ opacity: val / 100 })
      else if (selAnno.value) editor.updateAnnotation(selAnno.value.id, { opacity: val / 100 } as any)
      else editor.setStyle({ opacity: val / 100 })
    },
  })

  const imageOpacityPct = computed({
    get: () => (selAnno.value?.type === 'image' ? Math.round(selAnno.value.opacity * 100) : 100),
    set: (pct: number) => {
      if (selAnno.value?.type === 'image') editor.updateAnnotation(selAnno.value.id, { opacity: pct / 100 })
    },
  })

  const stampLabel = computed({
    get: () => (selAnno.value?.type === 'stamp' ? selAnno.value.label : editor.stampPreset.value.label),
    set: (label: string) => {
      const preset = STAMP_PRESETS.find((p) => p.label === label) ?? STAMP_PRESETS[0]
      editor.stampPreset.value = preset
      if (selAnno.value?.type === 'stamp') {
        editor.updateAnnotation(selAnno.value.id, { label: preset.label, color: preset.color })
      }
    },
  })

  const linkUrl = computed({
    get: () => (selAnno.value?.type === 'link' ? selAnno.value.url : ''),
    set: (url: string) => {
      if (selAnno.value?.type === 'link') editor.updateAnnotation(selAnno.value.id, { url }, { record: false })
    },
  })

  // ─── Forms / Fields ──────────────────────────────────────────────────────────
  function patchField(patch: Partial<FieldAnnotation>): void {
    if (selField.value) editor.updateAnnotation(selField.value.id, patch)
  }

  const fieldOptions = computed({
    get: () => selField.value?.options.join(', ') ?? '',
    set: (raw: string) =>
      patchField({ options: raw.split(',').map((o) => o.trim()).filter(Boolean) }),
  })

  // ─── Mock Table State ────────────────────────────────────────────────────────
  const tableRows = ref(3)
  const tableCols = ref(3)
  const tableZebra = ref(false)
  const tableHeader = ref(true)
  const tableBorderWidth = ref(1)
  const tableBorderColor = ref('#cccccc')
  const tableBgColor = ref('#ffffff')
  const tablePadding = ref(6)

  function deleteTable(): void {
    editor.setTool('select')
  }

  // ─── Arranging lock state ──────────────────────────────────────────────────
  const isLocked = computed(() => {
    const ids = editor.selectedIds.value
    if (!ids.length) return false
    return ids.every((id) => editor.annotations.value.find((a) => a.id === id)?.locked)
  })

  const isGrouped = computed(() => {
    // True if more than 1 item selected
    return editor.selectedIds.value.length > 1
  })
</script>

<template>
  <div class="props-sidebar">
    <!-- Sidebar Header -->
    <div class="props-sidebar__header">
      <span class="props-sidebar__title">{{ sidebarTitle }}</span>
      <button
        type="button"
        class="props-sidebar__close"
        title="Collapse panel"
        @click="editor.rightOpen.value = false"
      >
        <BaseIcon name="x" :size="15" />
      </button>
    </div>

    <!-- Sidebar Scrollable Accordion Content -->
    <div class="props-sidebar__body">
      <!-- 1. MULTI-SELECTION PROPERTIES -->
      <template v-if="multiCount > 1">
        <!-- Arrange Group -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.advanced = !openSections.advanced">
            <span>Arrange & Group</span>
            <BaseIcon :name="openSections.advanced ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.advanced" class="props-sidebar__acc-body">
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" :class="{ 'props-sidebar__wbtn--on': isLocked }" @click="isLocked ? editor.unlockSelection() : editor.lockSelection()">
                <BaseIcon :name="isLocked ? 'lock' : 'unlock'" :size="13" />
                <span>{{ isLocked ? 'Unlock Selection' : 'Lock Selection' }}</span>
              </button>
            </div>
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" :class="{ 'props-sidebar__wbtn--on': isGrouped }" @click="isGrouped ? editor.ungroupSelection() : editor.groupSelection()">
                <BaseIcon :name="isGrouped ? 'grid' : 'layers'" :size="13" />
                <span>{{ isGrouped ? 'Ungroup Items' : 'Group Items' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Align & Distribute Group -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.advanced = !openSections.advanced">
            <span>Align Objects</span>
            <BaseIcon :name="openSections.advanced ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.advanced" class="props-sidebar__acc-body">
            <div class="props-sidebar__grid props-sidebar__grid--3cols">
              <button type="button" class="props-sidebar__wbtn" title="Align Left" @click="editor.alignSelection('left')">
                <BaseIcon name="align-obj-left" :size="14" />
              </button>
              <button type="button" class="props-sidebar__wbtn" title="Align Center" @click="editor.alignSelection('center')">
                <BaseIcon name="align-obj-center" :size="14" />
              </button>
              <button type="button" class="props-sidebar__wbtn" title="Align Right" @click="editor.alignSelection('right')">
                <BaseIcon name="align-obj-right" :size="14" />
              </button>
              <button type="button" class="props-sidebar__wbtn" title="Align Top" @click="editor.alignSelection('top')">
                <BaseIcon name="align-obj-top" :size="14" />
              </button>
              <button type="button" class="props-sidebar__wbtn" title="Align Middle" @click="editor.alignSelection('middle')">
                <BaseIcon name="align-obj-middle" :size="14" />
              </button>
              <button type="button" class="props-sidebar__wbtn" title="Align Bottom" @click="editor.alignSelection('bottom')">
                <BaseIcon name="align-obj-bottom" :size="14" />
              </button>
            </div>
            <div class="props-sidebar__divider-h" />
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" @click="editor.distributeSelection('h')">
                <BaseIcon name="distribute-h" :size="13" />
                <span>Distribute Horizontally</span>
              </button>
            </div>
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" @click="editor.distributeSelection('v')">
                <BaseIcon name="distribute-v" :size="13" />
                <span>Distribute Vertically</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 2. TEXT PROPERTIES (TEXT TOOL OR ELEMENT ACTIVE) -->
      <template v-else-if="hasTextSelection">
        <!-- Font Section -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.font = !openSections.font">
            <span>Font</span>
            <BaseIcon :name="openSections.font ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.font" class="props-sidebar__acc-body">
            <!-- Family row -->
            <div class="props-sidebar__row">
              <FontPicker v-model="currentFontFamily" :document-fonts="editor.documentFonts.value" block />
            </div>
            <!-- Size row -->
            <div class="props-sidebar__row">
              <FontSizeField v-model="currentFontSize" />
            </div>

            <!-- Weight dropdown -->
            <div class="props-sidebar__row">
              <select v-model.number="currentFontWeight" class="props-sidebar__select props-sidebar__select--grow" title="Font Weight" aria-label="Font weight">
                <option :value="100">100 Thin</option>
                <option :value="300">300 Light</option>
                <option :value="400">400 Regular</option>
                <option :value="500">500 Medium</option>
                <option :value="700">700 Bold</option>
                <option :value="900">900 Black</option>
              </select>

              <!-- Color picker triggers -->
              <BaseColorPicker v-model="textColor" swatch-only label="Text color" />
              <BaseColorPicker v-model="highlightColor" swatch-only label="Highlight color" />
            </div>

            <!-- Bold / Italic style buttons -->
            <div class="props-sidebar__row">
              <div class="props-sidebar__btn-group props-sidebar__btn-group--grow">
                <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style" :class="{ 'props-sidebar__wbtn--on': cText?.bold || (isAnnoText && (selAnno as any)?.bold) }" title="Bold (Ctrl+B)" @click="toggleBold">
                  <span class="font-bold">B</span>
                </button>
                <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style" :class="{ 'props-sidebar__wbtn--on': cText?.italic || (isAnnoText && (selAnno as any)?.italic) }" title="Italic (Ctrl+I)" @click="toggleItalic">
                  <span class="italic font-serif">I</span>
                </button>
                <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style" :class="{ 'props-sidebar__wbtn--on': cText?.underline || (isAnnoText && (selAnno as any)?.underline) }" title="Underline" @click="toggleUnderline">
                  <span class="underline">U</span>
                </button>
                <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style" :class="{ 'props-sidebar__wbtn--on': cText?.strikethrough || (isAnnoText && (selAnno as any)?.strikethrough) }" title="Strikethrough" @click="toggleStrikethrough">
                  <span class="line-through">S</span>
                </button>
                <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style" :class="{ 'props-sidebar__wbtn--on': cText?.superscript || (isAnnoText && (selAnno as any)?.superscript) }" title="Superscript" @click="toggleSuperscript">
                  <span>x²</span>
                </button>
                <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style" :class="{ 'props-sidebar__wbtn--on': cText?.subscript || (isAnnoText && (selAnno as any)?.subscript) }" title="Subscript" @click="toggleSubscript">
                  <span>x₂</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Paragraph Section -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.paragraph = !openSections.paragraph">
            <span>Paragraph</span>
            <BaseIcon :name="openSections.paragraph ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.paragraph" class="props-sidebar__acc-body">
            <!-- Alignments & line height -->
            <div class="props-sidebar__row">
              <div class="props-sidebar__btn-group">
                <button type="button" class="props-sidebar__wbtn" :class="{ 'props-sidebar__wbtn--on': alignMode === 'left' }" title="Align Left" @click="alignMode = 'left'">
                  <BaseIcon name="align-left" :size="14" />
                </button>
                <button type="button" class="props-sidebar__wbtn" :class="{ 'props-sidebar__wbtn--on': alignMode === 'center' }" title="Align Center" @click="alignMode = 'center'">
                  <BaseIcon name="align-center" :size="14" />
                </button>
                <button type="button" class="props-sidebar__wbtn" :class="{ 'props-sidebar__wbtn--on': alignMode === 'right' }" title="Align Right" @click="alignMode = 'right'">
                  <BaseIcon name="align-right" :size="14" />
                </button>
                <button type="button" class="props-sidebar__wbtn" :class="{ 'props-sidebar__wbtn--on': alignMode === 'justify' }" title="Justify" @click="alignMode = 'justify'">
                  <BaseIcon name="align-justify" :size="14" />
                </button>
              </div>

              <select v-model.number="lineRatio" class="props-sidebar__select props-sidebar__select--grow" title="Line Spacing" aria-label="Line spacing">
                <option v-for="lh in [100, 115, 125, 150, 200, 250, 300]" :key="lh" :value="lh">
                  {{ (lh / 100).toFixed(2) }}
                </option>
              </select>

              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--style font-bold text-xs" title="Character Spacing" disabled>
                VA
              </button>
            </div>

            <!-- Bullet lists and indentation -->
            <div class="props-sidebar__row">
              <div class="props-sidebar__btn-group">
                <button type="button" class="props-sidebar__wbtn" :class="{ 'props-sidebar__wbtn--on': cText?.bulletStyle === 'disc' || (selAnno as any)?.bulletStyle === 'disc' }" title="Bullet List" @click="toggleBullet('disc')">
                  <BaseIcon name="list" :size="14" />
                </button>
                <button type="button" class="props-sidebar__wbtn" :class="{ 'props-sidebar__wbtn--on': cText?.bulletStyle === 'decimal' || (selAnno as any)?.bulletStyle === 'decimal' }" title="Numbered List" @click="toggleBullet('decimal')">
                  <BaseIcon name="list-ordered" :size="14" />
                </button>
              </div>

              <div class="props-sidebar__btn-group">
                <button type="button" class="props-sidebar__wbtn" title="Decrease Indent" @click="changeIndent(-1)">
                  <BaseIcon name="indent-decrease" :size="14" />
                </button>
                <button type="button" class="props-sidebar__wbtn" title="Increase Indent" @click="changeIndent(1)">
                  <BaseIcon name="indent-increase" :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacing Section -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.spacing = !openSections.spacing">
            <span>Spacing</span>
            <BaseIcon :name="openSections.spacing ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.spacing" class="props-sidebar__acc-body">
            <!-- AV and AW Spacing -->
            <div class="props-sidebar__grid props-sidebar__grid--2cols">
              <div class="props-sidebar__field">
                <span class="props-sidebar__field-label">Character Spacing</span>
                <select v-model.number="letterSpacingPt" class="props-sidebar__select" aria-label="Char spacing">
                  <option v-for="ls in [-2, -1, 0, 1, 2, 3, 4, 5, 8, 12]" :key="ls" :value="ls">AV {{ ls }}</option>
                </select>
              </div>
              <div class="props-sidebar__field">
                <span class="props-sidebar__field-label">Word Spacing</span>
                <select v-model.number="wordSpacingPt" class="props-sidebar__select" aria-label="Word spacing">
                  <option v-for="ws in [-2, -1, 0, 1, 2, 3, 4, 5, 8, 12]" :key="ws" :value="ws">AW {{ ws }}</option>
                </select>
              </div>
            </div>

            <!-- Before/After Paragraph -->
            <div class="props-sidebar__grid props-sidebar__grid--2cols">
              <div class="props-sidebar__field">
                <span class="props-sidebar__field-label">Before Paragraph</span>
                <select v-model.number="paraBeforePt" class="props-sidebar__select" aria-label="Spacing before">
                  <option v-for="pt in [0, 2, 4, 6, 8, 12, 16, 24, 32]" :key="pt" :value="pt">{{ pt }} pt</option>
                </select>
              </div>
              <div class="props-sidebar__field">
                <span class="props-sidebar__field-label">After Paragraph</span>
                <select v-model.number="paraAfterPt" class="props-sidebar__select" aria-label="Spacing after">
                  <option v-for="pt in [0, 2, 4, 6, 8, 12, 16, 24, 32]" :key="pt" :value="pt">{{ pt }} pt</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Bullets & Numbering (Mock accordion) -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.bullets = !openSections.bullets">
            <span>Bullets & Numbering</span>
            <BaseIcon :name="openSections.bullets ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.bullets" class="props-sidebar__acc-body">
            <span class="props-sidebar__text-dim">Bullet templates and configurations are automatically inherited from standard document headers.</span>
          </div>
        </div>

        <!-- Effects Section -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.effects = !openSections.effects">
            <span>Effects</span>
            <BaseIcon :name="openSections.effects ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.effects" class="props-sidebar__acc-body">
            <div class="props-sidebar__field">
              <span class="props-sidebar__field-label">Opacity</span>
              <NumberStepper v-model="currentOpacityPct" :min="10" :max="100" :step="5" unit="%" label="Text Opacity" />
            </div>
          </div>
        </div>

        <!-- Link Section -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.link = !openSections.link">
            <span>Link</span>
            <BaseIcon :name="openSections.link ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.link" class="props-sidebar__acc-body">
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" @click="addHyperlink">
                <BaseIcon name="link" :size="13" />
                <span>Add Hyperlink overlay</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 3. IMAGE PROPERTIES -->
      <template v-else-if="isImage || cKind === 'image'">
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.table = !openSections.table">
            <span>Image Opacity</span>
            <BaseIcon :name="openSections.table ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.table" class="props-sidebar__acc-body">
            <NumberStepper v-model="imageOpacityPct" :min="10" :max="100" :step="5" unit="%" label="Image Opacity" />
          </div>
        </div>

        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.table = !openSections.table">
            <span>Image Transform</span>
            <BaseIcon :name="openSections.table ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.table" class="props-sidebar__acc-body">
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" @click="selAnno && editor.flipImage(selAnno.id, 'h')">
                <BaseIcon name="flip-h" :size="13" />
                <span>Flip Horizontally</span>
              </button>
            </div>
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" @click="selAnno && editor.flipImage(selAnno.id, 'v')">
                <BaseIcon name="flip-v" :size="13" />
                <span>Flip Vertically</span>
              </button>
            </div>
            <div class="props-sidebar__row">
              <button type="button" class="props-sidebar__wbtn props-sidebar__wbtn--expand" @click="selAnno && editor.updateAnnotation(selAnno.id, { rotation: 0 })">
                <BaseIcon name="rotate-ccw" :size="13" />
                <span>Reset Rotation</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 4. SHAPE PROPERTIES -->
      <template v-else-if="showStroke || showFill">
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.table = !openSections.table">
            <span>Borders & Stroke</span>
            <BaseIcon :name="openSections.table ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.table" class="props-sidebar__acc-body">
            <div class="props-sidebar__row">
              <span class="props-sidebar__field-label" style="margin-bottom: 0; align-self: center;">Stroke color</span>
              <BaseColorPicker v-model="currentColor" swatch-only label="Stroke color" />
            </div>
            <div v-if="showStroke" class="props-sidebar__field" style="margin-top: 8px;">
              <span class="props-sidebar__field-label">Stroke width</span>
              <NumberStepper v-model="currentStrokeWidth" :min="1" :max="20" :step="1" unit="px" label="Stroke width" />
            </div>
          </div>
        </div>

        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.table = !openSections.table">
            <span>Fill color</span>
            <BaseIcon :name="openSections.table ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.table" class="props-sidebar__acc-body">
            <div class="props-sidebar__row">
              <label class="props-sidebar__check">
                <input type="checkbox" :checked="currentFillColor !== null" @change="toggleFill(($event.target as HTMLInputElement).checked)" />
                Enable Fill color
              </label>
              <BaseColorPicker v-if="currentFillColor !== null" v-model="currentFillColor" swatch-only label="Fill color" />
            </div>
          </div>
        </div>
      </template>

      <!-- 5. TABLE PROPERTIES -->
      <template v-else-if="editor.activeTool.value === 'table'">
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.table = !openSections.table">
            <span>Table Layout</span>
            <BaseIcon :name="openSections.table ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.table" class="props-sidebar__acc-body">
            <div class="props-sidebar__grid props-sidebar__grid--2cols">
              <div class="props-sidebar__field">
                <span class="props-sidebar__field-label">Rows count</span>
                <NumberStepper v-model="tableRows" :min="1" :max="50" :step="1" label="Rows" />
              </div>
              <div class="props-sidebar__field">
                <span class="props-sidebar__field-label">Cols count</span>
                <NumberStepper v-model="tableCols" :min="1" :max="50" :step="1" label="Columns" />
              </div>
            </div>
            <div class="props-sidebar__row" style="margin-top: 8px;">
              <label class="props-sidebar__check">
                <input type="checkbox" v-model="tableHeader" />
                Has Header row
              </label>
              <label class="props-sidebar__check">
                <input type="checkbox" v-model="tableZebra" />
                Zebra stripes
              </label>
            </div>
          </div>
        </div>

        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.advanced = !openSections.advanced">
            <span>Table Style</span>
            <BaseIcon :name="openSections.advanced ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.advanced" class="props-sidebar__acc-body">
            <div class="props-sidebar__row">
              <span class="props-sidebar__field-label" style="align-self: center; margin-bottom: 0;">Borders</span>
              <BaseColorPicker v-model="tableBorderColor" swatch-only label="Border color" />
              <NumberStepper v-model="tableBorderWidth" :min="0" :max="10" :step="1" unit="px" label="Border width" />
            </div>
            <div class="props-sidebar__row" style="margin-top: 8px;">
              <span class="props-sidebar__field-label" style="align-self: center; margin-bottom: 0;">Background</span>
              <BaseColorPicker v-model="tableBgColor" swatch-only label="Background color" />
              <NumberStepper v-model="tablePadding" :min="0" :max="40" :step="1" unit="px" label="Cell padding" />
            </div>
            <div class="props-sidebar__row" style="margin-top: 8px;">
              <button type="button" class="props-sidebar__del" style="flex: 1;" title="Delete Table" @click="deleteTable">
                <BaseIcon name="trash" :size="13" />
                <span>Delete Table</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 6. FORM FIELD PROPERTIES -->
      <template v-else-if="selField">
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.field = !openSections.field">
            <span>Field Settings</span>
            <BaseIcon :name="openSections.field ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.field" class="props-sidebar__acc-body">
            <div class="props-sidebar__field">
              <span class="props-sidebar__field-label">Field ID Name</span>
              <input
                class="props-sidebar__input"
                :value="selField.name"
                placeholder="Field name ID"
                aria-label="Field name"
                @change="patchField({ name: ($event.target as HTMLInputElement).value })"
              />
            </div>
          </div>
        </div>

        <div class="props-sidebar__acc" v-if="selField.type === 'field-dropdown' || selField.type === 'field-radio' || selField.type === 'field-text'">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.field = !openSections.field">
            <span>Field Options</span>
            <BaseIcon :name="openSections.field ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.field" class="props-sidebar__acc-body">
            <input
              v-if="selField.type === 'field-dropdown' || selField.type === 'field-radio'"
              v-model="fieldOptions"
              class="props-sidebar__input"
              :placeholder="selField.type === 'field-radio' ? 'Yes' : 'Option 1, Option 2'"
              aria-label="Field options"
            />
            <input
              v-else-if="selField.type === 'field-text'"
              class="props-sidebar__input"
              :value="selField.value"
              placeholder="Default value"
              aria-label="Default value"
              @change="patchField({ value: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>

        <div class="props-sidebar__acc" v-if="selField.type === 'field-checkbox'">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.field = !openSections.field">
            <span>Field Behavior</span>
            <BaseIcon :name="openSections.field ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.field" class="props-sidebar__acc-body">
            <label class="props-sidebar__check">
              <input
                type="checkbox"
                :checked="selField.value === 'checked'"
                @change="patchField({ value: ($event.target as HTMLInputElement).checked ? 'checked' : '' })"
              />
              Checked by default
            </label>
          </div>
        </div>
      </template>

      <!-- 7. STAMP PROPERTIES -->
      <template v-else-if="isStamp">
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.field = !openSections.field">
            <span>Stamp Settings</span>
            <BaseIcon :name="openSections.field ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.field" class="props-sidebar__acc-body">
            <div class="props-sidebar__field">
              <span class="props-sidebar__field-label">Stamp Template</span>
              <select v-model="stampLabel" class="props-sidebar__select" title="Stamp preset font label" aria-label="Stamp type">
                <option v-for="p in STAMP_PRESETS" :key="p.label" :value="p.label">
                  {{ p.label }}
                </option>
              </select>
            </div>
            <div class="props-sidebar__field" style="margin-top: 8px;">
              <span class="props-sidebar__field-label">Stamp Opacity</span>
              <NumberStepper v-model="currentOpacityPct" :min="10" :max="100" :step="5" unit="%" label="Stamp opacity" />
            </div>
          </div>
        </div>
      </template>

      <!-- 8. LINK PROPERTIES -->
      <template v-else-if="isLink">
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.link = !openSections.link">
            <span>Hyperlink Target</span>
            <BaseIcon :name="openSections.link ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.link" class="props-sidebar__acc-body">
            <div class="props-sidebar__field">
              <span class="props-sidebar__field-label">Destination URL</span>
              <input
                v-model="linkUrl"
                class="props-sidebar__input"
                placeholder="https://example.com"
                aria-label="Destination URL"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 9. IDLE / DOCUMENT DEFAULT VIEW -->
      <template v-else>
        <!-- Document Metadata -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.font = !openSections.font">
            <span>File Details</span>
            <BaseIcon :name="openSections.font ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.font" class="props-sidebar__acc-body props-sidebar__acc-body--meta">
            <div class="props-sidebar__meta-item">
              <span class="props-sidebar__meta-label">File:</span>
              <strong class="props-sidebar__meta-val" :title="editor.fileName.value">{{ editor.fileName.value }}</strong>
            </div>
            <div class="props-sidebar__meta-item">
              <span class="props-sidebar__meta-label">Total pages:</span>
              <strong class="props-sidebar__meta-val">{{ editor.pageCount.value || 0 }} pages</strong>
            </div>
          </div>
        </div>

        <div class="props-sidebar__acc" v-if="editor.metadata.value?.title || editor.metadata.value?.author">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.paragraph = !openSections.paragraph">
            <span>Document Metadata</span>
            <BaseIcon :name="openSections.paragraph ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.paragraph" class="props-sidebar-body props-sidebar__acc-body--meta">
            <div v-if="editor.metadata.value?.title" class="props-sidebar__meta-item">
              <span class="props-sidebar__meta-label">Title:</span>
              <strong class="props-sidebar__meta-val">{{ editor.metadata.value.title }}</strong>
            </div>
            <div v-if="editor.metadata.value?.author" class="props-sidebar__meta-item">
              <span class="props-sidebar__meta-label">Author:</span>
              <strong class="props-sidebar__meta-val">{{ editor.metadata.value.author }}</strong>
            </div>
          </div>
        </div>

        <!-- Help view -->
        <div class="props-sidebar__acc">
          <button type="button" class="props-sidebar__acc-head" @click="openSections.spacing = !openSections.spacing">
            <span>Quick Tips</span>
            <BaseIcon :name="openSections.spacing ? 'chevron-up' : 'chevron-down'" :size="11" />
          </button>
          <div v-show="openSections.spacing" class="props-sidebar__acc-body">
            <span class="props-sidebar__text-dim">💡 Click Home → Edit Text or highlight, draw, insert shapes to edit this document. Selection properties will surface here automatically.</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Clear Formatting Button at bottom (when text formatting has selection) -->
    <div class="props-sidebar__footer" v-if="hasTextSelection">
      <button
        type="button"
        class="props-sidebar__clear-btn"
        title="Clear all local text formatting overrides"
        @click="editor.clearFormatting()"
      >
        <BaseIcon name="clear-formatting" :size="14" />
        <span>Clear Formatting</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
  .props-sidebar {
    display: flex;
    flex-direction: column;
    width: 250px;
    height: 100%;
    background: hsl(var(--color-surface));
    border-left: 1px solid hsl(var(--color-border));
    flex: none;
    z-index: 10;
  }

  .props-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
    flex: none;
  }

  .props-sidebar__title {
    font-size: 12px;
    font-weight: 700;
    color: hsl(var(--color-text));
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .props-sidebar__close {
    display: inline-flex;
    padding: 3px;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .props-sidebar__close:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }

  .props-sidebar__body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    gap: 4px;
  }

  /* Accordion Styles */
  .props-sidebar__acc {
    border-bottom: 1px solid hsl(var(--color-border) / 0.5);
  }
  .props-sidebar__acc-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 9px 14px;
    background: none;
    border: none;
    font-size: 11px;
    font-weight: 700;
    color: hsl(var(--color-text));
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    transition: background 0.15s;
  }
  .props-sidebar__acc-head:hover {
    background: hsl(var(--color-surface-muted));
  }

  .props-sidebar__acc-body {
    padding: 0 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .props-sidebar__acc-body--meta {
    gap: 4px;
  }

  .props-sidebar__text-dim {
    font-size: 11px;
    color: hsl(var(--color-text-faint));
    line-height: 1.4;
  }

  /* Meta elements */
  .props-sidebar__meta-item {
    display: flex;
    align-items: baseline;
    font-size: 11.5px;
    gap: 4px;
  }
  .props-sidebar__meta-label {
    color: hsl(var(--color-text-faint));
    width: 75px;
    flex-shrink: 0;
  }
  .props-sidebar__meta-val {
    color: hsl(var(--color-text-muted));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Row layouts */
  .props-sidebar__row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  /* Grid Layouts */
  .props-sidebar__grid {
    display: grid;
    gap: 6px;
  }
  .props-sidebar__grid--2cols {
    grid-template-columns: 1fr 1fr;
  }
  .props-sidebar__grid--3cols {
    grid-template-columns: repeat(3, 1fr);
  }

  .props-sidebar__field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .props-sidebar__field-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--color-text-faint));
  }

  .props-sidebar__divider-h {
    height: 1px;
    background: hsl(var(--color-border) / 0.5);
    margin: 4px 0;
  }

  /* Form Elements */
  .props-sidebar__select {
    height: 28px;
    padding: 0 20px 0 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface)) url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") no-repeat right 3px center;
    background-size: 14px 14px;
    appearance: none;
    -webkit-appearance: none;
    color: hsl(var(--color-text));
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .props-sidebar__select--grow {
    flex: 1;
    min-width: 0;
  }
  .props-sidebar__select--narrow {
    width: 52px;
    padding-right: 14px;
  }
  .props-sidebar__select:focus {
    border-color: hsl(var(--color-primary));
  }

  .props-sidebar__input {
    height: 28px;
    padding: 0 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-size: 11.5px;
    outline: none;
    width: 100%;
  }
  .props-sidebar__input:focus {
    border-color: hsl(var(--color-primary));
  }

  .props-sidebar__wbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    padding: 0 8px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
    font-size: 11.5px;
    font-weight: 600;
  }
  .props-sidebar__wbtn:hover:not(:disabled) {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .props-sidebar__wbtn--expand {
    flex: 1;
    justify-content: flex-start;
    gap: 6px;
  }
  .props-sidebar__wbtn--style {
    font-family: inherit;
    font-weight: 700;
    flex: 1;
    padding: 0;
  }
  .props-sidebar__wbtn--on {
    background: hsl(var(--color-primary) / 0.12);
    border-color: hsl(var(--color-primary) / 0.4);
    color: hsl(var(--color-primary));
  }
  .props-sidebar__wbtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .props-sidebar__btn-group {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    background: hsl(var(--color-surface-muted));
    padding: 1px;
    border-radius: var(--radius-md);
    border: 1px solid hsl(var(--color-border));
  }
  .props-sidebar__btn-group--grow {
    flex: 1;
  }
  .props-sidebar__btn-group .props-sidebar__wbtn {
    border: none;
    border-radius: var(--radius-sm);
    height: 24px;
    padding: 0;
  }

  .props-sidebar__check {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    user-select: none;
  }

  .props-sidebar__del {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    border: 1px solid hsl(var(--color-danger) / 0.3);
    border-radius: var(--radius-md);
    background: hsl(var(--color-danger) / 0.08);
    color: hsl(var(--color-danger));
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;
    height: 26px;
  }
  .props-sidebar__del:hover {
    background: hsl(var(--color-danger) / 0.14);
  }

  /* Footer */
  .props-sidebar__footer {
    padding: 10px 14px;
    border-top: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
    flex: none;
  }
  .props-sidebar__clear-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 30px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-md);
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text-muted));
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .props-sidebar__clear-btn:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
    border-color: hsl(var(--color-border-strong));
  }
</style>
