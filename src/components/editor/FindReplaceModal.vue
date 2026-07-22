<script setup lang="ts">
/**
 * FindReplaceModal — Foxit/Adobe-style Find & Replace dialog.
 */
import { ref, watch, onMounted } from 'vue'
import BaseIcon from '@components/icons/BaseIcon.vue'
import { useEditor } from './useEditor'

const emit = defineEmits<{ close: [] }>()
const editor = useEditor()

const replaceInput = ref('')
const searchInput = ref(editor.searchQuery.value)
const statusMsg = ref('')

watch(searchInput, (query) => {
  editor.runSearch(query)
})

onMounted(() => {
  if (searchInput.value) {
    editor.runSearch(searchInput.value)
  }
})

async function onReplaceCurrent(): Promise<void> {
  if (!editor.searchResults.value.length || editor.searchActive.value < 0) return
  await editor.replaceActive(replaceInput.value)
  statusMsg.value = 'Replaced match'
}

async function onReplaceAll(): Promise<void> {
  if (!editor.searchQuery.value) return
  const count = await editor.replaceAll(replaceInput.value)
  statusMsg.value = count > 0 ? `Replaced ${count} occurrence(s)` : 'No occurrences found'
}
</script>

<template>
  <div class="find-modal__backdrop" @click.self="emit('close')">
    <div class="find-modal" role="dialog" aria-label="Find and Replace">
      <div class="find-modal__header">
        <div class="find-modal__title">
          <BaseIcon name="find-replace" :size="18" />
          <span>Find & Replace</span>
        </div>
        <button type="button" class="find-modal__close" title="Close (Esc)" @click="emit('close')">
          <BaseIcon name="x" :size="16" />
        </button>
      </div>

      <div class="find-modal__body">
        <div class="find-modal__field">
          <label for="find-query">Find what</label>
          <div class="find-modal__input-wrap">
            <input
              id="find-query"
              v-model="searchInput"
              type="text"
              class="find-modal__input"
              placeholder="Search text in document..."
              autofocus
            />
            <span v-if="editor.searching.value" class="find-modal__spinner" />
          </div>
        </div>

        <div class="find-modal__field">
          <label for="replace-query">Replace with</label>
          <input
            id="replace-query"
            v-model="replaceInput"
            type="text"
            class="find-modal__input"
            placeholder="Replacement text..."
          />
        </div>

        <div class="find-modal__status">
          <span v-if="editor.searchResults.value.length > 0">
            Match {{ editor.searchActive.value + 1 }} of {{ editor.searchResults.value.length }}
          </span>
          <span v-else-if="editor.searchQuery.value && !editor.searching.value">
            No matches found
          </span>
          <span v-if="statusMsg" class="find-modal__msg">{{ statusMsg }}</span>
        </div>
      </div>

      <div class="find-modal__footer">
        <div class="find-modal__nav">
          <button
            type="button"
            class="find-modal__btn"
            :disabled="!editor.searchResults.value.length"
            @click="editor.prevMatch()"
          >
            <BaseIcon name="chevron-up" :size="14" /> Prev
          </button>
          <button
            type="button"
            class="find-modal__btn"
            :disabled="!editor.searchResults.value.length"
            @click="editor.nextMatch()"
          >
            <BaseIcon name="chevron-down" :size="14" /> Next
          </button>
        </div>

        <div class="find-modal__actions">
          <button
            type="button"
            class="find-modal__btn find-modal__btn--primary"
            :disabled="!editor.searchResults.value.length || editor.searchActive.value < 0"
            @click="onReplaceCurrent"
          >
            Replace
          </button>
          <button
            type="button"
            class="find-modal__btn find-modal__btn--primary"
            :disabled="!editor.searchResults.value.length"
            @click="onReplaceAll"
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.find-modal__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.find-modal {
  width: 440px;
  max-width: 92vw;
  background: hsl(var(--color-surface));
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.2));
  overflow: hidden;
  animation: modalIn 0.15s ease;
}
@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.find-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid hsl(var(--color-border));
  background: hsl(var(--color-surface-muted));
}
.find-modal__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: hsl(var(--color-text));
}
.find-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  color: hsl(var(--color-text-muted));
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
}
.find-modal__close:hover {
  background: hsl(var(--color-chip));
  color: hsl(var(--color-text));
}
.find-modal__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.find-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.find-modal__field label {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--color-text-muted));
}
.find-modal__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.find-modal__input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md, 6px);
  background: hsl(var(--color-surface));
  color: hsl(var(--color-text));
  outline: none;
  transition: border-color 0.15s ease;
}
.find-modal__input:focus {
  border-color: hsl(var(--color-primary));
}
.find-modal__status {
  font-size: 12px;
  color: hsl(var(--color-text-muted));
  min-height: 18px;
  display: flex;
  justify-content: space-between;
}
.find-modal__msg {
  color: hsl(var(--color-primary));
  font-weight: 600;
}
.find-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid hsl(var(--color-border));
  background: hsl(var(--color-surface-muted));
}
.find-modal__nav,
.find-modal__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.find-modal__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  border: 1px solid hsl(var(--color-border));
  border-radius: var(--radius-md, 6px);
  background: hsl(var(--color-surface));
  color: hsl(var(--color-text));
  cursor: pointer;
  transition: all 0.15s ease;
}
.find-modal__btn:hover:not(:disabled) {
  background: hsl(var(--color-chip));
}
.find-modal__btn--primary {
  background: hsl(var(--color-primary));
  color: #ffffff;
  border-color: transparent;
}
.find-modal__btn--primary:hover:not(:disabled) {
  opacity: 0.9;
  background: hsl(var(--color-primary));
}
.find-modal__btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
