/**
 * File-format presentation metadata — accent colors, icons and the document
 * glyph sketches shared by the conversion animation and file progress cards.
 */
import type { PdfTool, ToolFile } from '@types'

/** The sketch drawn inside an animated document. */
export type FormatGlyph = 'text' | 'grid' | 'image' | 'slides'

export interface FormatMeta {
  /** Canonical short label shown on the doc badge (e.g. XLSX). */
  label: string
  /** Accent color associated with the format. */
  color: string
  /** Which content sketch to draw inside the document. */
  glyph: FormatGlyph
  /** BaseIcon name for compact thumbnails. */
  icon: string
}

const FORMAT_META: Record<string, FormatMeta> = {
  PDF: { label: 'PDF', color: '#dc2626', glyph: 'text', icon: 'file-text' },
  DOC: { label: 'DOC', color: '#2563eb', glyph: 'text', icon: 'file-text' },
  DOCX: { label: 'DOCX', color: '#2563eb', glyph: 'text', icon: 'file-text' },
  TXT: { label: 'TXT', color: '#64748b', glyph: 'text', icon: 'file-text' },
  XLS: { label: 'XLS', color: '#16a34a', glyph: 'grid', icon: 'file-spreadsheet' },
  XLSX: { label: 'XLSX', color: '#16a34a', glyph: 'grid', icon: 'file-spreadsheet' },
  CSV: { label: 'CSV', color: '#16a34a', glyph: 'grid', icon: 'file-spreadsheet' },
  PPT: { label: 'PPT', color: '#ea580c', glyph: 'slides', icon: 'presentation' },
  PPTX: { label: 'PPTX', color: '#ea580c', glyph: 'slides', icon: 'presentation' },
  JPG: { label: 'JPG', color: '#db2777', glyph: 'image', icon: 'image' },
  JPEG: { label: 'JPEG', color: '#db2777', glyph: 'image', icon: 'image' },
  PNG: { label: 'PNG', color: '#0284c7', glyph: 'image', icon: 'image' },
  WEBP: { label: 'WEBP', color: '#0284c7', glyph: 'image', icon: 'image' },
}

/** Presentation metadata for a format/extension (leading dot optional). */
export function formatMeta(ext: string): FormatMeta {
  const key = ext.replace(/^\./, '').toUpperCase()
  return (
    FORMAT_META[key] ?? { label: key || 'FILE', color: '#64748b', glyph: 'text', icon: 'file-text' }
  )
}

/** Extension (uppercased, no dot) from a file name, or null when absent. */
export function extOf(name: string | undefined): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(name ?? '')
  return match ? match[1].toUpperCase() : null
}

/**
 * Source format for a run: the first file's real extension when the tool
 * accepts it, otherwise the tool's first accepted format.
 */
export function sourceFormat(tool: PdfTool, files: ToolFile[]): string {
  const ext = extOf(files[0]?.name)
  if (ext && tool.formats.some((format) => format.toUpperCase() === ext)) return ext
  return tool.formats[0] ?? 'PDF'
}

/** Destination format: converters declare `output`; everything else emits PDF. */
export function targetFormat(tool: PdfTool): string {
  return tool.output ?? 'PDF'
}
