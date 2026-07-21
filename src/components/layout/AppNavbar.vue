<script setup lang="ts">
  /**
   * AppNavbar — sticky marketing navigation with responsive hamburger menu.
   */
  import { ref, watch } from 'vue'
  import { RouterLink, useRoute } from 'vue-router'
  import AppLogo from '@components/ui/AppLogo.vue'
  import ThemeToggle from '@components/ui/ThemeToggle.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import { ROUTE_NAMES } from '@constants'
  import { useBreakpoint } from '@composables'

  const route = useRoute()
  const { isNarrow } = useBreakpoint()
  const mobileOpen = ref(false)

  const links = [
    { label: 'Home', name: ROUTE_NAMES.HOME },
    { label: 'All Tools', name: ROUTE_NAMES.TOOLS },
    { label: 'Pricing', name: ROUTE_NAMES.PRICING },
    { label: 'Help', name: ROUTE_NAMES.HELP },
    { label: 'About', name: ROUTE_NAMES.ABOUT },
  ] as const

  // Close the mobile menu whenever the route changes.
  watch(
    () => route.fullPath,
    () => (mobileOpen.value = false),
  )
</script>

<template>
  <header class="pf-nav">
    <div class="pf-nav__bar">
      <AppLogo :size="32" />

      <nav v-if="!isNarrow" class="pf-nav__links">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="{ name: link.name }"
          class="pf-nav__link"
          :class="{ 'pf-nav__link--active': route.name === link.name }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="pf-nav__actions">
        <ThemeToggle />
        <template v-if="!isNarrow">
          <RouterLink :to="{ name: ROUTE_NAMES.LOGIN }" class="pf-nav__login">Log in</RouterLink>
          <BaseButton @click="$router.push({ name: ROUTE_NAMES.REGISTER })">Get started</BaseButton>
        </template>
        <button
          v-else
          type="button"
          class="pf-nav__burger"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <BaseIcon :name="mobileOpen ? 'x' : 'menu'" :size="20" />
        </button>
      </div>
    </div>

    <div v-if="isNarrow && mobileOpen" class="pf-nav__mobile animate-fade-up">
      <RouterLink
        v-for="link in links"
        :key="link.name"
        :to="{ name: link.name }"
        class="pf-nav__mobile-link"
      >
        {{ link.label }}
      </RouterLink>
      <div class="pf-nav__mobile-actions">
        <BaseButton variant="secondary" full @click="$router.push({ name: ROUTE_NAMES.LOGIN })">
          Log in
        </BaseButton>
        <BaseButton full @click="$router.push({ name: ROUTE_NAMES.REGISTER })"
          >Get started</BaseButton
        >
      </div>
    </div>
  </header>
</template>

<style scoped>
  .pf-nav {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    background: hsl(var(--color-surface) / 0.82);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid hsl(var(--color-border));
  }
  .pf-nav__bar {
    width: 90%;
    margin: 0 auto;
    padding: 0;
    height: 68px;
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .pf-nav__links {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 22px;
  }
  .pf-nav__link {
    padding: 8px 14px;
    border-radius: var(--radius-md);
    font-size: 14.5px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    transition: all 0.15s;
  }
  .pf-nav__link:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }
  .pf-nav__link--active {
    color: hsl(var(--color-primary));
  }
  .pf-nav__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pf-nav__login {
    font-size: 14.5px;
    font-weight: 700;
    color: hsl(var(--color-text-muted));
    cursor: pointer;
    padding: 8px 12px;
  }
  .pf-nav__login:hover {
    color: hsl(var(--color-text));
  }
  .pf-nav__burger {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    border: none;
    background: hsl(var(--color-chip));
    color: hsl(var(--color-text));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .pf-nav__mobile {
    padding: 8px 16px 18px;
    border-top: 1px solid hsl(var(--color-border));
  }
  .pf-nav__mobile-link {
    display: block;
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    color: hsl(var(--color-text));
    cursor: pointer;
  }
  .pf-nav__mobile-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
</style>
