/**
 * Embedded-font reuse for content editing.
 *
 * When the user edits existing text, redrawing it in a generic standard font
 * (Helvetica/Times/Courier) makes the edit obvious — the glyph shapes, weight,
 * spacing and baseline no longer match the untouched text around it. That is
 * exactly the mismatch seen after export, because on screen the editor renders
 * edits with the document's *own* pdf.js-loaded font while the old exporter
 * always substituted a standard font.
 *
 * To match professional editors (Acrobat/Foxit) we reuse the document's own
 * embedded font program: pull the `FontFile` stream out of the PDF, re-embed it
 * (subset) with fontkit, and draw the edited run with it — so the exported
 * glyphs are identical to the originals. We only do this when the embedded font
 * actually covers every character the user typed; otherwise the caller falls
 * back to the closest standard font.
 */
import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
  type PDFDocument,
  type PDFFont,
} from 'pdf-lib'
import type { TextContentEdit } from './types'

const SUBSET_PREFIX = /^[A-Z]{6}\+/

/** A font program lifted out of the source PDF, ready to re-embed. */
export interface EmbeddedFontRecord {
  /** Raw `/BaseFont` name, e.g. `ABCDEF+Calibri-Bold`. */
  baseFont: string
  /** Subset tag stripped, e.g. `Calibri-Bold`. */
  cleanName: string
  /** Decoded font-file bytes (TrueType / OpenType / CFF / Type1). */
  bytes: Uint8Array
  bold: boolean
  italic: boolean
  serif: boolean
  mono: boolean
}

/** Reduce a font name to a comparable family key: lowercase alnum, no style words. */
function familyKey(name: string): string {
  const base = (name || '')
    .toLowerCase()
    .replace(/^[a-z]{6}\+/, '')
    .replace(/[^a-z0-9]/g, '')
  return base.replace(
    /(bolditalic|boldoblique|semibold|extrabold|demibold|bold|italic|oblique|regular|medium|light|black|heavy|thin|book|roman|mt|ps|psmt|it|bd)/g,
    '',
  )
}

function numberOf(dict: PDFDict, key: string): number | undefined {
  const v = dict.lookup(PDFName.of(key))
  return v instanceof PDFNumber ? v.asNumber() : undefined
}

/** Resolve the descriptor for a font dict, following Type0 → DescendantFonts. */
function descriptorFor(fontDict: PDFDict): PDFDict | undefined {
  const direct = fontDict.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict)
  if (direct) return direct
  const desc = fontDict.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray)
  if (desc && desc.size() > 0) {
    const d0 = desc.lookup(0, PDFDict)
    return d0?.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict) ?? undefined
  }
  return undefined
}

/**
 * Walk every indirect object and lift the embedded font programs. Best-effort:
 * a malformed or unsupported font is skipped, never fatal.
 */
