/**
 * Feedback / Contact backend service.
 *
 * Mirrors the FastAPI contract:
 *   GET  /api/v1/feedback/captcha        -> issues a math captcha challenge
 *   POST /api/v1/feedback                multipart/form-data submission
 *
 * The submission is multipart so it can carry an optional image attachment.
 * Spam is deterred server-side by a per-IP rate limit, a hidden honeypot
 * field, the math captcha and a once-per-day limit.
 */
import { apiClient } from '@api/client'
import type { ApiEnvelope } from '@types'

const API = '/api/v1'

/** A math captcha challenge the user must solve before submitting. */
export interface CaptchaChallenge {
  token: string
  question: string
  expires_in: number
}

/** Read model returned after a successful submission. */
export interface FeedbackResult {
  id: string
  name: string
  email: string
  subject: string | null
  category: string
  message: string
  attachment_name: string | null
  created_at: string
}

/** Fields accepted by the submission endpoint. */
export interface FeedbackSubmission {
  name: string
  email: string
  message: string
  subject?: string
  category?: string
  captchaToken: string
  captchaAnswer: string
  /** Hidden honeypot — must stay empty for real users. */
  honeypot?: string
  attachment?: File | null
}

export const feedbackService = {
  /** Fetch a fresh captcha challenge. */
  async getCaptcha(): Promise<CaptchaChallenge> {
    const { data } = await apiClient.get<ApiEnvelope<CaptchaChallenge>>(`${API}/feedback/captcha`)
    return data.data
  },

  /** Submit a contact / feedback message (multipart). */
  async submit(payload: FeedbackSubmission): Promise<FeedbackResult> {
    const form = new FormData()
    form.append('name', payload.name)
    form.append('email', payload.email)
    form.append('message', payload.message)
    form.append('category', payload.category ?? 'general')
    if (payload.subject) form.append('subject', payload.subject)
    form.append('captcha_token', payload.captchaToken)
    form.append('captcha_answer', payload.captchaAnswer)
    // Honeypot field name matches the backend ("website").
    if (payload.honeypot) form.append('website', payload.honeypot)
    if (payload.attachment) form.append('attachment', payload.attachment)

    const { data } = await apiClient.post<ApiEnvelope<FeedbackResult>>(`${API}/feedback`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
}
