<script setup lang="ts">
  /**
   * BaseInput — text input with optional leading icon and password reveal.
   * Uses v-model for two-way binding.
   *
   * @example
   * <BaseInput v-model="query" icon="search" placeholder="Search tools…" />
   */
  import { computed, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  const props = withDefaults(
    defineProps<{
      modelValue?: string
      type?: string
      placeholder?: string
      icon?: string
      /** Render a show/hide toggle (implies a password field). */
      revealable?: boolean
      /** Paint the field with an error state (red border). */
      invalid?: boolean
      id?: string
      autocomplete?: string
    }>(),
    { type: 'text', modelValue: '' },
  )

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const revealed = ref(false)
  const resolvedType = computed(() => {
    if (props.revealable) return revealed.value ? 'text' : 'password'
    return props.type
  })

  function onInput(event: Event) {
    emit('update:modelValue', (event.target as HTMLInputElement).value)
  }
</script>

<template>
  <div class="pf-input">
    <span v-if="icon" class="pf-input__icon">
      <BaseIcon :name="icon" :size="17" />
    </span>
    <input
      :id="id"
      :type="resolvedType"
      :placeholder="placeholder"
      :value="modelValue"
      :autocomplete="autocomplete"
      :class="{
        'pf-input__field--icon': icon,
        'pf-input__field--reveal': revealable,
        'pf-input__field--invalid': invalid,
      }"
      :aria-invalid="invalid || undefined"
      class="pf-input__field"
      @input="onInput"
    />
    <button
      v-if="revealable"
      type="button"
      class="pf-input__reveal"
      :aria-label="revealed ? 'Hide password' : 'Show password'"
      @click="revealed = !revealed"
    >
      <BaseIcon :name="revealed ? 'eye-off' : 'eye'" :size="17" />
    </button>
    <slot name="suffix" />
  </div>
</template>

<style scoped>
  .pf-input {
    position: relative;
    width: 100%;
  }
  .pf-input__icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: hsl(var(--color-text-faint));
    pointer-events: none;
    display: flex;
  }
  .pf-input__field {
    width: 100%;
    padding: 12px 14px;
    font-size: 14.5px;
    color: hsl(var(--color-text));
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    outline: none;
    transition: border-color 0.15s;
  }
  .pf-input__field--icon {
    padding-left: 42px;
  }
  .pf-input__field--reveal {
    padding-right: 42px;
  }
  .pf-input__field:focus {
    border-color: hsl(var(--color-primary));
  }
  .pf-input__field--invalid,
  .pf-input__field--invalid:focus {
    border-color: hsl(var(--color-danger));
  }
  .pf-input__field::placeholder {
    color: hsl(var(--color-text-faint));
  }
  .pf-input__reveal {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: hsl(var(--color-text-faint));
    cursor: pointer;
    display: flex;
  }
</style>
