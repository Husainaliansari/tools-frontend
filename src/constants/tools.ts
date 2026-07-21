/**
 * PDF tool registry.
 * Single source of truth for every tool surfaced across the app.
 */
import type { PdfTool, ToolCategory } from '@types'

/** Ordered category list used for grouping on the tools/home pages. */
export const TOOL_CATEGORIES: readonly ToolCategory[] = [
  'Organize',
  'Optimize',
  'Convert to PDF',
  'Convert from PDF',
  'Edit',
  'Security',
] as const

export const TOOLS: readonly PdfTool[] = [
  {
    slug: 'editor',
    name: 'PDF Editor',
    category: 'Edit',
    icon: 'edit',
    description: 'Add text, images, shapes and annotations to any PDF.',
    formats: ['PDF'],
    color: '#4f46e5',
    popular: true,
  },
  {
    slug: 'compress',
    name: 'Compress PDF',
    category: 'Optimize',
    icon: 'compress',
    description: 'Reduce file size while keeping the best possible quality.',
    formats: ['PDF'],
    color: '#16a34a',
    popular: true,
  },
  {
    slug: 'merge',
    name: 'Merge PDF',
    category: 'Organize',
    icon: 'layers',
    description: 'Combine multiple PDFs into one unified document.',
    formats: ['PDF'],
    color: '#2563eb',
    popular: true,
  },
  {
    slug: 'split',
    name: 'Split PDF',
    category: 'Organize',
    icon: 'scissors',
    description: 'Separate one PDF into multiple files or page ranges.',
    formats: ['PDF'],
    color: '#0891b2',
    popular: true,
  },
  {
    slug: 'rotate',
    name: 'Rotate PDF',
    category: 'Organize',
    icon: 'rotate-cw',
    description: 'Rotate pages the way you need them, all at once.',
    formats: ['PDF'],
    color: '#0d9488',
  },
  {
    slug: 'delete-pages',
    name: 'Delete Pages',
    category: 'Organize',
    icon: 'trash',
    description: 'Remove the pages you don’t need from your document.',
    formats: ['PDF'],
    color: '#e11d48',
  },
  {
    slug: 'extract-pages',
    name: 'Extract Pages',
    category: 'Organize',
    icon: 'file-output',
    description: 'Pull selected pages out into a brand-new PDF.',
    formats: ['PDF'],
    color: '#7c3aed',
  },
  {
    slug: 'reorder',
    name: 'Reorder Pages',
    category: 'Organize',
    icon: 'move-vertical',
    description: 'Drag pages into the perfect order in seconds.',
    formats: ['PDF'],
    color: '#9333ea',
  },
  {
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    category: 'Convert from PDF',
    icon: 'file-down',
    description: 'Turn PDFs into editable Word documents.',
    formats: ['PDF'],
    output: 'DOCX',
    color: '#2563eb',
    popular: true,
  },
  {
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    category: 'Convert to PDF',
    icon: 'file-up',
    description: 'Convert DOC and DOCX files into polished PDFs.',
    formats: ['DOC', 'DOCX'],
    color: '#1d4ed8',
  },
  {
    slug: 'excel-to-pdf',
    name: 'Excel to PDF',
    category: 'Convert to PDF',
    icon: 'file-spreadsheet',
    description: 'Make spreadsheets easy to share as PDF.',
    formats: ['XLS', 'XLSX'],
    color: '#16a34a',
  },
  {
    slug: 'ppt-to-pdf',
    name: 'PPT to PDF',
    category: 'Convert to PDF',
    icon: 'presentation',
    description: 'Convert presentations into clean PDF slides.',
    formats: ['PPT', 'PPTX'],
    color: '#ea580c',
  },
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'Convert from PDF',
    icon: 'image',
    description: 'Export every page as a high-quality JPG image.',
    formats: ['PDF'],
    output: 'JPG',
    color: '#d97706',
  },
  {
    slug: 'pdf-to-png',
    name: 'PDF to PNG',
    category: 'Convert from PDF',
    icon: 'image',
    description: 'Convert PDF pages to crisp PNG images.',
    formats: ['PDF'],
    output: 'PNG',
    color: '#0284c7',
  },
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'Convert to PDF',
    icon: 'image',
    description: 'Combine JPG images into a single PDF.',
    formats: ['JPG', 'JPEG'],
    color: '#db2777',
  },
  {
    slug: 'png-to-pdf',
    name: 'PNG to PDF',
    category: 'Convert to PDF',
    icon: 'image',
    description: 'Turn PNG images into a shareable PDF.',
    formats: ['PNG'],
    color: '#9333ea',
  },
  {
    slug: 'watermark',
    name: 'Add Watermark',
    category: 'Edit',
    icon: 'stamp',
    description: 'Stamp text or image watermarks across pages.',
    formats: ['PDF'],
    color: '#0ea5e9',
  },
  {
    slug: 'remove-watermark',
    name: 'Remove Watermark',
    category: 'Edit',
    icon: 'eraser',
    description: 'Clean unwanted watermarks from your PDF.',
    formats: ['PDF'],
    color: '#64748b',
  },
  {
    slug: 'header-footer',
    name: 'Header & Footer',
    category: 'Edit',
    icon: 'panel-top',
    description: 'Add consistent headers and footers to pages.',
    formats: ['PDF'],
    color: '#7c3aed',
  },
  {
    slug: 'page-numbers',
    name: 'Page Numbers',
    category: 'Edit',
    icon: 'list-ordered',
    description: 'Insert page numbers in any position and style.',
    formats: ['PDF'],
    color: '#4f46e5',
  },
  {
    slug: 'protect',
    name: 'Protect PDF',
    category: 'Security',
    icon: 'lock',
    description: 'Encrypt your PDF with a password.',
    formats: ['PDF'],
    color: '#dc2626',
  },
  {
    slug: 'unlock',
    name: 'Unlock PDF',
    category: 'Security',
    icon: 'unlock',
    description: 'Remove password protection you own.',
    formats: ['PDF'],
    color: '#059669',
  },
  {
    slug: 'ocr',
    name: 'OCR PDF',
    category: 'Optimize',
    icon: 'scan-text',
    description: 'Make scanned PDFs searchable and selectable.',
    formats: ['PDF'],
    color: '#c026d3',
  },
  {
    slug: 'repair',
    name: 'Repair PDF',
    category: 'Optimize',
    icon: 'wrench',
    description: 'Recover data from a damaged or corrupt PDF.',
    formats: ['PDF'],
    color: '#0891b2',
  },
  {
    slug: 'redact',
    name: 'Redact PDF',
    category: 'Security',
    icon: 'eye-off',
    description: 'Mark areas on a live preview and permanently remove them.',
    formats: ['PDF'],
    color: '#1e293b',
  },
  {
    slug: 'fill-forms',
    name: 'Fill PDF Forms',
    category: 'Edit',
    icon: 'form-input',
    description: 'Complete and save interactive PDF forms.',
    formats: ['PDF'],
    color: '#2563eb',
  },
  {
    slug: 'sign',
    name: 'Sign PDF',
    category: 'Security',
    icon: 'file-signature',
    description: 'Sign documents yourself or request signatures.',
    formats: ['PDF'],
    color: '#7c3aed',
    popular: true,
  },
  {
    slug: 'compress-scanned',
    name: 'Compress Scanned PDF',
    category: 'Optimize',
    icon: 'scan',
    description: 'Shrink heavy scanned documents dramatically.',
    formats: ['PDF'],
    color: '#16a34a',
  },
  {
    slug: 'compare',
    name: 'Compare PDFs',
    category: 'Optimize',
    icon: 'compare',
    description: 'Spot every difference between two PDFs.',
    formats: ['PDF'],
    color: '#0d9488',
  },
  {
    slug: 'metadata',
    name: 'Metadata Editor',
    category: 'Edit',
    icon: 'info',
    description: 'View and edit title, author and other metadata.',
    formats: ['PDF'],
    color: '#64748b',
  },
] as const

/** Total number of tools — surfaced in marketing copy. */
export const TOOL_COUNT = TOOLS.length

/** Look up a tool by its slug. */
export function getToolBySlug(slug: string): PdfTool | undefined {
  return TOOLS.find((tool) => tool.slug === slug)
}

/** Popular tools first, then the rest — used for the home "Popular" grid. */
export function getPopularTools(limit?: number): PdfTool[] {
  const ordered = [...TOOLS.filter((t) => t.popular), ...TOOLS.filter((t) => !t.popular)]
  return limit ? ordered.slice(0, limit) : ordered
}

/** Tools belonging to a given category. */
export function getToolsByCategory(category: ToolCategory): PdfTool[] {
  return TOOLS.filter((t) => t.category === category)
}

/** Case-insensitive search across tool name and description. */
export function searchTools(query: string): PdfTool[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...TOOLS]
  return TOOLS.filter(
    (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
  )
}

/** Related tools for a given tool: same category first, then others. */
export function getRelatedTools(tool: PdfTool, limit = 4): PdfTool[] {
  const sameCategory = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug)
  const others = TOOLS.filter((t) => t.category !== tool.category)
  return [...sameCategory, ...others].slice(0, limit)
}
