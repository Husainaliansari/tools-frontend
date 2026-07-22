/**
 * Ribbon definition — the Foxit-style tabbed toolbar.
 *
 * Each item either activates a drawing `tool` (a `ToolId`) or fires an `action`
 * the shell handles (undo, page ops, export…). Items flagged `soon` render
 * disabled — they belong to later build phases (encryption, digital signing).
 */
import type { ToolId } from '@/lib/pdf'

export type EditorAction =
  | 'edit-text'
  | 'edit-object'
  | 'edit-all'
  | 'edit-done'
  | 'undo'
  | 'redo'
  | 'metadata'
  | 'export'
  | 'export-png'
  | 'print'
  | 'duplicate'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'format-painter'
  | 'clear-formatting'
  | 'find-replace'
  | 'hyperlink'
  | 'search'
  | 'signature'
  | 'insert-image'
  | 'rotate-left'
  | 'rotate-right'
  | 'insert-page'
  | 'duplicate-page'
  | 'delete-page'
  | 'extract-page'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-top'
  | 'align-middle'
  | 'align-bottom'
  | 'distribute-h'
  | 'distribute-v'
  | 'bring-front'
  | 'send-back'

export interface RibbonItem {
  id: string
  label: string
  icon: string
  shortcut?: string
  /** Activates a drawing tool. */
  tool?: ToolId
  /** Fires a shell action instead of switching tools. */
  action?: EditorAction
  /** Content-editing mode this item activates — drives its active-state highlight. */
  mode?: 'text' | 'object' | 'all'
  /** Not yet implemented — rendered disabled with a "soon" hint. */
  soon?: boolean
}

export interface RibbonGroup {
  label: string
  items: RibbonItem[]
}

export interface RibbonTab {
  id: string
  label: string
  icon: string
  groups: RibbonGroup[]
}

