<script setup lang="ts">
  /**
   * BaseToggle — on/off switch bound with v-model.
   */
  const props = defineProps<{
    modelValue: boolean
    label?: string
  }>()

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    class="pf-toggle"
    :class="{ 'pf-toggle--on': modelValue }"
    @click="emit('update:modelValue', !props.modelValue)"
  >
    <span class="pf-toggle__knob" />
  </button>
</template>

<style scoped>
  .pf-toggle {
    width: 46px;
    height: 26px;
    border-radius: var(--radius-full);
    border: none;
    cursor: pointer;
    background: hsl(var(--color-border-strong));
    position: relative;
    transition: background 0.2s;
    flex: none;
  }
  .pf-toggle--on {
    background: hsl(var(--color-primary));
  }
  .pf-toggle__knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    transition: left 0.2s;
  }
  .pf-toggle--on .pf-toggle__knob {
    left: 23px;
  }
</style>
