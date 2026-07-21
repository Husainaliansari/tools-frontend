<script setup lang="ts">
  /**
   * FaqItem — self-contained expand/collapse question row.
   */
  import { ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  defineProps<{
    question: string
    answer: string
  }>()

  const open = ref(false)
</script>

<template>
  <div class="pf-faq">
    <button type="button" class="pf-faq__head" :aria-expanded="open" @click="open = !open">
      <span>{{ question }}</span>
      <span class="pf-faq__chevron" :class="{ 'pf-faq__chevron--open': open }">
        <BaseIcon name="chevron-down" :size="20" />
      </span>
    </button>
    <div v-if="open" class="pf-faq__body animate-fade-up">{{ answer }}</div>
  </div>
</template>

<style scoped>
  .pf-faq {
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    background: hsl(var(--color-surface));
    overflow: hidden;
  }
  .pf-faq__head {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 18px 20px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: hsl(var(--color-text));
    font-weight: 700;
    font-size: 15.5px;
  }
  .pf-faq__chevron {
    color: hsl(var(--color-primary));
    transition: transform 0.2s;
    flex: none;
    display: flex;
  }
  .pf-faq__chevron--open {
    transform: rotate(180deg);
  }
  .pf-faq__body {
    padding: 0 20px 18px;
    font-size: 14.5px;
    color: hsl(var(--color-text-muted));
    line-height: 1.6;
  }
</style>
