<script setup lang="ts">
/**
 * RibbonGroup — renders a single labelled ribbon group (a cluster of tool
 * buttons + its footer label). Shared by three consumers in the ribbon:
 *   • the visible groups row
 *   • the hidden width-measurer (ghost)
 *   • the responsive "More" overflow popover
 *
 * State (active / disabled) is supplied by the parent as predicate props so
 * the group stays a dumb, reusable presentational unit.
 */
import BaseIcon from '@components/icons/BaseIcon.vue'
import type { RibbonGroup, RibbonItem } from './editor-tools'

defineProps<{
  group: RibbonGroup
  /** Predicate — is this item currently the active tool/mode? */
  isActive: (item: RibbonItem) => boolean
  /** Predicate — is this item disabled right now? */
  isDisabled: (item: RibbonItem) => boolean
  /** Popover variant packs items tighter and drops the footer label. */
  variant?: 'row' | 'stacked'
}>()

const emit = defineEmits<{ select: [RibbonItem] }>()
</script>

<template>
  <div class="rg" :class="`rg--${variant ?? 'row'}`">
    <div class="rg__items">
      <button
        v-for="item in group.items"
        :key="item.id"
        type="button"
        class="rg__btn"
        :class="{ 'rg__btn--active': isActive(item), 'rg__btn--soon': item.soon }"
        :disabled="isDisabled(item)"
        :title="item.soon
          ? `${item.label} — coming soon`
          : item.shortcut ? `${item.label} (${item.shortcut})` : item.label"
        @click="emit('select', item)"
      >
        <BaseIcon :name="item.icon" :size="19" />
        <span class="rg__label">{{ item.label }}</span>
        <span v-if="item.soon" class="rg__soon-dot" aria-hidden="true" />
      </button>
    </div>
    <div class="rg__footer">{{ group.label }}</div>
  </div>
</template>

<style scoped>
.rg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: none;
}
.rg__items {
  display: flex;
  align-items: stretch;
  gap: 2px;
}

/* ── Big icon-over-label buttons (default ribbon look) ────────────────── */
.rg__btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  width: 62px;
  padding: 8px 6px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: none;
  color: hsl(var(--color-text-muted));
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.rg__label {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: center;
  max-width: 100%;
}
.rg__btn:hover:not(:disabled) {
  background: hsl(var(--color-chip));
  color: hsl(var(--color-text));
}
.rg__btn:active:not(:disabled) {
  transform: translateY(0.5px);
}
.rg__btn--active {
  background: hsl(var(--color-primary) / 0.1);
  border-color: hsl(var(--color-primary) / 0.3);
  color: hsl(var(--color-primary));
}
.rg__btn--active:hover:not(:disabled) {
  background: hsl(var(--color-primary) / 0.14);
  color: hsl(var(--color-primary));
}
.rg__btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.rg__btn:focus-visible {
  outline: 2px solid hsl(var(--color-primary) / 0.6);
  outline-offset: 1px;
}
.rg__soon-dot {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
  background: hsl(var(--color-warning));
}

.rg__footer {
  font-size: 9.5px;
  font-weight: 700;
  color: hsl(var(--color-text-faint));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
  user-select: none;
}

/* ── Stacked variant used inside the overflow popover ─────────────────── */
.rg--stacked {
  align-items: stretch;
  gap: 4px;
}
.rg--stacked .rg__items {
  flex-wrap: wrap;
  gap: 4px;
}
.rg--stacked .rg__footer {
  order: -1;
  text-align: left;
  margin-bottom: 2px;
}
</style>
