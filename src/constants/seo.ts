/**
 * SEO constants — canonical site identity used by page metadata, structured
 * data, the HTML sitemap and the static robots.txt / sitemap.xml files.
 *
 * NOTE: keep `SITE_URL` in sync with the production domain and the values in
 * `public/robots.txt` and `public/sitemap.xml`.
 */

/** Canonical production origin (no trailing slash). */
export const SITE_URL = 'https://www.pdfly.com'

/** Public-facing brand name. */
export const SITE_NAME = 'PDFly'

/** Legal entity used in copyright and legal documents. */
export const LEGAL_ENTITY = 'PDFly, Inc.'

/** Default social-share image (absolute path resolved against SITE_URL). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.png`

/** One-line description used as the site-wide default. */
export const DEFAULT_DESCRIPTION =
  'PDFly is a free, secure suite of 30+ online PDF tools — compress, convert, merge, split, edit, sign and protect PDFs right in your browser. Files are encrypted and auto-deleted.'
