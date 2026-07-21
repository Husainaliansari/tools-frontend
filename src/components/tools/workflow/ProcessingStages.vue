<script setup lang="ts">
  /**
   * ProcessingStages — the Upload → Process → Done step indicator shown
   * during a run. Steps light up from the live file statuses; the active
   * step pulses. Fixed height so stage changes never shift the layout.
   */
  import { computed } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import type { ToolFile } from '@types'

  const props = defineProps<{
    files: ToolFile[]
    /** Overall 0–100 progress, used as a fallback signal. */
    progress: number
  }>()

  type StepState = 'pending' | 'active' | 'done'

  const uploadState = computed<StepState>(() => {
    if (props.files.some((file) => file.status === 'uploading')) return 'active'
    if (props.files.some((file) => file.status === 'waiting') && props.progress === 0)
      return 'pending'
    return 'done'
  })

  const processState = computed<StepState>(() => {
    if (props.files.some((file) => file.status === 'converting')) return 'active'
    if (
      props.files.length &&
      props.files.every((file) => file.status === 'completed' || file.status === 'failed')
    )
      return 'done'
    return uploadState.value === 'done' ? 'active' : 'pending'
  })

  const doneState = computed<StepState>(() =>
    processState.value === 'done' ? 'done' : 'pending',
  )

  const steps = computed(() => [
    { key: 'upload', label: 'Upload', icon: 'upload', state: uploadState.value },
    { key: 'process', label: 'Process', icon: 'settings', state: processState.value },
    { key: 'done', label: 'Download', icon: 'download', state: doneState.value },
  ])
</script>

<template>
  <ol class="pf-stages" aria-label="Processing stages">
    <template v-for="(step, index) in steps" :key="step.key">
      <li v-if="index > 0" class="pf-stages__link" aria-hidden="true">
        <span
          class="pf-stages__link-fill"
          :class="{ 'pf-stages__link-fill--on': step.state !== 'pending' }"
        />
      </li>
      <li class="pf-stages__step" :class="`pf-stages__step--${step.state}`" :aria-current="step.state === 'active' ? 'step' : undefined">
        <span class="pf-stages__dot">
          <BaseIcon v-if="step.state === 'done'" name="check" :size="13" />
          <BaseIcon v-else :name="step.icon" :size="13" />
          <span v-if="step.state === 'active'" class="pf-stages__halo" aria-hidden="true" />
        </span>
        <span class="pf-stages__label">{{ step.label }}</span>
      </li>
    </template>
  </ol>
</template>

<style scoped>
  .pf-stages {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
    max-width: 380px;
    height: 58px;
  }
  .pf-stages__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .pf-stages__dot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text-faint));
    transition:
      background 0.3s ease,
      color 0.3s ease,
      box-shadow 0.3s ease;
  }
  .pf-stages__step--active .pf-stages__dot {
    background: hsl(var(--color-primary));
    color: #fff;
    box-shadow: 0 4px 14px -4px hsl(var(--color-primary) / 0.6);
  }
  .pf-stages__step--done .pf-stages__dot {
    background: hsl(var(--color-success) / 0.15);
    color: hsl(var(--color-success));
  }
  .pf-stages__halo {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid hsl(var(--color-primary) / 0.5);
    animation: pf-stage-halo 1.6s ease-out infinite;
  }
  .pf-stages__label {
    font-size: 11.5px;
    font-weight: 700;
    color: hsl(var(--color-text-faint));
    transition: color 0.3s ease;
  }
  .pf-stages__step--active .pf-stages__label {
    color: hsl(var(--color-primary));
  }
  .pf-stages__step--done .pf-stages__label {
    color: hsl(var(--color-text-muted));
  }
  .pf-stages__link {
    flex: 1;
    height: 2px;
    max-width: 70px;
    border-radius: var(--radius-full);
    background: hsl(var(--color-chip));
    overflow: hidden;
    margin-bottom: 18px;
  }
  .pf-stages__link-fill {
    display: block;
    height: 100%;
    width: 0;
    border-radius: inherit;
    background: hsl(var(--color-primary));
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .pf-stages__link-fill--on {
    width: 100%;
  }

  @keyframes pf-stage-halo {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.7);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-stages__halo {
      animation: none;
      opacity: 0;
    }
    .pf-stages__link-fill {
      transition: none;
    }
  }
</style>
