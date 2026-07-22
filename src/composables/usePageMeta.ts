/**
 * usePageMeta — declarative per-page SEO metadata.
 *
 * Manages the document title, meta description, canonical link, Open Graph and
 * Twitter Card tags, robots directives and optional JSON-LD structured data.
 * Call it once from a page's `<script setup>`; values may be plain, refs or
 * getters and are kept in sync reactively. Tags created by a page are cleaned
 * up (or reset) when the page unmounts so metadata never leaks between routes.
 *
 * @example
 * usePageMeta({
 *   title: 'Contact — PDFly',
 *   description: 'Get in touch with the PDFly team.',
 *   structuredData: () => ({ '@context': 'https://schema.org', '@type': 'ContactPage' }),
 * })
 */
import { onScopeDispose, toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useRoute } from 'vue-router'
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '@constants/seo'

export interface PageMetaOptions {
  title?: MaybeRefOrGetter<string | undefined>
  description?: MaybeRefOrGetter<string | undefined>
  /** Absolute or root-relative canonical path. Defaults to the current route. */
  canonical?: MaybeRefOrGetter<string | undefined>
  /** Social share image (absolute URL). */
  image?: MaybeRefOrGetter<string | undefined>
  /** Open Graph type, e.g. 'website' | 'article'. */
  type?: MaybeRefOrGetter<string | undefined>
  /** When true, emit `noindex, nofollow` (used for utility pages like 404). */
  noindex?: MaybeRefOrGetter<boolean | undefined>
  /** A JSON-LD object (or array of objects) for rich results. */
  structuredData?: MaybeRefOrGetter<object | object[] | undefined>
}

const JSONLD_ATTR = 'data-page-jsonld'

/** Create-or-update a `<meta>` tag keyed by a name/property attribute. */
function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Create-or-update the canonical `<link>`. */
function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Resolve a canonical path/URL to an absolute URL on the production origin. */
function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE_URL}${path === '/' ? '' : path}`
}

export function usePageMeta(options: PageMetaOptions): void {
  const route = useRoute()

  watchEffect(() => {
    const title = toValue(options.title) ?? `${SITE_NAME} — Every tool you need to work with PDFs`
    const description = toValue(options.description) ?? DEFAULT_DESCRIPTION
    const image = toValue(options.image) ?? DEFAULT_OG_IMAGE
    const type = toValue(options.type) ?? 'website'
    const noindex = toValue(options.noindex) ?? false
    const canonical = absoluteUrl(toValue(options.canonical) ?? route.path)

    document.title = title

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertCanonical(canonical)

    // Open Graph
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', image)

    // Twitter Card
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)

    // JSON-LD structured data (replace any previous page-owned block).
    document.head.querySelectorAll(`script[${JSONLD_ATTR}]`).forEach((n) => n.remove())
    const data = toValue(options.structuredData)
    if (data) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute(JSONLD_ATTR, 'true')
      script.textContent = JSON.stringify(data)
      document.head.appendChild(script)
    }
  })

  // Remove page-owned structured data when navigating away.
  onScopeDispose(() => {
    document.head.querySelectorAll(`script[${JSONLD_ATTR}]`).forEach((n) => n.remove())
  })
}