export const RIBBON: RibbonTab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    groups: [
      {
        label: 'Basic',
        items: [
          { id: 'hand', label: 'Hand', icon: 'hand', tool: 'hand' },
          { id: 'select', label: 'Select', icon: 'mouse-pointer', tool: 'select' },
          { id: 'text', label: 'Text', icon: 'type', tool: 'text' },
          { id: 'snapshot', label: 'Snapshot', icon: 'camera', soon: true },
          { id: 'clipboard', label: 'Clipboard', icon: 'credit-card', soon: true },
        ],
      },
      {
        label: 'View',
        items: [
          { id: 'zoom', label: 'Zoom', icon: 'search', soon: true },
          { id: 'fit', label: 'Page Fit', icon: 'maximize', soon: true },
          { id: 'rotate-left', label: 'Rotate Left', icon: 'rotate-ccw', action: 'rotate-left' },
          { id: 'rotate-right', label: 'Rotate Right', icon: 'rotate-cw', action: 'rotate-right' },
        ],
      },
      {
        label: 'Markup',
        items: [
          { id: 'typewriter', label: 'Typewriter', icon: 'type', soon: true },
          { id: 'highlight', label: 'Highlight', icon: 'highlighter', tool: 'highlight' },
        ],
      },
      {
        label: 'Navigate',
        items: [
          { id: 'link', label: 'Link', icon: 'link', tool: 'link' },
          { id: 'bookmark', label: 'Bookmark', icon: 'bookmark', soon: true },
        ],
      },
      {
        label: 'Media',
        items: [
          { id: 'attachment', label: 'File Attachment', icon: 'file-plus', soon: true },
          { id: 'image-anno', label: 'Image Annotation', icon: 'image', tool: 'image' },
          { id: 'media', label: 'Audio & Video', icon: 'monitor', soon: true },
        ],
      },
      {
        label: 'Options',
        items: [
          { id: 'search', label: 'Search', icon: 'search', action: 'search' },
          { id: 'more', label: 'More', icon: 'dots', soon: true },
        ],
      },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: 'edit',
    groups: [
      {
        label: 'Content',
        items: [
          { id: 'edit-text', label: 'Edit Text', icon: 'type', action: 'edit-text', mode: 'text' },
          { id: 'edit-object', label: 'Edit Object', icon: 'image', action: 'edit-object', mode: 'object' },
          { id: 'edit-all', label: 'Edit All', icon: 'mouse-pointer', action: 'edit-all', mode: 'all' },
          { id: 'edit-done', label: 'Exit', icon: 'x', action: 'edit-done' },
        ],
      },
      {
        label: 'Clipboard',
        items: [
          { id: 'copy', label: 'Copy', icon: 'copy', action: 'copy' },
          { id: 'paste', label: 'Paste', icon: 'file-plus', action: 'paste' },
          { id: 'duplicate', label: 'Duplicate', icon: 'copy', action: 'duplicate' },
        ],
      },
      {
        label: 'Arrange',
        items: [
          { id: 'bring-front', label: 'To front', icon: 'bring-front', action: 'bring-front' },
          { id: 'send-back', label: 'To back', icon: 'send-back', action: 'send-back' },
        ],
      },
      {
        label: 'Align',
        items: [
          { id: 'align-left', label: 'Left', icon: 'align-obj-left', action: 'align-left' },
          { id: 'align-center', label: 'Center', icon: 'align-obj-center', action: 'align-center' },
          { id: 'align-right', label: 'Right', icon: 'align-obj-right', action: 'align-right' },
          { id: 'align-top', label: 'Top', icon: 'align-obj-top', action: 'align-top' },
          { id: 'align-middle', label: 'Middle', icon: 'align-obj-middle', action: 'align-middle' },
          { id: 'align-bottom', label: 'Bottom', icon: 'align-obj-bottom', action: 'align-bottom' },
        ],
      },
      {
        label: 'Distribute',
        items: [
          { id: 'distribute-h', label: 'Horizontal', icon: 'distribute-h', action: 'distribute-h' },
          { id: 'distribute-v', label: 'Vertical', icon: 'distribute-v', action: 'distribute-v' },
        ],
      },
      {
        label: 'Document',
        items: [{ id: 'metadata', label: 'Metadata', icon: 'info', action: 'metadata' }],
      },
    ],
  },
  {
    id: 'comment',
    label: 'Comment',
    icon: 'message-square',
    groups: [
      {
        label: 'Text markup',
        items: [
          { id: 'highlight', label: 'Highlight', icon: 'highlighter', tool: 'highlight' },
          { id: 'underline', label: 'Underline', icon: 'underline', tool: 'underline' },
          { id: 'strike', label: 'Strikethrough', icon: 'strikethrough', tool: 'strikethrough' },
          { id: 'squiggly', label: 'Squiggly', icon: 'activity', tool: 'squiggly' },
        ],
      },
      {
        label: 'Drawing',
        items: [
          { id: 'ink', label: 'Freehand', icon: 'pen-line', tool: 'ink' },
          { id: 'rect', label: 'Rectangle', icon: 'square', tool: 'rect' },
          { id: 'ellipse', label: 'Ellipse', icon: 'circle', tool: 'ellipse' },
          { id: 'arrow', label: 'Arrow', icon: 'move-up-right', tool: 'arrow' },
          { id: 'line', label: 'Line', icon: 'minus', tool: 'line' },
        ],
      },
      {
        label: 'Notes & stamps',
        items: [
          { id: 'note', label: 'Sticky note', icon: 'message-square', tool: 'note' },
          { id: 'stamp', label: 'Stamp', icon: 'stamp', tool: 'stamp' },
        ],
      },
    ],
  },
  {
    id: 'insert',
    label: 'Insert',
    icon: 'plus',
    groups: [
      {
        label: 'Media',
        items: [
          { id: 'insert-image', label: 'Image', icon: 'image', action: 'insert-image' },
          { id: 'signature', label: 'Signature', icon: 'file-signature', action: 'signature' },
          { id: 'stamp', label: 'Stamp', icon: 'stamp', tool: 'stamp' },
        ],
      },
      {
        label: 'Content',
        items: [
          { id: 'text', label: 'Text box', icon: 'type', tool: 'text' },
          { id: 'table', label: 'Table', icon: 'table', tool: 'table' },
          { id: 'whiteout', label: 'Whiteout', icon: 'eraser', tool: 'whiteout' },
          { id: 'link', label: 'Link', icon: 'link', tool: 'link' },
        ],
      },
    ],
  },
  {
    id: 'organize',
    label: 'Organize',
    icon: 'layers',
    groups: [
      {
        label: 'Rotate',
        items: [
          { id: 'rotate-left', label: 'Rotate left', icon: 'rotate-ccw', action: 'rotate-left' },
          { id: 'rotate-right', label: 'Rotate right', icon: 'rotate-cw', action: 'rotate-right' },
        ],
      },
      {
        label: 'Pages',
        items: [
          { id: 'insert-page', label: 'Insert blank', icon: 'file-plus', action: 'insert-page' },
          { id: 'duplicate-page', label: 'Duplicate', icon: 'copy', action: 'duplicate-page' },
          { id: 'delete-page', label: 'Delete', icon: 'trash', action: 'delete-page' },
        ],
      },
      {
        label: 'Extract',
        items: [
          { id: 'extract-page', label: 'Page → PDF', icon: 'file-output', action: 'extract-page' },
          { id: 'export-png', label: 'Page → PNG', icon: 'image', action: 'export-png' },
        ],
      },
    ],
  },
  {
    id: 'forms',
    label: 'Forms',
    icon: 'form-input',
    groups: [
      {
        label: 'Fields',
        items: [
          { id: 'field-text', label: 'Text field', icon: 'form-input', tool: 'field-text' },
          { id: 'field-checkbox', label: 'Checkbox', icon: 'check-square', tool: 'field-checkbox' },
          { id: 'field-radio', label: 'Radio', icon: 'circle-dot', tool: 'field-radio' },
          { id: 'field-dropdown', label: 'Dropdown', icon: 'chevron-down', tool: 'field-dropdown' },
        ],
      },
    ],
  },
  {
    id: 'protect',
    label: 'Protect',
    icon: 'shield',
    groups: [
      {
        label: 'Security',
        items: [
          { id: 'password', label: 'Set password', icon: 'lock', soon: true },
          { id: 'unlock', label: 'Remove password', icon: 'unlock', soon: true },
          { id: 'redact', label: 'Redact', icon: 'eye-off', tool: 'whiteout' },
        ],
      },
      {
        label: 'Signature',
        items: [{ id: 'sign', label: 'Sign', icon: 'file-signature', action: 'signature' }],
      },
    ],
  },
]
