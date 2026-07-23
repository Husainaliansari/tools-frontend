<script setup lang="ts">
  /**
   * AuthForm — shared shell for the login / register / forgot / reset flows.
   * The `mode` prop selects which fields, social buttons and copy appear.
   */
  import { computed, reactive, ref } from 'vue'
  import { useRouter, RouterLink } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import AuthField from '@components/auth/AuthField.vue'
  import { ROUTE_NAMES } from '@constants'
  import { useAuthStore } from '@stores/auth.store'
  import { useFeedback } from '@composables'

  type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

  const props = defineProps<{ mode: AuthMode }>()

  const router = useRouter()
  const authStore = useAuthStore()
  const { showToast } = useFeedback()

  const form = reactive({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    remember: false,
  })

  const copy = computed(() => {
    const map: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
      login: { title: 'Welcome back', subtitle: 'Log in to your PDFly account.', submit: 'Log in' },
      register: {
        title: 'Create your account',
        subtitle: 'Start using every PDF tool for free.',
        submit: 'Create account',
      },
      forgot: {
        title: 'Reset your password',
        subtitle: 'We’ll email you a secure reset link.',
        submit: 'Send reset link',
      },
      reset: {
        title: 'Set a new password',
        subtitle: 'Choose a strong password you’ll remember.',
        submit: 'Reset password',
      },
    }
    return map[props.mode]
  })

  const showSocial = computed(() => props.mode === 'login' || props.mode === 'register')
  const socials = [
    { label: 'Google', icon: 'globe' },
    { label: 'Apple', icon: 'user' },
  ]

  const submitting = ref(false)

  async function submit() {
    if (submitting.value) return
    if (props.mode === 'forgot') {
      showToast('Reset link sent to your email')
      return
    }
    if (props.mode === 'reset') {
      showToast('Password updated — you can now log in.')
      router.push({ name: ROUTE_NAMES.LOGIN })
      return
    }

    submitting.value = true
    try {
      if (props.mode === 'register') {
        await authStore.register({
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.confirmPassword || form.password,
        })
        showToast('Account created — welcome!')
      } else {
        await authStore.login({ email: form.email, password: form.password, remember: form.remember })
        showToast('Signed in successfully')
      }
      // Admins land in the admin panel; everyone else in the app dashboard.
      router.push({ name: authStore.isAdmin ? ROUTE_NAMES.ADMIN_DASHBOARD : ROUTE_NAMES.DASHBOARD })
    } catch {
      showToast(authStore.error ?? 'Authentication failed. Please try again.', 'error')
    } finally {
      submitting.value = false
    }
  }

  // Explicit prototype affordance: explore the app without a real account.
  function exploreDemo() {
    authStore.signInAsDemo()
    router.push({ name: ROUTE_NAMES.DASHBOARD })
    showToast('Signed in with a demo account')
  }
</script>

