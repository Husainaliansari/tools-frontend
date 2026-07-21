/**
 * Static marketing copy for the prose info pages and help center.
 */

export interface ProseSection {
  heading: string
  body: string
}

export interface ProseContent {
  title: string
  subtitle: string
  sections: ProseSection[]
}

export const ABOUT_CONTENT: ProseContent = {
  title: 'About PDFly',
  subtitle: 'Making documents effortless for everyone.',
  sections: [
    {
      heading: 'Our mission',
      body: 'We believe working with PDFs shouldn’t require expensive software or a computer science degree. PDFly brings together every tool you need in one fast, friendly place — free for everyone.',
    },
    {
      heading: 'The story',
      body: 'PDFly started in 2024 when our founders got tired of juggling five different apps just to compress and merge a report. Today, more than 40,000 people rely on PDFly every week.',
    },
    {
      heading: 'Our values',
      body: 'Privacy first, speed always, and simplicity above all. Your files are yours — we never store them longer than needed and never sell your data.',
    },
  ],
}

export const PRIVACY_CONTENT: ProseContent = {
  title: 'Privacy Policy',
  subtitle: 'Last updated May 1, 2026',
  sections: [
    {
      heading: 'Overview',
      body: 'This Privacy Policy explains how PDFly handles your information. In short: we collect as little as possible and never sell your data.',
    },
    {
      heading: 'Your files',
      body: 'Uploaded files are encrypted in transit and at rest, processed to perform the tool you requested, and automatically deleted within two hours. We do not read, share, or analyze the content of your documents.',
    },
    {
      heading: 'Data we collect',
      body: 'We collect basic account information (name, email) and anonymous usage analytics to improve the product. You can request deletion of your account and data at any time.',
    },
    {
      heading: 'Cookies',
      body: 'We use essential cookies to keep you signed in and remember your preferences. We do not use third-party advertising cookies.',
    },
  ],
}

export const TERMS_CONTENT: ProseContent = {
  title: 'Terms & Conditions',
  subtitle: 'Last updated May 1, 2026',
  sections: [
    {
      heading: 'Acceptance',
      body: 'By using PDFly you agree to these Terms. If you do not agree, please do not use the service.',
    },
    {
      heading: 'Acceptable use',
      body: 'You agree not to upload unlawful content or use PDFly to infringe the rights of others. We reserve the right to suspend accounts that violate these terms.',
    },
    {
      heading: 'Service availability',
      body: 'We aim for 99.9% uptime but the service is provided “as is” without warranties. We are not liable for any loss of data — always keep your own backups.',
    },
    {
      heading: 'Changes',
      body: 'We may update these Terms from time to time. Continued use after changes constitutes acceptance of the new Terms.',
    },
  ],
}

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

export interface ContactChannel {
  icon: string
  label: string
  value: string
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  { icon: 'mail', label: 'Email', value: 'hello@pdfly.com' },
  { icon: 'phone', label: 'Phone', value: '+1 (555) 021-8890' },
  { icon: 'globe', label: 'Office', value: 'San Francisco, CA' },
]

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
      'All 29 tools',
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
