<script setup lang="ts">
  /**
   * UserMenu — topbar avatar dropdown with account links and logout.
   */
  import { ref } from 'vue'
  import { useRouter, RouterLink } from 'vue-router'
  import { onClickOutside } from '@vueuse/core'
  import AppAvatar from '@components/ui/AppAvatar.vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { DEMO_USER, ROUTE_NAMES } from '@constants'
  import { useAuthStore } from '@stores/auth.store'
  import { useBreakpoint } from '@composables'

  const router = useRouter()
  const authStore = useAuthStore()
  const { isNarrow } = useBreakpoint()

  const open = ref(false)
  const root = ref<HTMLElement | null>(null)
  onClickOutside(root, () => (open.value = false))

  const links = [
    { label: 'Profile', icon: 'user', name: ROUTE_NAMES.PROFILE },
    { label: 'Settings', icon: 'settings', name: ROUTE_NAMES.SETTINGS },
    { label: 'My Files', icon: 'folder', name: ROUTE_NAMES.FILES },
  ] as const

  async function logout() {
    open.value = false
    await authStore.logout()
    router.push({ name: ROUTE_NAMES.HOME })
  }
</script>

<template>
  <div ref="root" class="pf-user">
    <button type="button" class="pf-user__btn" aria-label="Account menu" @click="open = !open">
      <AppAvatar :size="38" />
      <BaseIcon v-if="!isNarrow" name="chevron-down" :size="16" class="pf-user__chevron" />
    </button>

    <div v-if="open" class="pf-user__panel animate-fade-up">
      <div class="pf-user__head">
        <div class="pf-user__name">{{ DEMO_USER.name }}</div>
        <div class="pf-user__email">{{ DEMO_USER.email }}</div>
      </div>
      <RouterLink
        v-for="link in links"
        :key="link.label"
        :to="{ name: link.name }"
        class="pf-user__link"
        @click="open = false"
      >
        <BaseIcon :name="link.icon" :size="17" />
        {{ link.label }}
      </RouterLink>
      <div class="pf-user__divider">
        <button type="button" class="pf-user__link pf-user__link--danger" @click="logout">
          <BaseIcon name="log-out" :size="17" />
          Log out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .pf-user {
    position: relative;
  }
  .pf-user__btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
  }
  .pf-user__chevron {
    color: hsl(var(--color-text-faint));
  }
  .pf-user__panel {
    position: absolute;
    right: 0;
    top: 52px;
    width: 220px;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-dropdown);
    overflow: hidden;
  }
  .pf-user__head {
    padding: 14px 16px;
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .pf-user__name {
    font-weight: 700;
    color: hsl(var(--color-text));
    font-size: 14px;
  }
  .pf-user__email {
    font-size: 12.5px;
    color: hsl(var(--color-text-faint));
  }
  .pf-user__link {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 16px;
    font-size: 14px;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    font-weight: 600;
    background: none;
    border: none;
    text-align: left;
  }
  .pf-user__link:hover {
    background: hsl(var(--color-chip));
  }
  .pf-user__link--danger {
    color: hsl(var(--color-danger));
  }
  .pf-user__divider {
    border-top: 1px solid hsl(var(--color-border));
  }
</style>
