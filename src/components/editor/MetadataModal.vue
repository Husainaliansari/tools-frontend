<script setup lang="ts">
  /**
   * MetadataModal — edit document info (title/author/subject/keywords). Values
   * are written to `editor.metadata` and applied on export.
   */
  import { reactive } from 'vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { useEditor } from './useEditor'

  const emit = defineEmits<{ close: [] }>()
  const editor = useEditor()

  const form = reactive({
    title: editor.metadata.value.title ?? '',
    author: editor.metadata.value.author ?? '',
    subject: editor.metadata.value.subject ?? '',
    keywords: (editor.metadata.value.keywords ?? []).join(', '),
  })

  function save(): void {
    editor.metadata.value = {
      title: form.title,
      author: form.author,
      subject: form.subject,
      keywords: form.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    }
    emit('close')
  }
</script>

<template>
  <Teleport to="body">
    <div class="mm" @click.self="emit('close')">
      <div class="mm__panel" role="dialog" aria-modal="true" aria-label="Document metadata">
        <div class="mm__head">
          <div class="mm__title"><BaseIcon name="info" :size="18" /> Document metadata</div>
          <button type="button" class="mm__x" aria-label="Close" @click="emit('close')">
            <BaseIcon name="x" :size="18" />
          </button>
        </div>
        <div class="mm__body">
          <label class="mm__field">
            <span class="mm__lbl">Title</span>
            <BaseInput v-model="form.title" placeholder="Document title" />
          </label>
          <label class="mm__field">
            <span class="mm__lbl">Author</span>
            <BaseInput v-model="form.author" placeholder="Author name" />
          </label>
          <label class="mm__field">
            <span class="mm__lbl">Subject</span>
            <BaseInput v-model="form.subject" placeholder="Subject" />
          </label>
          <label class="mm__field">
            <span class="mm__lbl">Keywords</span>
            <BaseInput v-model="form.keywords" placeholder="Comma-separated keywords" />
          </label>
        </div>
        <div class="mm__foot">
          <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
          <BaseButton icon="check" @click="save">Save metadata</BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .mm {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgb(2 6 23 / 0.55);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.15s ease;
  }
  .mm__panel {
    width: 100%;
    max-width: 460px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
  }
  .mm__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .mm__title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 16px;
    font-weight: 700;
    color: hsl(var(--color-text));
  }
  .mm__x {
    background: none;
    border: none;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-md);
  }
  .mm__x:hover {
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
  }
  .mm__body {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .mm__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mm__lbl {
    font-size: 12.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .mm__foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 18px;
    border-top: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface-muted));
  }
</style>
