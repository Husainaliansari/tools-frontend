/**
 * Legal document content — Privacy Policy, Terms & Conditions, Disclaimer and
 * Cookie Policy. Structured so a single `LegalDocument` component can render a
 * table of contents plus richly formatted sections (paragraphs and lists).
 *
 * The copy is original, written for PDFly, and intentionally comprehensive to
 * satisfy programme requirements (e.g. Google AdSense) and to give users a
 * clear, honest account of how the service works. It is provided as a
 * production-ready template and is not a substitute for legal advice.
 */

export interface LegalBlock {
  type: 'paragraph' | 'list'
  /** Paragraph text (when `type` is 'paragraph'). */
  text?: string
  /** Bullet items (when `type` is 'list'). */
  items?: string[]
}

export interface LegalSection {
  /** Stable slug used for the anchor link and table of contents. */
  id: string
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDocumentContent {
  title: string
  /** Short summary shown under the title. */
  summary: string
  effectiveDate: string
  intro: LegalBlock[]
  sections: LegalSection[]
}

const CONTACT_NOTE =
  'If you have any questions about this document, please reach out through our Contact page — we respond to every message.'

// ─── Privacy Policy ──────────────────────────────────────────────────────────
export const PRIVACY_DOC: LegalDocumentContent = {
  title: 'Privacy Policy',
  summary:
    'How PDFly collects, uses, protects and retains your information — and the choices and rights you have over your data.',
  effectiveDate: 'Last updated: July 1, 2026',
  intro: [
    {
      type: 'paragraph',
      text: 'At PDFly we build tools that help you work with documents, not tools that mine your data. This Privacy Policy explains what information we collect when you use our website and services, why we collect it, how we protect it, and the control you have over it. We have written it in plain language and kept data collection to the minimum needed to run a fast, reliable service.',
    },
    {
      type: 'paragraph',
      text: 'This policy applies to the PDFly website, web application and related services (together, the “Service”). By using the Service you agree to the practices described here. If you do not agree, please discontinue use of the Service.',
    },
  ],
  sections: [
    {
      id: 'information-we-collect',
      heading: '1. Information we collect',
      blocks: [
        {
          type: 'paragraph',
          text: 'We collect only what we need to provide, secure and improve the Service. This falls into a few categories:',
        },
        {
          type: 'list',
          items: [
            'Files you upload: the documents you submit to a tool for processing (for example a PDF you want to compress or convert). These are handled as described in “How we process your files” below.',
            'Account information: if you create an account, we store your name, email address and a securely hashed password. We never store your password in plain text.',
            'Billing information: if you subscribe to a paid plan, our payment processor collects the payment details needed to complete the transaction. We do not store full card numbers on our servers.',
            'Usage and device data: anonymous, aggregated analytics such as which tools are used, browser type, approximate region and general performance metrics that help us fix bugs and improve reliability.',
            'Communications: if you contact us or submit feedback, we keep the message, your email address and any attachment you choose to include so we can respond.',
          ],
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '2. How we use your information',
      blocks: [
        { type: 'paragraph', text: 'We use the information we collect to:' },
        {
          type: 'list',
          items: [
            'Perform the specific task you requested (such as converting or merging a document).',
            'Create and maintain your account and keep you signed in.',
            'Process payments and manage subscriptions.',
            'Detect, prevent and respond to fraud, abuse, security incidents and technical issues.',
            'Understand which features are useful so we can improve and prioritise our roadmap.',
            'Respond to your questions, feedback and support requests.',
            'Comply with our legal obligations and enforce our Terms & Conditions.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We do not sell your personal information, and we do not use the content of your documents for advertising or to train machine-learning models.',
        },
      ],
    },
    {
      id: 'file-processing',
      heading: '3. How we process your files',
      blocks: [
        {
          type: 'paragraph',
          text: 'Your files are yours. When you upload a document we use it solely to perform the operation you selected. Files are encrypted in transit (TLS) and at rest while they are being processed.',
        },
        {
          type: 'list',
          items: [
            'Uploaded files and their generated results are stored temporarily and automatically deleted from our servers within two hours of processing.',
            'Many tools run entirely inside your browser, in which case the file never leaves your device at all.',
            'We do not open, read, share or analyse the content of your documents beyond what is technically required to run the tool.',
            'You can delete a file from your session at any time, which removes it from our processing storage immediately.',
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '4. Cookies and similar technologies',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use cookies and similar technologies to keep you signed in, remember your preferences (such as light or dark mode) and understand aggregate usage. You can control cookies through your browser settings. For a full breakdown of the cookies we use, please see our Cookie Policy.',
        },
      ],
    },
    {
      id: 'analytics',
      heading: '5. Analytics and third-party services',
      blocks: [
        {
          type: 'paragraph',
          text: 'We rely on a small number of trusted third-party providers to operate the Service, for example cloud hosting, analytics, error monitoring, email delivery and payment processing. These providers process data only on our instructions and under agreements that require them to protect it.',
        },
        {
          type: 'paragraph',
          text: 'If we display advertising, advertising partners such as Google may use cookies to serve ads based on your prior visits to this or other websites. You can opt out of personalised advertising through your Google Ads Settings or via aboutads.info. Any advertising is kept separate from the content of your documents.',
        },
      ],
    },
    {
      id: 'data-retention',
      heading: '6. Data retention',
      blocks: [
        {
          type: 'list',
          items: [
            'Uploaded files and results: automatically deleted within two hours.',
            'Account data: retained while your account is active and deleted on request or a reasonable period after account closure.',
            'Billing records: retained as long as required by tax and accounting law.',
            'Support messages and feedback: retained only as long as needed to assist you and improve the Service.',
          ],
        },
      ],
    },
    {
      id: 'your-rights',
      heading: '7. Your rights and choices',
      blocks: [
        {
          type: 'paragraph',
          text: 'Depending on where you live, you may have rights under laws such as the GDPR or CCPA, including the right to:',
        },
        {
          type: 'list',
          items: [
            'Access the personal data we hold about you.',
            'Correct inaccurate or incomplete data.',
            'Request deletion of your account and associated data.',
            'Object to or restrict certain processing.',
            'Receive a portable copy of your data.',
            'Withdraw consent where processing is based on consent.',
          ],
        },
        {
          type: 'paragraph',
          text: 'To exercise any of these rights, contact us through the Contact page. We will respond within the timeframe required by applicable law.',
        },
      ],
    },
    {
      id: 'security',
      heading: '8. Security',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use industry-standard measures to protect your data, including TLS encryption, encryption at rest, access controls, and continuous monitoring. No method of transmission or storage is completely secure, so while we work hard to protect your information we cannot guarantee absolute security. Always keep your own backups of important documents.',
        },
      ],
    },
    {
      id: 'children',
      heading: '9. Children’s privacy',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service is not directed to children under 13 (or the minimum age required in your country). We do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us and we will delete it.',
        },
      ],
    },
    {
      id: 'international',
      heading: '10. International data transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'PDFly operates globally and may process data in countries other than your own. Where we transfer personal data internationally, we use appropriate safeguards such as standard contractual clauses to ensure your data remains protected.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Changes to this policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this Privacy Policy from time to time. When we make material changes we will update the “Last updated” date above and, where appropriate, notify you. Continued use of the Service after changes take effect constitutes acceptance of the revised policy.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Contact us',
      blocks: [{ type: 'paragraph', text: CONTACT_NOTE }],
    },
  ],
}

// ─── Terms & Conditions ──────────────────────────────────────────────────────
export const TERMS_DOC: LegalDocumentContent = {
  title: 'Terms & Conditions',
  summary:
    'The agreement between you and PDFly: your responsibilities, acceptable use, plans and payments, and the limits of our liability.',
  effectiveDate: 'Last updated: July 1, 2026',
  intro: [
    {
      type: 'paragraph',
      text: 'These Terms & Conditions (the “Terms”) govern your access to and use of the PDFly website, web application and services (the “Service”). Please read them carefully. By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.',
    },
  ],
  sections: [
    {
      id: 'acceptance',
      heading: '1. Acceptance of terms',
      blocks: [
        {
          type: 'paragraph',
          text: 'By creating an account, uploading a file, or otherwise using the Service, you confirm that you are at least the age of majority in your jurisdiction (or have permission from a parent or guardian) and that you accept these Terms and our Privacy Policy.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: '2. Your account',
      blocks: [
        {
          type: 'list',
          items: [
            'You are responsible for keeping your login credentials confidential and for all activity under your account.',
            'You must provide accurate information and keep it up to date.',
            'You must notify us promptly of any unauthorised use of your account.',
            'You may use the Service without an account for many tools; some features require registration.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: '3. Acceptable use',
      blocks: [
        { type: 'paragraph', text: 'You agree not to use the Service to:' },
        {
          type: 'list',
          items: [
            'Upload, process or distribute content that is unlawful, infringing, defamatory, or that violates the rights of others.',
            'Process documents you do not have the legal right to use.',
            'Attempt to bypass usage limits, security controls, or authentication.',
            'Reverse engineer, scrape, overload, or disrupt the Service or its infrastructure.',
            'Upload malware or any code intended to harm the Service or other users.',
            'Resell or redistribute the Service without our written permission.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We may suspend or terminate access for any account that violates these rules, and we may remove content that breaches them.',
        },
      ],
    },
    {
      id: 'plans-payments',
      heading: '4. Subscription plans and payments',
      blocks: [
        {
          type: 'list',
          items: [
            'PDFly offers a free tier and paid subscription plans. Current features and prices are shown on our Pricing page.',
            'Paid subscriptions renew automatically at the end of each billing cycle unless cancelled beforehand.',
            'You authorise us and our payment processor to charge your payment method for the applicable fees plus any taxes.',
            'You can cancel at any time from your account settings; cancellation takes effect at the end of the current billing period.',
            'We may change prices with reasonable prior notice; changes apply to the next billing cycle.',
          ],
        },
      ],
    },
    {
      id: 'refunds',
      heading: '5. Refunds',
      blocks: [
        {
          type: 'paragraph',
          text: 'If you are not satisfied with a paid plan, contact us within 14 days of your initial purchase and we will consider a refund in accordance with applicable consumer-protection law. Refunds are generally not provided for renewal charges or for partial billing periods, except where required by law.',
        },
      ],
    },
    {
      id: 'intellectual-property',
      heading: '6. Intellectual property',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service, including its software, design, branding and content (excluding your files), is owned by PDFly and protected by intellectual-property laws. We grant you a limited, non-exclusive, non-transferable licence to use the Service for its intended purpose.',
        },
        {
          type: 'paragraph',
          text: 'You retain all rights to the files you upload. By using a tool, you grant us only the limited, temporary licence needed to process your file and deliver the result back to you.',
        },
      ],
    },
    {
      id: 'service-availability',
      heading: '7. Service availability and limitations',
      blocks: [
        {
          type: 'paragraph',
          text: 'We work hard to keep the Service available and reliable, but we do not guarantee uninterrupted or error-free operation. The Service is provided on an “as is” and “as available” basis. We may modify, suspend or discontinue any part of the Service at any time, and we may impose usage limits (such as file size or daily task limits) that vary by plan.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '8. Limitation of liability',
      blocks: [
        {
          type: 'paragraph',
          text: 'To the maximum extent permitted by law, PDFly and its affiliates will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of data, revenue or profits, arising out of or related to your use of the Service. Our total liability for any claim relating to the Service will not exceed the amount you paid to us in the twelve months before the claim, or USD 100 if you use the Service for free.',
        },
        {
          type: 'paragraph',
          text: 'Always keep your own backups of important documents. We are not responsible for loss of files, and you use the Service at your own risk.',
        },
      ],
    },
    {
      id: 'indemnity',
      heading: '9. Indemnification',
      blocks: [
        {
          type: 'paragraph',
          text: 'You agree to indemnify and hold harmless PDFly and its team from any claims, damages, liabilities and expenses arising from your misuse of the Service or your violation of these Terms or the rights of any third party.',
        },
      ],
    },
    {
      id: 'termination',
      heading: '10. Termination',
      blocks: [
        {
          type: 'paragraph',
          text: 'You may stop using the Service and close your account at any time. We may suspend or terminate your access if you breach these Terms, if required by law, or if continuing to provide the Service becomes impractical. Upon termination, the licences granted to you end, though provisions that by their nature should survive (such as liability limits) will remain in effect.',
        },
      ],
    },
    {
      id: 'governing-law',
      heading: '11. Governing law and changes',
      blocks: [
        {
          type: 'paragraph',
          text: 'These Terms are governed by the laws of the jurisdiction in which PDFly is established, without regard to conflict-of-law rules. We may update these Terms from time to time; the “Last updated” date reflects the latest version. Continued use after changes take effect constitutes acceptance of the revised Terms.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Contact us',
      blocks: [{ type: 'paragraph', text: CONTACT_NOTE }],
    },
  ],
}

// ─── Disclaimer ──────────────────────────────────────────────────────────────
export const DISCLAIMER_DOC: LegalDocumentContent = {
  title: 'Disclaimer',
  summary:
    'Important information about the limits of the Service, processing accuracy, your responsibility for your files, and third-party tools.',
  effectiveDate: 'Last updated: July 1, 2026',
  intro: [
    {
      type: 'paragraph',
      text: 'The information and tools provided by PDFly (the “Service”) are offered for general use on an “as is” and “as available” basis. While we strive for accuracy and reliability, this Disclaimer explains the limits of what we can promise. By using the Service you acknowledge and accept the points below.',
    },
  ],
  sections: [
    {
      id: 'general',
      heading: '1. General information only',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service and any content on our website are provided for general informational and productivity purposes. Nothing on the site constitutes legal, financial, or professional advice. You should not rely on the Service as a substitute for professional judgement where such judgement is appropriate.',
        },
      ],
    },
    {
      id: 'processing-accuracy',
      heading: '2. Processing accuracy',
      blocks: [
        {
          type: 'paragraph',
          text: 'PDF processing — including conversion, compression, OCR, and text extraction — depends heavily on the structure and quality of the source file. We do not warrant that every operation will be perfectly accurate, complete, or free of formatting changes.',
        },
        {
          type: 'list',
          items: [
            'Converted documents may differ in layout, fonts, or spacing from the original.',
            'Optical character recognition (OCR) results depend on scan quality and may contain errors.',
            'Compression reduces file size and may reduce image quality.',
            'Always review processed files before relying on them for important purposes.',
          ],
        },
      ],
    },
    {
      id: 'file-responsibility',
      heading: '3. Responsibility for your files',
      blocks: [
        {
          type: 'paragraph',
          text: 'You are solely responsible for the files you upload and for ensuring you have the legal right to process them. You are responsible for keeping your own backups. Because files are automatically deleted a short time after processing, we cannot recover a file once it has been removed. We are not liable for any loss, corruption or unauthorised access to your documents outside our reasonable control.',
        },
      ],
    },
    {
      id: 'third-party',
      heading: '4. Third-party services and links',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service may rely on or link to third-party tools, libraries and websites. We do not control and are not responsible for the content, policies or practices of any third party. The inclusion of a link or integration does not imply our endorsement. Any advertising displayed on the Service is provided by third-party networks and is not an endorsement of the advertised products.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '5. Availability and results',
      blocks: [
        {
          type: 'paragraph',
          text: 'We do not guarantee that the Service will always be available, uninterrupted, secure, or error-free, or that results will meet your specific requirements. Features may change or be discontinued without notice.',
        },
      ],
    },
    {
      id: 'limitation',
      heading: '6. Limitation of liability',
      blocks: [
        {
          type: 'paragraph',
          text: 'To the fullest extent permitted by law, PDFly will not be liable for any direct, indirect, incidental or consequential damages resulting from your use of, or inability to use, the Service — including any loss of data, profits or goodwill. Your use of the Service is entirely at your own risk. This Disclaimer should be read together with our Terms & Conditions.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '7. Contact us',
      blocks: [{ type: 'paragraph', text: CONTACT_NOTE }],
    },
  ],
}

// ─── Cookie Policy ───────────────────────────────────────────────────────────
export const COOKIE_DOC: LegalDocumentContent = {
  title: 'Cookie Policy',
  summary:
    'What cookies are, the types PDFly uses, why we use them, and how you can control them.',
  effectiveDate: 'Last updated: July 1, 2026',
  intro: [
    {
      type: 'paragraph',
      text: 'This Cookie Policy explains how PDFly uses cookies and similar technologies when you visit our website. It should be read alongside our Privacy Policy. By continuing to use the Service, you consent to the use of cookies as described here, except where consent is required and you have declined it.',
    },
  ],
  sections: [
    {
      id: 'what-are-cookies',
      heading: '1. What are cookies?',
      blocks: [
        {
          type: 'paragraph',
          text: 'Cookies are small text files placed on your device when you visit a website. They let the site remember your actions and preferences over time. We also use similar technologies such as local storage and pixels, which we refer to collectively as “cookies” in this policy.',
        },
      ],
    },
    {
      id: 'types',
      heading: '2. Types of cookies we use',
      blocks: [
        {
          type: 'list',
          items: [
            'Strictly necessary cookies: required for the Service to function, such as keeping you signed in and protecting forms against abuse. These cannot be switched off.',
            'Preference cookies: remember choices such as your theme (light or dark mode) and language so your experience is consistent.',
            'Analytics cookies: help us understand how visitors use the Service, in aggregate, so we can improve it. These collect anonymous, statistical information.',
            'Advertising cookies: if advertising is shown, these may be set by advertising partners such as Google to measure and personalise ads. You can opt out of personalised advertising in your ad settings.',
          ],
        },
      ],
    },
    {
      id: 'why',
      heading: '3. Why we use cookies',
      blocks: [
        { type: 'paragraph', text: 'We use cookies to:' },
        {
          type: 'list',
          items: [
            'Keep you securely signed in and maintain your session.',
            'Remember your preferences and settings.',
            'Protect our forms and services against spam and abuse.',
            'Measure and improve the performance and usability of the Service.',
            'Support advertising where it is displayed.',
          ],
        },
      ],
    },
    {
      id: 'third-party-cookies',
      heading: '4. Third-party cookies',
      blocks: [
        {
          type: 'paragraph',
          text: 'Some cookies are set by third-party services we use, such as analytics providers, payment processors and, where applicable, advertising networks including Google. These parties may use cookies to provide their services and, in the case of advertising, to show relevant ads. Their use of cookies is governed by their own privacy and cookie policies.',
        },
      ],
    },
    {
      id: 'managing',
      heading: '5. How to manage cookies',
      blocks: [
        {
          type: 'paragraph',
          text: 'You can control and delete cookies through your browser settings. Most browsers let you refuse or remove cookies and alert you when a cookie is set. Please note that disabling certain cookies — especially strictly necessary ones — may affect how the Service works, including keeping you signed in.',
        },
        {
          type: 'list',
          items: [
            'Adjust cookie settings in your browser’s privacy or security preferences.',
            'Opt out of personalised Google advertising via your Google Ads Settings.',
            'Learn about behavioural advertising and opt-out choices at aboutads.info and youronlinechoices.eu.',
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '6. Changes to this policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this Cookie Policy as our practices or the law change. The “Last updated” date shows when it was last revised. We encourage you to review it periodically.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '7. Contact us',
      blocks: [{ type: 'paragraph', text: CONTACT_NOTE }],
    },
  ],
}
