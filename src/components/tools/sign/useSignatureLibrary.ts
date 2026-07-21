/**
 * useSignatureLibrary — saved signatures & initials, persisted in
 * localStorage so they can be reused across sessions and documents.
 */
import { ref } from 'vue'

export interface SavedSignature {
  id: string
  kind: 'signature' | 'initials'
  /** PNG data-URL (transparent background). */
  dataUrl: string
  createdAt: number
}

const STORAGE_KEY = 'pdfly.sign.library'
const MAX_SAVED = 12

function readStore(): SavedSignature[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as SavedSignature[]) : []
    return Array.isArray(parsed) ? parsed.filter((item) => item?.dataUrl) : []
  } catch {
    return []
  }
}

const saved = ref<SavedSignature[]>(readStore())

function persist(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(saved.value))
  } catch {
    // Quota exceeded / private mode — the in-memory list still works.
  }
}

export function useSignatureLibrary() {
  function save(kind: SavedSignature['kind'], dataUrl: string): SavedSignature {
    const item: SavedSignature = {
      id: `sig-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      kind,
      dataUrl,
      createdAt: Date.now(),
    }
    saved.value = [item, ...saved.value].slice(0, MAX_SAVED)
    persist()
    return item
  }

  function remove(id: string): void {
    saved.value = saved.value.filter((item) => item.id !== id)
    persist()
  }

  return { saved, save, remove }
}
