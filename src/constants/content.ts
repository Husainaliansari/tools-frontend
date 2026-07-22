/**
 * Static marketing copy for the info pages (About, Help, Pricing).
 * Legal document copy lives in `legal.ts`.
 */
import type { FaqEntry } from '@types'

// ─── About page ──────────────────────────────────────────────────────────────

export interface AboutStat {
  value: string
  label: string
}

/** Headline numbers shown on the About page. */
export const ABOUT_STATS: AboutStat[] = [
  { value: '30+', label: 'PDF tools' },
  { value: '40,000+', label: 'weekly users' },
  { value: '2M+', label: 'files processed' },
  { value: '2 hrs', label: 'until files auto-delete' },
]

export interface AboutFeature {
  icon: string
  title: string
  body: string
}

/** What the platform offers — the “everything in one place” pitch. */
export const ABOUT_FEATURES: AboutFeature[] = [
  {
    icon: 'layers',
    title: 'One toolkit for everything',
    body: 'Compress, convert, merge, split, edit, sign, protect and OCR — over 30 tools that work together, so you never juggle five different apps again.',
  },
  {
    icon: 'zap',
    title: 'Fast and effortless',
    body: 'Drag, drop, done. Many tools run instantly right in your browser, with a clean interface that never gets in your way.',
  },
  {
    icon: 'monitor',
    title: 'Works everywhere',
    body: 'No installs, no plugins. PDFly runs on any modern browser, on desktop, tablet or phone — Windows, macOS, Linux and mobile alike.',
  },
  {
    icon: 'shield',
    title: 'Private by design',
    body: 'Files are encrypted in transit and at rest, processed only for the task you chose, and automatically deleted within two hours.',
  },
]

export interface AboutPillar {
  icon: string
  title: string
  body: string
}

/** Trust / security pillars. */
export const ABOUT_PILLARS: AboutPillar[] = [
  {
    icon: 'lock',
    title: 'Bank-grade encryption',
    body: 'Every upload and download is protected with 256-bit TLS encryption, and files are encrypted at rest while being processed.',
  },
  {
    icon: 'clock',
    title: 'Automatic deletion',
    body: 'We keep your files only as long as it takes to run your tool. Everything is permanently erased within two hours — usually much sooner.',
  },
  {
    icon: 'eye-off',
    title: 'No snooping, ever',
    body: 'We never read, sell, or analyse the content of your documents, and we don’t use your files to train any models.',
  },
  {
    icon: 'check-circle',
    title: 'Built to last',
    body: 'A reliable, monitored platform with a 99.9% uptime target so your work is there when you need it.',
  },
]

export interface AboutValue {
  title: string
  body: string
}

/** Company values / principles. */
export const ABOUT_VALUES: AboutValue[] = [
  {
    title: 'Privacy first',
    body: 'We collect as little as possible and treat your documents as strictly yours. Privacy isn’t a feature — it’s the foundation.',
  },
  {
    title: 'Simplicity always',
    body: 'Powerful doesn’t have to mean complicated. We obsess over making every tool obvious and quick.',
  },
  {
    title: 'Free for everyone',
    body: 'The core tools are free with generous limits, because working with documents shouldn’t require a subscription.',
  },
  {
    title: 'Honest and open',
    body: 'Clear pricing, plain-language policies, and no dark patterns. We say what we do and do what we say.',
  },
]

/** About-page FAQ (why-trust-us angle). */
export const ABOUT_FAQS: FaqEntry[] = [
  {
    question: 'Who is behind PDFly?',
    answer:
      'PDFly is built by a small, independent team of engineers and designers who were tired of clunky, expensive PDF software. We started in 2024 and have been improving the toolkit ever since.',
  },
  {
    question: 'How can PDFly be free?',
    answer:
      'The core tools are free and supported by our optional Pro and Enterprise plans, plus non-intrusive advertising. Upgrading unlocks larger files, batch processing and higher limits.',
  },
  {
    question: 'Is it really safe to upload my documents?',
    answer:
      'Yes. Files are encrypted in transit and at rest, used only to perform the tool you selected, and automatically deleted within two hours. Many tools even process your file entirely in your browser.',
  },
  {
    question: 'Do you sell my data?',
    answer:
      'Never. We do not sell personal information and we do not use the content of your files for advertising or model training. See our Privacy Policy for the full details.',
  },
]

// ─── Help center ─────────────────────────────────────────────────────────────

export interface HelpCategory {
  icon: string
  title: string
  articles: string
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { icon: 'upload', title: 'Getting started', articles: '8 articles' },
  { icon: 'compress', title: 'Tools & features', articles: '24 articles' },
  { icon: 'credit-card', title: 'Billing & plans', articles: '11 articles' },
  { icon: 'shield', title: 'Privacy & security', articles: '9 articles' },
  { icon: 'user', title: 'Account', articles: '7 articles' },
  { icon: 'zap', title: 'Troubleshooting', articles: '13 articles' },
]

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricingPlan {
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  cta: string
  featured?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Everything you need for everyday PDF tasks.',
    features: [
      'All 30+ tools',
      'Files up to 50 MB',
      '3 tasks per day',
      'Files deleted after 2 hours',
    ],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '$9',
    cadence: 'per month',
    description: 'For professionals who work with PDFs daily.',
    features: [
      'Everything in Free',
      'Files up to 1 GB',
      'Unlimited tasks',
      'Batch processing',
      'Priority processing',
      '10 GB cloud storage',
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'contact us',
    description: 'Advanced controls and support for teams.',
    features: [
      'Everything in Pro',
      'SSO & SAML',
      'Team management',
      'Audit logs',
      'Dedicated support',
      'Custom SLAs',
    ],
    cta: 'Contact sales',
  },
]
