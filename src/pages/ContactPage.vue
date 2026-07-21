<script setup lang="ts">
  /** ContactPage — contact form + channel cards. */
  import { ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import { CONTACT_CHANNELS } from '@constants'
  import { useFeedback } from '@composables'

  const { showToast } = useFeedback()
  const form = ref({ name: '', email: '', message: '' })

  function submit() {
    showToast('Message sent — we’ll reply soon!')
    form.value = { name: '', email: '', message: '' }
  }
</script>

<template>
  <section class="pf-contact">
    <h1 class="pf-contact__title">Get in touch</h1>
    <p class="pf-contact__lede">
      Have a question or feedback? We’d love to hear from you — most messages get a reply within a
      few hours.
    </p>

    <div class="pf-contact__grid">
      <BaseCard>
        <form class="pf-contact__form" @submit.prevent="submit">
          <div class="pf-contact__row">
            <div>
              <label class="pf-contact__label">Name</label>
              <BaseInput v-model="form.name" placeholder="Your name" />
            </div>
            <div>
              <label class="pf-contact__label">Email</label>
              <BaseInput v-model="form.email" icon="mail" placeholder="you@email.com" />
            </div>
          </div>
          <div>
            <label class="pf-contact__label">Message</label>
            <textarea
              v-model="form.message"
              class="pf-contact__textarea"
              rows="5"
              placeholder="How can we help?"
            />
          </div>
          <BaseButton type="submit" icon-right="arrow-right">Send message</BaseButton>
        </form>
      </BaseCard>

      <div class="pf-contact__channels">
        <BaseCard v-for="channel in CONTACT_CHANNELS" :key="channel.label">
          <div class="pf-channel">
            <div class="pf-channel__icon"><BaseIcon :name="channel.icon" :size="19" /></div>
            <div>
              <div class="pf-channel__label">{{ channel.label }}</div>
              <div class="pf-channel__value">{{ channel.value }}</div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .pf-contact {
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
    padding: 56px 24px 0;
  }
  .pf-contact__title {
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  .pf-contact__lede {
    font-size: 16.5px;
    color: hsl(var(--color-text-muted));
    margin: 0 0 32px;
    max-width: 520px;
  }
  .pf-contact__grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 24px;
    align-items: start;
  }
  .pf-contact__form {
    padding: 26px;
    display: grid;
    gap: 16px;
  }
  .pf-contact__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .pf-contact__label {
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    display: block;
    margin-bottom: 7px;
  }
  .pf-contact__textarea {
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
  }
  .pf-contact__textarea:focus {
    border-color: hsl(var(--color-primary));
  }
  .pf-contact__channels {
    display: grid;
    gap: 14px;
  }
  .pf-channel {
    padding: 18px;
    display: flex;
    gap: 13px;
    align-items: center;
  }
  .pf-channel__icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: hsl(var(--color-primary) / 0.12);
    color: hsl(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-channel__label {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
    font-weight: 600;
  }
  .pf-channel__value {
    font-weight: 700;
    color: hsl(var(--color-text));
    font-size: 14.5px;
  }
  @media (max-width: 899px) {
    .pf-contact__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
