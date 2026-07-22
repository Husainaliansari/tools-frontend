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
  import { ROUTE_NAMES, TOOL_CATEGORIES, TOOL_COUNT, getToolsByCategory } from '@constants'
  import { useBreakpoint } from '@composables'
  import { hexAlpha } from '@utils'
  import type { PdfTool } from '@types'

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

  // Dropdown states
  const desktopDropdownOpen = ref(false)
  const mobileAllToolsOpen = ref(false)
  let openTimeout: number | undefined
  let closeTimeout: number | undefined

  function onMouseEnterAllTools() {
    clearTimeout(closeTimeout)
    openTimeout = window.setTimeout(() => {
      desktopDropdownOpen.value = true
    }, 150)
  }

  function onMouseLeaveAllTools() {
    clearTimeout(openTimeout)
    closeTimeout = window.setTimeout(() => {
      desktopDropdownOpen.value = false
    }, 200)
  }

  function clearDropdownTimeout() {
    clearTimeout(closeTimeout)
  }

  function closeDropdownWithDelay() {
    clearTimeout(openTimeout)
    closeTimeout = window.setTimeout(() => {
      desktopDropdownOpen.value = false
    }, 200)
  }

  function closeDropdown() {
    clearTimeout(openTimeout)
    clearTimeout(closeTimeout)
    desktopDropdownOpen.value = false
  }

  function onClickAllTools(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    desktopDropdownOpen.value = !desktopDropdownOpen.value
  }

  function getToolIconStyle(tool: PdfTool) {
    return {
      '--icon-color': tool.color,
      '--icon-bg': hexAlpha(tool.color, 0.1),
    }
  }

  // Close menus whenever the route changes.
  watch(
    () => route.fullPath,
    () => {
      mobileOpen.value = false
      mobileAllToolsOpen.value = false
      desktopDropdownOpen.value = false
    },
  )
</script>

