/**
 * Vite environment variable type augmentation.
 * Ensures import.meta.env is fully typed throughout the project.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_URL: string
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production'
  readonly VITE_ENABLE_DARK_MODE: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_MAX_UPLOAD_SIZE_MB: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