<template>
  <div class="pf-auth-form">
    <h1 class="pf-auth-form__title">{{ copy.title }}</h1>
    <p class="pf-auth-form__subtitle">{{ copy.subtitle }}</p>

    <template v-if="showSocial">
      <div class="pf-auth-form__socials">
        <button
          v-for="s in socials"
          :key="s.label"
          type="button"
          class="pf-social-btn"
          @click="exploreDemo"
        >
          <BaseIcon :name="s.icon" :size="17" />
          {{ s.label }}
        </button>
      </div>
      <div class="pf-auth-form__divider"
        ><span class="pf-auth-form__rule" />OR<span class="pf-auth-form__rule"
      /></div>
    </template>

    <form class="pf-auth-form__fields" @submit.prevent="submit">
      <AuthField
        v-if="mode === 'register'"
        v-model="form.name"
        label="Full name"
        icon="user"
        placeholder="Amara Okafor"
        autocomplete="name"
      />
      <AuthField
        v-if="mode === 'login' || mode === 'register' || mode === 'forgot'"
        v-model="form.email"
        label="Email"
        icon="mail"
        type="email"
        placeholder="you@email.com"
        autocomplete="email"
      />
      <AuthField
        v-if="mode === 'login' || mode === 'register' || mode === 'reset'"
        v-model="form.password"
        :label="mode === 'reset' ? 'New password' : 'Password'"
        icon="lock"
        password
        placeholder="••••••••"
        autocomplete="current-password"
      />
      <AuthField
        v-if="mode === 'reset'"
        v-model="form.confirmPassword"
        label="Confirm password"
        icon="lock"
        password
        placeholder="••••••••"
      />

      <div v-if="mode === 'login'" class="pf-auth-form__meta">
        <label class="pf-auth-form__remember">
          <input v-model="form.remember" type="checkbox" />
          Remember me
        </label>
        <RouterLink :to="{ name: ROUTE_NAMES.FORGOT_PASSWORD }" class="pf-auth-form__link">
          Forgot password?
        </RouterLink>
      </div>

      <div class="pf-auth-form__submit">
        <BaseButton type="submit" full size="lg" :loading="submitting">{{ copy.submit }}</BaseButton>
      </div>

      <button
        v-if="mode === 'login' || mode === 'register'"
        type="button"
        class="pf-auth-form__demo"
        @click="exploreDemo"
      >
        Explore with a demo account
      </button>
    </form>

    <div class="pf-auth-form__foot">
      <template v-if="mode === 'login'">
        New to PDFly?
        <RouterLink :to="{ name: ROUTE_NAMES.REGISTER }" class="pf-auth-form__link">
          Create an account
        </RouterLink>
      </template>
      <template v-else-if="mode === 'register'">
        Already have an account?
        <RouterLink :to="{ name: ROUTE_NAMES.LOGIN }" class="pf-auth-form__link">Log in</RouterLink>
      </template>
      <template v-else>
        <RouterLink
          :to="{ name: ROUTE_NAMES.LOGIN }"
          class="pf-auth-form__link pf-auth-form__link--back"
        >
          <BaseIcon name="chevron-left" :size="16" /> Back to login
        </RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .pf-auth-form {
    margin: auto;
    width: 100%;
    max-width: 400px;
    padding: 20px 0;
  }
  .pf-auth-form__title {
    font-size: 28px;
    font-weight: 800;
    color: hsl(var(--color-text));
    letter-spacing: -0.02em;
    margin: 0 0 8px;
  }
  .pf-auth-form__subtitle {
    font-size: 15px;
    color: hsl(var(--color-text-muted));
    margin: 0 0 28px;
  }
  .pf-auth-form__socials {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  .pf-auth-form__demo {
    display: block;
    width: 100%;
    margin-top: 12px;
    padding: 6px;
    background: transparent;
    border: none;
    color: hsl(var(--color-text-muted));
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .pf-auth-form__demo:hover {
    color: hsl(var(--color-text));
  }
  .pf-social-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px;
    border-radius: var(--radius-lg);
    border: 1px solid hsl(var(--color-border));
    background: hsl(var(--color-surface));
    color: hsl(var(--color-text));
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pf-social-btn:hover {
    background: hsl(var(--color-chip));
  }
  .pf-auth-form__divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 4px 0 20px;
    color: hsl(var(--color-text-faint));
    font-size: 12.5px;
    font-weight: 600;
  }
  .pf-auth-form__rule {
    flex: 1;
    height: 1px;
    background: hsl(var(--color-border));
  }
  .pf-auth-form__fields {
    display: grid;
    gap: 15px;
  }
  .pf-auth-form__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13.5px;
  }
  .pf-auth-form__remember {
    display: flex;
    align-items: center;
    gap: 8px;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
  }
  .pf-auth-form__remember input {
    width: 16px;
    height: 16px;
    accent-color: hsl(var(--color-primary));
  }
  .pf-auth-form__link {
    color: hsl(var(--color-primary));
    font-weight: 700;
    cursor: pointer;
  }
  .pf-auth-form__link--back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .pf-auth-form__submit {
    margin-top: 7px;
  }
  .pf-auth-form__foot {
    text-align: center;
    margin-top: 22px;
    font-size: 14px;
    color: hsl(var(--color-text-muted));
  }
</style>
