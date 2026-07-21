<script setup lang="ts">
  /**
   * EditorWorkspace — entry point for the PDF Editor tool. Gates a drag-and-drop
   * upload, then hands the chosen file to the fully client-side <PdfEditor>.
   * Nothing is uploaded to the server; all editing happens in the browser.
   */
  import { computed, ref, watch } from 'vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import UploadDropzone from '@components/tools/workflow/UploadDropzone.vue'
  import PdfEditor from './PdfEditor.vue'
  import { uploadSpecFor } from '@services/pdfTools.service'
  import { useAuthStore } from '@stores/auth.store'
  import { useFeedback } from '@composables'
  import type { PdfTool } from '@types'

  const props = defineProps<{ tool: PdfTool }>()
  const emit = defineEmits<{ active: [boolean] }>()

  const auth = useAuthStore()
  const { showToast } = useFeedback()
  const spec = computed(() => uploadSpecFor(props.tool, auth.userPlan))

  const file = ref<File | null>(null)

  watch(file, (newVal) => {
    emit('active', !!newVal)
  }, { immediate: true })
  const validationError = ref<string | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)

  function accept(list: FileList | File[] | null): void {
    const picked = list?.[0]
    if (!picked) return
    if (!/\.pdf$/i.test(picked.name) && picked.type !== 'application/pdf') {
      validationError.value = 'Please choose a PDF file.'
      return
    }
    const maxBytes = spec.value.maxSizeMB * 1024 * 1024
    if (picked.size > maxBytes) {
      validationError.value = `File is larger than the ${spec.value.maxSizeMB} MB limit for your plan.`
      return
    }
    validationError.value = null
    file.value = picked
  }

  function openPicker(): void {
    fileInput.value?.click()
  }
  function onPicked(event: Event): void {
    const input = event.target as HTMLInputElement
    accept(input.files)
    input.value = ''
  }
  function close(): void {
    file.value = null
    showToast('Editor closed — your work was not uploaded anywhere')
  }
</script>

<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="application/pdf,.pdf"
      style="display: none"
      @change="onPicked"
    />

    <PdfEditor v-if="file" :file="file" @close="close" />

    <BaseCard v-else>
      <UploadDropzone
        :spec="spec"
        :error="validationError"
        @pick="openPicker"
        @files="accept"
      />
      <p class="ew__note">
        <span class="ew__lock">🔒</span>
        Files are edited entirely in your browser — nothing is uploaded to our servers.
      </p>
    </BaseCard>
  </div>
</template>

<style scoped>
  .ew__note {
    margin: 16px 0 0;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
  }
  .ew__lock {
    margin-right: 4px;
  }
</style>
