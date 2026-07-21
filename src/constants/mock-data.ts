/**
 * Mock data for the demo experience.
 * Stands in for API responses until the backend is wired up.
 */
import type { AppNotification, DownloadItem, FaqEntry, Job, MockFile } from '@types'

/** Demo account presented throughout the authenticated app. */
export const DEMO_USER = {
  name: 'Amara Okafor',
  email: 'amara@northwind.co',
  plan: 'Pro',
  initials: 'AO',
  since: 'Mar 2024',
  phone: '+1 (555) 021-8890',
  company: 'Northwind Co.',
  role: 'Operations Lead',
  location: 'San Francisco, CA',
} as const

export const MOCK_FILES: readonly MockFile[] = [
  {
    name: 'Q3 Financial Report.pdf',
    size: '4.2 MB',
    pages: 28,
    type: 'PDF',
    modified: '2 hours ago',
    tool: 'Compressed',
    color: '#dc2626',
  },
  {
    name: 'Northwind Contract v3.pdf',
    size: '1.1 MB',
    pages: 12,
    type: 'PDF',
    modified: 'Yesterday',
    tool: 'Signed',
    color: '#7c3aed',
  },
  {
    name: 'Team Handbook.docx',
    size: '820 KB',
    pages: 44,
    type: 'DOCX',
    modified: '2 days ago',
    tool: 'Converted',
    color: '#2563eb',
  },
  {
    name: 'Product Roadmap.pdf',
    size: '6.7 MB',
    pages: 9,
    type: 'PDF',
    modified: '3 days ago',
    tool: 'Merged',
    color: '#16a34a',
  },
  {
    name: 'Invoice-2048.pdf',
    size: '240 KB',
    pages: 2,
    type: 'PDF',
    modified: 'Apr 28',
    tool: 'Protected',
    color: '#d97706',
  },
  {
    name: 'Design Assets.png',
    size: '3.4 MB',
    pages: 1,
    type: 'PNG',
    modified: 'Apr 26',
    tool: 'Uploaded',
    color: '#db2777',
  },
  {
    name: 'Onboarding Deck.pptx',
    size: '12.1 MB',
    pages: 34,
    type: 'PPTX',
    modified: 'Apr 22',
    tool: 'Converted',
    color: '#ea580c',
  },
  {
    name: 'Scanned Receipts.pdf',
    size: '9.8 MB',
    pages: 16,
    type: 'PDF',
    modified: 'Apr 20',
    tool: 'OCR',
    color: '#c026d3',
  },
] as const

export const MOCK_JOBS: readonly Job[] = [
  {
    id: 'JOB-4821',
    tool: 'Compress PDF',
    file: 'Q4 Analytics Export.pdf',
    status: 'processing',
    progress: 64,
    eta: '~40s left',
    color: '#16a34a',
  },
  {
    id: 'JOB-4820',
    tool: 'Merge PDF',
    file: 'Contract bundle (5 files)',
    status: 'processing',
    progress: 22,
    eta: '~2m left',
    color: '#2563eb',
  },
  {
    id: 'JOB-4817',
    tool: 'PDF to Word',
    file: 'Research Paper.pdf',
    status: 'queued',
    progress: 0,
    eta: 'Waiting in queue',
    color: '#2563eb',
  },
  {
    id: 'JOB-4815',
    tool: 'OCR PDF',
    file: 'Legacy Archive.pdf',
    status: 'done',
    progress: 100,
    eta: 'Completed 5m ago',
    color: '#c026d3',
  },
  {
    id: 'JOB-4809',
    tool: 'Protect PDF',
    file: 'Board Minutes.pdf',
    status: 'failed',
    progress: 0,
    eta: 'File corrupted',
    color: '#dc2626',
  },
] as const

export const MOCK_DOWNLOADS: readonly DownloadItem[] = [
  {
    name: 'Q3 Financial Report (compressed).pdf',
    size: '1.8 MB',
    type: 'PDF',
    date: 'Today, 10:24',
    color: '#dc2626',
  },
  {
    name: 'Northwind Contract (signed).pdf',
    size: '1.1 MB',
    type: 'PDF',
    date: 'Yesterday, 16:02',
    color: '#7c3aed',
  },
  {
    name: 'Team Handbook.docx',
    size: '820 KB',
    type: 'DOCX',
    date: 'May 2, 09:41',
    color: '#2563eb',
  },
  {
    name: 'Roadmap pages 1-9.pdf',
    size: '6.7 MB',
    type: 'PDF',
    date: 'May 1, 14:20',
    color: '#16a34a',
  },
  {
    name: 'Slides export.zip',
    size: '18.4 MB',
    type: 'ZIP',
    date: 'Apr 29, 11:15',
    color: '#64748b',
  },
  {
    name: 'Receipts (searchable).pdf',
    size: '7.2 MB',
    type: 'PDF',
    date: 'Apr 27, 08:03',
    color: '#c026d3',
  },
] as const

export const MOCK_NOTIFICATIONS: readonly AppNotification[] = [
  {
    icon: 'check-circle',
    color: '#16a34a',
    title: 'Compression finished',
    description: 'Q3 Financial Report is ready to download.',
    time: '2m',
  },
  {
    icon: 'key',
    color: '#7c3aed',
    title: 'Signature requested',
    description: 'Daniel Reyes signed Northwind Contract.',
    time: '1h',
  },
  {
    icon: 'zap',
    color: '#d97706',
    title: 'Storage 78% full',
    description: 'Consider clearing old downloads.',
    time: '3h',
  },
] as const

/** General FAQ shared by the home page and FAQ page. */
export const GENERAL_FAQS: readonly FaqEntry[] = [
  {
    question: 'Is PDFly really free?',
    answer:
      'Yes. All 29 tools are free to use with generous daily limits. Upgrade to Pro only if you need larger files, batch processing and no limits.',
  },
  {
    question: 'Are my files safe?',
    answer:
      'Absolutely. Files are encrypted in transit, processed securely, and permanently deleted from our servers within two hours.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. PDFly runs entirely in your browser — nothing to download or install, on any device.',
  },
  {
    question: 'What file formats are supported?',
    answer:
      'PDF, Word, Excel, PowerPoint, JPG and PNG, depending on the tool. Each tool lists its supported formats.',
  },
  {
    question: 'Can I use PDFly on mobile?',
    answer:
      'Yes, the whole experience is fully responsive and works beautifully on phones and tablets.',
  },
] as const
