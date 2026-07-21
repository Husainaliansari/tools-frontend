import { useAuthStore } from '@stores/auth.store'
import { storeToRefs } from 'pinia'

/**
 * Composable for accessing current auth state in components.
 *
 * @example
 * const { user, isAuthenticated, logout } = useAuth()
 */
export function useAuth() {
  const authStore = useAuthStore()
  const { user, isAuthenticated, isLoading, error, userPlan } = storeToRefs(authStore)

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    userPlan,
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
  }
}
