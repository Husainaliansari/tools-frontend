<script setup lang="ts">
  /**
   * SupportForm — the shared Contact / Feedback form.
   *
   * Fields: name, email, subject, message, an optional category (feedback
   * variant only) and an optional image attachment (JPG/JPEG/PNG/WebP ≤ 1 MB).
   *
   * Spam protection is layered: a hidden honeypot field, a server-issued math
   * captcha, and server-side per-IP rate limiting + a once-per-day cap. The
   * form performs full client-side validation before submitting and surfaces
   * clear inline success and error messages (plus a toast).
   */
  import { computed, onMounted, reactive, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseSelect from '@components/ui/BaseSelect.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { feedbackService, type CaptchaChallenge } from '@services'
  import { useFeedback } from '@composables'

  const props = withDefaults(
    defineProps<{
      /** 'contact' hides the category picker; 'feedback' shows it. */
      variant?: 'contact' | 'feedback'
      /** Override the submit button label. */
      submitLabel?: string
    }>(),
    { variant: 'contact', submitLabel: 'Send message' },
  )

  const { showToast } = useFeedback()

  // ─── Category options (feedback variant) ──────────────────────────────────
  const CATEGORY_LABELS: Record<string, string> = {
    'General feedback': 'general',
    'Bug report': 'bug',
    'Feature request': 'feature',
    'UI/UX suggestion': 'ui_ux',
    'Performance issue': 'performance',
    Other: 'other',
  }
  const categoryOptions = Object.keys(CATEGORY_LABELS)

  // ─── Attachment rules (mirror the backend) ────────────────────────────────
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const ALLOWED_LABEL = 'JPG, JPEG, PNG or WebP'
  const MAX_BYTES = 1 * 1024 * 1024 // 1 MB

  // ─── Form state ───────────────────────────────────────────────────────────
  const form = reactive({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: categoryOptions[0],
    // Hidden honeypot — must remain empty.
    website: '',
  })

  const attachment = ref<File | null>(null)
  const attachmentPreview = ref<string | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)

  const errors = reactive<Record<string, string>>({})
  const submitting = ref(false)
  const submitted = ref(false)
  const serverError = ref('')

  // ─── Captcha ──────────────────────────────────────────────────────────────
  const captcha = ref<CaptchaChallenge | null>(null)
  const captchaAnswer = ref('')
  const captchaLoading = ref(false)

  async function loadCaptcha(): Promise<void> {
    captchaLoading.value = true
    captchaAnswer.value = ''
    try {
      captcha.value = await feedbackService.getCaptcha()
    } catch {
      captcha.value = null
    } finally {
      captchaLoading.value = false
    }
  }

  onMounted(loadCaptcha)

  // ─── Attachment handling ──────────────────────────────────────────────────
  function onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    delete errors.attachment

    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.attachment = `Attachments must be an image (${ALLOWED_LABEL}).`
      clearAttachment()
      return
    }
    if (file.size > MAX_BYTES) {
      errors.attachment = 'The attachment must be 1 MB or smaller.'
      clearAttachment()
      return
    }

    attachment.value = file
    if (attachmentPreview.value) URL.revokeObjectURL(attachmentPreview.value)
    attachmentPreview.value = URL.createObjectURL(file)
  }

  function clearAttachment(): void {
    attachment.value = null
    if (attachmentPreview.value) {
      URL.revokeObjectURL(attachmentPreview.value)
      attachmentPreview.value = null
    }
    if (fileInput.value) fileInput.value.value = ''
  }

  const attachmentSizeLabel = computed(() => {
    if (!attachment.value) return ''
    const kb = attachment.value.size / 1024
    return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.round(kb)} KB`
  })

  // ─── Validation ───────────────────────────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function validate(): boolean {
    Object.keys(errors).forEach((k) => delete errors[k])

    if (!form.name.trim()) errors.name = 'Please enter your name.'
    else if (form.name.trim().length > 120) errors.name = 'Name is too long.'

    if (!form.email.trim()) errors.email = 'Please enter your email address.'
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.'

    if (!form.subject.trim()) errors.subject = 'Please add a subject.'
    else if (form.subject.trim().length > 200) errors.subject = 'Subject is too long.'

    if (!form.message.trim()) errors.message = 'Please write a message.'
    else if (form.message.trim().length < 10)
      errors.message = 'Your message is a little short — please add more detail.'
    else if (form.message.trim().length > 5000) errors.message = 'Message is too long.'

    if (!captchaAnswer.value.trim()) errors.captcha = 'Please answer the question above.'

    return Object.keys(errors).length === 0
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function submit(): Promise<void> {
    serverError.value = ''
    if (!validate()) {
      showToast('Please fix the highlighted fields.', 'error')
      return
    }
    if (!captcha.value) {
      serverError.value = 'The verification challenge could not load. Please refresh and try again.'
      return
    }

    submitting.value = true
    try {
      await feedbackService.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        category: props.variant === 'feedback' ? CATEGORY_LABELS[form.category] : 'general',
        captchaToken: captcha.value.token,
        captchaAnswer: captchaAnswer.value.trim(),
        honeypot: form.website,
        attachment: attachment.value,
      })
      submitted.value = true
      showToast('Message sent — thank you! We’ll be in touch.', 'success')
    } catch (err: unknown) {
      serverError.value = extractError(err)
      showToast(serverError.value, 'error')
      // A used/expired captcha can't be reused — fetch a fresh one.
      await loadCaptcha()
    } finally {
      submitting.value = false
    }
  }

  /** Pull a human-readable message out of the API error envelope. */
  function extractError(err: unknown): string {
    const e = err as {
      response?: { status?: number; data?: { error?: { message?: string } } }
    }
    const apiMessage = e?.response?.data?.error?.message
    if (apiMessage) return apiMessage
    if (e?.response?.status === 429)
      return 'Too many attempts. Please wait a minute and try again.'
    return 'Something went wrong sending your message. Please try again in a moment.'
  }

  function reset(): void {
    submitted.value = false
    serverError.value = ''
    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
    form.category = categoryOptions[0]
    clearAttachment()
    void loadCaptcha()
  }
</script>

<template>
  <div class="pf-support">
    <!-- Success state -->
    <div v-if="submitted" class="pf-support__success" role="status">
      <div class="pf-support__success-icon"><BaseIcon name="check-circle" :size="30" /></div>
      <h3 class="pf-support__success-title">Message sent!</h3>
      <p class="pf-support__success-body">
        Thanks for reaching out. We’ve received your message and will reply to
        <strong>{{ form.email || 'your email' }}</strong> as soon as we can.
      </p>
      <BaseButton variant="secondary" icon="message-square" @click="reset">
        Send another message
      </BaseButton>
    </div>

    <!-- Form -->
    <form v-else class="pf-support__form" novalidate @submit.prevent="submit">
      <!-- Server / global error -->
      <div v-if="serverError" class="pf-support__alert" role="alert">
        <BaseIcon name="alert-circle" :size="18" />
        <span>{{ serverError }}</span>
      </div>

      <div class="pf-support__row">
        <div class="pf-field">
          <label class="pf-field__label" for="sf-name">Name</label>
          <BaseInput
            id="sf-name"
            v-model="form.name"
            placeholder="Your name"
            :invalid="!!errors.name"
            autocomplete="name"
          />
          <span v-if="errors.name" class="pf-field__error">{{ errors.name }}</span>
        </div>
        <div class="pf-field">
          <label class="pf-field__label" for="sf-email">Email</label>
          <BaseInput
            id="sf-email"
            v-model="form.email"
            icon="mail"
            placeholder="you@email.com"
            :invalid="!!errors.email"
            autocomplete="email"
          />
          <span v-if="errors.email" class="pf-field__error">{{ errors.email }}</span>
        </div>
      </div>

      <div class="pf-support__row" :class="{ 'pf-support__row--split': variant === 'feedback' }">
        <div class="pf-field">
          <label class="pf-field__label" for="sf-subject">Subject</label>
          <BaseInput
            id="sf-subject"
            v-model="form.subject"
            placeholder="What’s this about?"
            :invalid="!!errors.subject"
          />
          <span v-if="errors.subject" class="pf-field__error">{{ errors.subject }}</span>
        </div>
        <div v-if="variant === 'feedback'" class="pf-field">
          <label class="pf-field__label">Category</label>
          <BaseSelect v-model="form.category" :options="categoryOptions" />
        </div>
      </div>

      <div class="pf-field">
        <label class="pf-field__label" for="sf-message">Message</label>
        <textarea
          id="sf-message"
          v-model="form.message"
          class="pf-textarea"
          :class="{ 'pf-textarea--invalid': errors.message }"
          rows="6"
          placeholder="How can we help?"
        />
        <span v-if="errors.message" class="pf-field__error">{{ errors.message }}</span>
      </div>

      <!-- Attachment -->
      <div class="pf-field">
        <label class="pf-field__label">
          Attachment <span class="pf-field__optional">(optional)</span>
        </label>
        <input
          ref="fileInput"
          type="file"
          class="sr-only"
          accept="image/jpeg,image/png,image/webp"
          @change="onFileChange"
        />
        <div v-if="!attachment" class="pf-support__dropzone" @click="fileInput?.click()">
          <BaseIcon name="image" :size="20" />
          <span>Add an image — {{ ALLOWED_LABEL }}, up to 1 MB</span>
        </div>
        <div v-else class="pf-support__attachment">
          <img :src="attachmentPreview!" alt="Attachment preview" class="pf-support__thumb" />
          <div class="pf-support__attachment-meta">
            <div class="pf-support__attachment-name">{{ attachment.name }}</div>
            <div class="pf-support__attachment-size">{{ attachmentSizeLabel }}</div>
          </div>
          <button
            type="button"
            class="pf-support__attachment-remove"
            aria-label="Remove attachment"
            @click="clearAttachment"
          >
            <BaseIcon name="x" :size="17" />
          </button>
        </div>
        <span v-if="errors.attachment" class="pf-field__error">{{ errors.attachment }}</span>
      </div>

      <!-- Captcha -->
      <div class="pf-field">
        <label class="pf-field__label" for="sf-captcha">Verification</label>
        <div class="pf-support__captcha">
          <div class="pf-support__captcha-q">
            <BaseIcon name="shield" :size="16" />
            <span v-if="captcha">{{ captcha.question }}</span>
            <span v-else-if="captchaLoading">Loading…</span>
            <span v-else>Couldn’t load — refresh</span>
            <button
              type="button"
              class="pf-support__captcha-refresh"
              aria-label="New question"
              :disabled="captchaLoading"
              @click="loadCaptcha"
            >
              <BaseIcon name="refresh" :size="15" />
            </button>
          </div>
          <BaseInput
            id="sf-captcha"
            v-model="captchaAnswer"
            placeholder="Answer"
            :invalid="!!errors.captcha"
          />
        </div>
        <span v-if="errors.captcha" class="pf-field__error">{{ errors.captcha }}</span>
      </div>

      <!-- Honeypot (visually hidden, off-screen; bots fill it, humans don't) -->
      <div class="pf-support__honeypot" aria-hidden="true">
        <label for="sf-website">Website</label>
        <input id="sf-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <div class="pf-support__actions">
        <BaseButton type="submit" icon-right="arrow-right" :loading="submitting" full>
          {{ submitLabel }}
        </BaseButton>
        <p class="pf-support__privacy">
          By submitting, you agree to our
          <RouterLink :to="{ name: 'privacy' }" class="pf-support__link">Privacy Policy</RouterLink>.
          We never share your details.
        </p>
      </div>
    </form>
  </div>
</template>

<style scoped>
  .pf-support {
    width: 100%;
  }
  .pf-support__form {
    display: grid;
    gap: 18px;
  }
  .pf-support__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .pf-support__row:not(.pf-support__row--split) {
    grid-template-columns: 1fr 1fr;
  }

  .pf-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .pf-field__label {
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .pf-field__optional {
    font-weight: 500;
    color: hsl(var(--color-text-faint));
  }
  .pf-field__error {
    font-size: 12.5px;
    color: hsl(var(--color-danger));
    font-weight: 500;
  }

  .pf-textarea {
    width: 100%;
    padding: 12px 14px;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    outline: none;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.15s;
  }
  .pf-textarea:focus {
    border-color: hsl(var(--color-primary));
  }
  .pf-textarea--invalid,
  .pf-textarea--invalid:focus {
    border-color: hsl(var(--color-danger));
  }

  /* Alert */
  .pf-support__alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--radius-lg);
    background: hsl(var(--color-danger) / 0.1);
    border: 1px solid hsl(var(--color-danger) / 0.3);
    color: hsl(var(--color-danger));
    font-size: 14px;
    font-weight: 500;
  }

  /* Dropzone */
  .pf-support__dropzone {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px;
    border: 1.5px dashed hsl(var(--color-border-strong));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    color: hsl(var(--color-text-muted));
    font-size: 13.5px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  .pf-support__dropzone:hover {
    border-color: hsl(var(--color-primary));
    color: hsl(var(--color-primary));
  }

  /* Attachment chip */
  .pf-support__attachment {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface));
  }
  .pf-support__thumb {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: var(--radius-md);
    flex: none;
  }
  .pf-support__attachment-meta {
    flex: 1;
    min-width: 0;
  }
  .pf-support__attachment-name {
    font-size: 13.5px;
    font-weight: 600;
    color: hsl(var(--color-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-support__attachment-size {
    font-size: 12px;
    color: hsl(var(--color-text-faint));
  }
  .pf-support__attachment-remove {
    flex: none;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: hsl(var(--color-text-faint));
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .pf-support__attachment-remove:hover {
    background: hsl(var(--color-danger) / 0.12);
    color: hsl(var(--color-danger));
  }

  /* Captcha */
  .pf-support__captcha {
    display: grid;
    grid-template-columns: 1fr 140px;
    gap: 12px;
    align-items: center;
  }
  .pf-support__captcha-q {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 14px;
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    background: hsl(var(--color-surface-muted));
    font-size: 14.5px;
    font-weight: 700;
    color: hsl(var(--color-text));
  }
  .pf-support__captcha-q > span {
    flex: 1;
  }
  .pf-support__captcha-refresh {
    display: flex;
    border: none;
    background: none;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    padding: 2px;
  }
  .pf-support__captcha-refresh:hover {
    color: hsl(var(--color-primary));
  }
  .pf-support__captcha-refresh:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* Honeypot — kept in the DOM but out of sight and out of the tab order. */
  .pf-support__honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .pf-support__actions {
    display: grid;
    gap: 12px;
    margin-top: 2px;
  }
  .pf-support__privacy {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }
  .pf-support__link {
    color: hsl(var(--color-primary));
    font-weight: 600;
  }
  .pf-support__link:hover {
    text-decoration: underline;
  }

  /* Success */
  .pf-support__success {
    text-align: center;
    padding: 32px 24px;
    display: grid;
    justify-items: center;
    gap: 8px;
  }
  .pf-support__success-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-success) / 0.14);
    color: hsl(var(--color-success));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
  }
  .pf-support__success-title {
    font-size: 22px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0;
  }
  .pf-support__success-body {
    font-size: 15px;
    color: hsl(var(--color-text-muted));
    max-width: 420px;
    line-height: 1.6;
    margin: 0 0 14px;
  }

  @media (max-width: 640px) {
    .pf-support__row,
    .pf-support__captcha {
      grid-template-columns: 1fr;
    }
  }
</style>