<template>
  <header class="pf-nav">
    <div class="pf-nav__bar">
      <AppLogo :size="32" />

      <nav v-if="!isNarrow" class="pf-nav__links">
        <template v-for="link in links" :key="link.name">
          <!-- All Tools Link Trigger -->
          <div
            v-if="link.name === ROUTE_NAMES.TOOLS"
            class="pf-nav__link-container"
            @mouseenter="onMouseEnterAllTools"
            @mouseleave="onMouseLeaveAllTools"
          >
            <button
              type="button"
              class="pf-nav__link pf-nav__link--dropdown-trigger"
              :class="{
                'pf-nav__link--active': route.name === ROUTE_NAMES.TOOLS || route.name === ROUTE_NAMES.TOOL || desktopDropdownOpen,
                'pf-nav__link--open': desktopDropdownOpen
              }"
              @click="onClickAllTools"
            >
              {{ link.label }}
              <BaseIcon name="chevron-down" :size="14" class="pf-nav__link-chevron" />
            </button>
          </div>
          
          <RouterLink
            v-else
            :to="{ name: link.name }"
            class="pf-nav__link"
            :class="{ 'pf-nav__link--active': route.name === link.name }"
          >
            {{ link.label }}
          </RouterLink>
        </template>
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

    <!-- Backdrop Overlay -->
    <div
      v-if="desktopDropdownOpen && !isNarrow"
      class="pf-nav__overlay animate-fade-in"
      @click="closeDropdown"
    />

    <!-- Mega Menu Dropdown -->
    <div
      v-if="desktopDropdownOpen && !isNarrow"
      class="pf-nav__dropdown animate-slide-down"
      @mouseenter="clearDropdownTimeout"
      @mouseleave="closeDropdownWithDelay"
    >
      <div class="pf-nav__dropdown-inner pf-container">
        <div class="pf-nav__dropdown-grid">
          <div
            v-for="category in TOOL_CATEGORIES"
            :key="category"
            class="pf-nav__dropdown-col"
          >
            <h4 class="pf-nav__dropdown-category-title">{{ category }}</h4>
            <ul class="pf-nav__dropdown-list">
              <li v-for="tool in getToolsByCategory(category)" :key="tool.slug">
                <RouterLink
                  :to="{ name: ROUTE_NAMES.TOOL, params: { slug: tool.slug } }"
                  class="pf-nav__dropdown-item"
                  :style="getToolIconStyle(tool)"
                  @click="closeDropdown"
                >
                  <span class="pf-nav__dropdown-item-icon">
                    <BaseIcon :name="tool.icon" :size="15" />
                  </span>
                  <div class="pf-nav__dropdown-item-info">
                    <span class="pf-nav__dropdown-item-name">{{ tool.name }}</span>
                    <span class="pf-nav__dropdown-item-desc">{{ tool.description }}</span>
                  </div>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="pf-nav__dropdown-footer">
        <RouterLink :to="{ name: ROUTE_NAMES.TOOLS }" class="pf-nav__dropdown-footer-link" @click="closeDropdown">
          <BaseIcon name="grid" :size="16" />
          <span>Explore all {{ TOOL_COUNT }} PDF tools</span>
          <BaseIcon name="arrow-right" :size="14" />
        </RouterLink>
      </div>
    </div>

    <!-- Mobile Navigation Menu -->
    <div v-if="isNarrow && mobileOpen" class="pf-nav__mobile animate-fade-up">
      <template v-for="link in links" :key="link.name">
        <div v-if="link.name === ROUTE_NAMES.TOOLS" class="pf-nav__mobile-accordion">
          <button
            type="button"
            class="pf-nav__mobile-link pf-nav__mobile-accordion-trigger"
            :class="{ 'pf-nav__mobile-accordion-trigger--open': mobileAllToolsOpen }"
            @click="mobileAllToolsOpen = !mobileAllToolsOpen"
          >
            {{ link.label }}
            <BaseIcon name="chevron-down" :size="16" class="pf-nav__mobile-chevron" />
          </button>
          
          <div v-if="mobileAllToolsOpen" class="pf-nav__mobile-accordion-content animate-fade-in">
            <div
              v-for="category in TOOL_CATEGORIES"
              :key="category"
              class="pf-nav__mobile-category"
            >
              <div class="pf-nav__mobile-category-title">{{ category }}</div>
              <div class="pf-nav__mobile-tools">
                <RouterLink
                  v-for="tool in getToolsByCategory(category)"
                  :key="tool.slug"
                  :to="{ name: ROUTE_NAMES.TOOL, params: { slug: tool.slug } }"
                  class="pf-nav__mobile-tool-item"
                  @click="mobileOpen = false"
                >
                  <span class="pf-nav__mobile-tool-icon" :style="{ color: tool.color }">
                    <BaseIcon :name="tool.icon" :size="14" />
                  </span>
                  <span>{{ tool.name }}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
        
        <RouterLink
          v-else
          :to="{ name: link.name }"
          class="pf-nav__mobile-link"
        >
          {{ link.label }}
        </RouterLink>
      </template>

      <div class="pf-nav__mobile-actions">
        <BaseButton variant="secondary" full @click="$router.push({ name: ROUTE_NAMES.LOGIN })">
          Log in
        </BaseButton>
        <BaseButton full @click="$router.push({ name: ROUTE_NAMES.REGISTER })">
          Get started
        </BaseButton>
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
    text-decoration: none;
  }
  .pf-nav__link:hover {
    color: hsl(var(--color-text));
    background: hsl(var(--color-chip));
  }
  .pf-nav__link--active {
    color: hsl(var(--color-primary));
  }
  .pf-nav__link-container {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .pf-nav__link--dropdown-trigger {
    background: transparent;
    border: none;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .pf-nav__link-chevron {
    transition: transform 0.2s ease;
  }
  .pf-nav__link--open .pf-nav__link-chevron {
    transform: rotate(180deg);
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
    text-decoration: none;
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
  .pf-nav__overlay {
    position: fixed;
    top: 68px;
    left: 0;
    right: 0;
    bottom: 0;
    background: hsl(0 0% 0% / 0.15);
    backdrop-filter: blur(4px);
    z-index: 90;
  }
  .pf-nav__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: hsl(var(--color-surface) / 0.95);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid hsl(var(--color-border));
    box-shadow: var(--shadow-lg);
    z-index: 100;
    padding: 32px 0 0;
  }
  .pf-nav__dropdown-inner {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .pf-nav__dropdown-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 20px;
    padding-bottom: 32px;
  }
  @media (max-width: 1200px) {
    .pf-nav__dropdown-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
  }
  .pf-nav__dropdown-category-title {
    font-size: 11.5px;
    font-weight: 800;
    color: hsl(var(--color-text-faint));
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 14px;
    padding-left: 8px;
    border-left: 2px solid hsl(var(--color-primary) / 0.4);
  }
  .pf-nav__dropdown-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pf-nav__dropdown-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: all 0.2s ease;
  }
  .pf-nav__dropdown-item:hover {
    background: hsl(var(--color-chip) / 0.6);
  }
  .pf-nav__dropdown-item-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--icon-bg);
    color: var(--icon-color);
    flex-shrink: 0;
    transition: all 0.2s ease;
  }
  .pf-nav__dropdown-item:hover .pf-nav__dropdown-item-icon {
    background: var(--icon-color);
    color: #ffffff;
  }
  .pf-nav__dropdown-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pf-nav__dropdown-item-name {
    font-size: 13.5px;
    font-weight: 700;
    color: hsl(var(--color-text));
    line-height: 1.2;
    transition: color 0.2s ease;
  }
  .pf-nav__dropdown-item:hover .pf-nav__dropdown-item-name {
    color: var(--icon-color);
  }
  .pf-nav__dropdown-item-desc {
    font-size: 11px;
    color: hsl(var(--color-text-muted));
    line-height: 1.3;
  }
  .pf-nav__dropdown-footer {
    border-top: 1px solid hsl(var(--color-border));
    padding: 16px 0;
    display: flex;
    justify-content: center;
    background: hsl(var(--color-surface-muted) / 0.5);
  }
  .pf-nav__dropdown-footer-link {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 700;
    color: hsl(var(--color-primary));
    text-decoration: none;
    transition: all 0.2s ease;
    padding: 6px 16px;
    border-radius: var(--radius-full);
  }
  .pf-nav__dropdown-footer-link:hover {
    background: hsl(var(--color-primary) / 0.08);
    transform: translateY(-1px);
  }
  .pf-nav__dropdown-footer-link :deep(svg) {
    transition: transform 0.2s ease;
  }
  .pf-nav__dropdown-footer-link:hover :deep(svg:last-child) {
    transform: translateX(3px);
  }
  .pf-nav__mobile {
    padding: 8px 16px 18px;
    border-top: 1px solid hsl(var(--color-border));
    max-height: calc(100vh - 68px);
    overflow-y: auto;
  }
  .pf-nav__mobile-link {
    display: block;
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    color: hsl(var(--color-text));
    cursor: pointer;
    text-decoration: none;
  }
  .pf-nav__mobile-accordion {
    width: 100%;
  }
  .pf-nav__mobile-accordion-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
  }
  .pf-nav__mobile-chevron {
    transition: transform 0.2s ease;
  }
  .pf-nav__mobile-accordion-trigger--open .pf-nav__mobile-chevron {
    transform: rotate(180deg);
  }
  .pf-nav__mobile-accordion-content {
    padding-left: 12px;
    border-left: 2px solid hsl(var(--color-border));
    margin-left: 12px;
    margin-top: 4px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .pf-nav__mobile-category-title {
    font-size: 11px;
    font-weight: 800;
    color: hsl(var(--color-text-faint));
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .pf-nav__mobile-tools {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  @media (max-width: 480px) {
    .pf-nav__mobile-tools {
      grid-template-columns: 1fr;
    }
  }
  .pf-nav__mobile-tool-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-weight: 600;
    color: hsl(var(--color-text));
    text-decoration: none;
  }
  .pf-nav__mobile-tool-item:active {
    background: hsl(var(--color-chip));
  }
  .pf-nav__mobile-tool-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pf-nav__mobile-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slide-down {
    animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
</style>
