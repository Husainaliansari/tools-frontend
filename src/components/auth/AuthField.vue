<script setup lang="ts">
  /**
   * AuthField — labelled input used by the auth forms. Password fields get a
   * reveal toggle automatically.
   */
  import BaseInput from '@components/ui/BaseInput.vue'

  defineProps<{
    label: string
    placeholder?: string
    icon?: string
    type?: string
    password?: boolean
    autocomplete?: string
  }>()

  const model = defineModel<string>({ default: '' })
</script>

<template>
  <div>
    <label class="pf-auth-field__label">{{ label }}</label>
    <BaseInput
      v-model="model"
      :icon="icon"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :revealable="password"
      :autocomplete="autocomplete"
    />
  </div>
</template>

<style scoped>
  .pf-auth-field__label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    margin-bottom: 7px;
  }
</style>