export function extractEmbeddedFonts(pdf: PDFDocument): EmbeddedFontRecord[] {
  const out: EmbeddedFontRecord[] = []
  const seen = new Set<string>()
  let objects: [unknown, unknown][]
  try {
    objects = pdf.context.enumerateIndirectObjects() as unknown as [unknown, unknown][]
  } catch {
    return out
  }

  for (const [, obj] of objects) {
    if (!(obj instanceof PDFDict)) continue
    if (obj.lookup(PDFName.of('Type')) !== PDFName.of('Font')) continue

    const baseFontObj = obj.lookup(PDFName.of('BaseFont'))
    const baseFont = baseFontObj instanceof PDFName ? baseFontObj.decodeText() : ''

    const descriptor = descriptorFor(obj)
    if (!descriptor) continue

    const streamObj =
      descriptor.lookup(PDFName.of('FontFile2')) ||
      descriptor.lookup(PDFName.of('FontFile3')) ||
      descriptor.lookup(PDFName.of('FontFile'))
    if (!(streamObj instanceof PDFRawStream)) continue

    let bytes: Uint8Array
    try {
      bytes = decodePDFRawStream(streamObj).decode()
    } catch {
      continue
    }
    if (!bytes || bytes.length < 4) continue

    const cleanName = baseFont.replace(SUBSET_PREFIX, '')
    const dedupeKey = `${baseFont}:${bytes.length}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const flags = numberOf(descriptor, 'Flags') ?? 0
    const italicAngle = numberOf(descriptor, 'ItalicAngle') ?? 0
    const nameStr = cleanName.toLowerCase()

    out.push({
      baseFont,
      cleanName,
      bold:
        /bold|black|heavy|semibold|demibold|extrabold/.test(nameStr) ||
        !!(flags & 0x40000) /* ForceBold */ ||
        (numberOf(descriptor, 'StemV') ?? 0) >= 140,
      italic: /italic|oblique/.test(nameStr) || !!(flags & 0x40) || italicAngle !== 0,
      serif: !!(flags & 0x2) || /times|serif|georgia|roman|garamond|minion|cambria|palatino|century/.test(nameStr),
      mono: !!(flags & 0x1) || /mono|courier|consol|menlo|code|fixed/.test(nameStr),
      bytes,
    })
  }
  return out
}

/** Non-whitespace code points that must have a glyph for the font to be usable. */
function significantCodePoints(text: string): number[] {
  const cps = new Set<number>()
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    if (cp === 0x20 || cp === 0x09 || cp === 0x0a || cp === 0x0d) continue
    cps.add(cp)
  }
  return [...cps]
}

/** True when the embedded font has a glyph for every significant character. */
function fontCovers(font: PDFFont, text: string): boolean {
  const fk = (font as unknown as { embedder?: { font?: { hasGlyphForCodePoint?(cp: number): boolean } } }).embedder?.font
  if (!fk || typeof fk.hasGlyphForCodePoint !== 'function') return false
  for (const cp of significantCodePoints(text)) {
    if (!fk.hasGlyphForCodePoint(cp)) return false
  }
  return true
}

/** The font's ascent as a fraction of the em, for baseline reconstruction. */
function ascentFraction(font: PDFFont): number | undefined {
  const fk = (font as unknown as { embedder?: { font?: { ascent?: number; unitsPerEm?: number } } }).embedder?.font
  if (fk && fk.unitsPerEm && fk.ascent) return fk.ascent / fk.unitsPerEm
  return undefined
}

export interface ResolvedEmbeddedFont {
  font: PDFFont
  /** Ascent as a fraction of the em (baseline offset from the box top). */
  ascentFrac?: number
}

/**
 * Resolves and lazily re-embeds the document's own fonts for text edits,
 * matching each edit to the closest embedded program by family + weight/style.
 */
export class ContentFontProvider {
  private records: EmbeddedFontRecord[]
  /** Cache the embed attempt per base font (`null` = tried and unusable). */
  private embedded = new Map<string, PDFFont | null>()

  constructor(private pdf: PDFDocument) {
    try {
      this.records = extractEmbeddedFonts(pdf)
    } catch {
      this.records = []
    }
  }

  get hasEmbeddedFonts(): boolean {
    return this.records.length > 0
  }

  /** Score how well a record matches an edit; 0 means unrelated. */
  private score(rec: EmbeddedFontRecord, keys: string[], bold: boolean, italic: boolean): number {
    const recKey = familyKey(rec.cleanName)
    if (!recKey) return 0
    let best = 0
    for (const k of keys) {
      if (!k) continue
      if (k === recKey) best = Math.max(best, 100)
      else if (k.length >= 3 && recKey.length >= 3 && (k.includes(recKey) || recKey.includes(k))) {
        best = Math.max(best, 55)
      }
    }
    if (best === 0) return 0
    if (rec.bold === bold) best += 12
    else best -= 8
    if (rec.italic === italic) best += 12
    else best -= 8
    return best
  }

  private match(edit: TextContentEdit): EmbeddedFontRecord | null {
    if (!this.records.length) return null
    const bold = !!edit.bold
    const italic = !!edit.italic
    const keys = [edit.originalFontName, edit.fontFamily, edit.loadedFontFamily]
      .filter(Boolean)
      .map((n) => familyKey(n as string))
      .filter(Boolean)

    let best: EmbeddedFontRecord | null = null
    let bestScore = 0
    for (const rec of this.records) {
      const s = this.score(rec, keys, bold, italic)
      if (s > bestScore) {
        bestScore = s
        best = rec
      }
    }
    if (best) return best

    // Single-font documents (common for résumés/letters): if the run was
    // embedded and nothing name-matched, the sole embedded font is almost
    // certainly the right one.
    if (this.records.length === 1 && edit.embeddedFont) return this.records[0]
    return null
  }

  private async embed(rec: EmbeddedFontRecord): Promise<PDFFont | null> {
    const cached = this.embedded.get(rec.baseFont)
    if (cached !== undefined) return cached
    let font: PDFFont | null
    try {
      font = await this.pdf.embedFont(rec.bytes, { subset: true })
    } catch {
      try {
        // Some CFF/CID programs can't be subset — embed the whole program.
        font = await this.pdf.embedFont(rec.bytes, { subset: false })
      } catch {
        font = null
      }
    }
    this.embedded.set(rec.baseFont, font)
    return font
  }

  /**
   * The original embedded font for this edit, or `null` if none matches or the
   * match can't render every character the user typed.
   */
  async fontFor(edit: TextContentEdit): Promise<ResolvedEmbeddedFont | null> {
    const rec = this.match(edit)
    if (!rec) return null
    const font = await this.embed(rec)
    if (!font) return null
    if (!fontCovers(font, edit.text)) return null
    return { font, ascentFrac: ascentFraction(font) }
  }
}
