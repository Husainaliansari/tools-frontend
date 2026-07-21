import { ref, readonly } from 'vue'
import { getErrorMessage } from '@utils'
import type { AsyncStatus } from '@types'

/**
 * Generic async operation composable.
 * Wraps any async function with loading / error / status tracking.
 *
 * @example
 * const { execute, isLoading, error } = useAsync(authService.login)
 */
export function useAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
) {
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const data = ref<TReturn | null>(null)

  const isIdle = () => status.value === 'idle'
  const isLoading = () => status.value === 'loading'
  const isSuccess = () => status.value === 'success'
  const isError = () => status.value === 'error'

  async function execute(...args: TArgs): Promise<TReturn | null> {
    status.value = 'loading'
    error.value = null

    try {
      const result = await fn(...args)
      data.value = result as TReturn
      status.value = 'success'
      return result
    } catch (err) {
      error.value = getErrorMessage(err)
      status.value = 'error'
      return null
    }
  }

  function reset(): void {
    status.value = 'idle'
    error.value = null
    data.value = null
  }

  return {
    status: readonly(status),
    error: readonly(error),
    data: readonly(data),
    isIdle,
    isLoading,
    isSuccess,
    isError,
    execute,
    reset,
  }
}
