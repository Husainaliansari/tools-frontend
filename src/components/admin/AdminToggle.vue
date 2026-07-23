<script setup lang="ts">
  const props = defineProps<{ modelValue: boolean; disabled?: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

  function toggle() {
    if (!props.disabled) emit('update:modelValue', !props.modelValue)
  }
</script>

<template>
  <button
    type="button"
    class="ad-toggle"
    :class="{ 'is-on': modelValue }"
    :disabled="disabled"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span class="ad-toggle__knob" />
  </button>
</template>

<style scoped>
  .ad-toggle {
    width: 40px;
    height: 22px;
    border-radius: 999px;
    background: var(--ad-chip);
    border: 1px solid var(--ad-border);
    padding: 2px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    flex: none;
  }
  .ad-toggle.is-on { background: var(--ad-primary); border-color: var(--ad-primary); }
  .ad-toggle:disabled { opacity: 0.5; cursor: default; }
  .ad-toggle__knob {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #fff;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .ad-toggle.is-on .ad-toggle__knob { transform: translateX(18px); }
</style>
