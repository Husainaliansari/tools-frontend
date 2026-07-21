<script setup lang="ts">
  /**
   * BaseSelect — custom dropdown replacing the native <select>.
   *
   * A select-only combobox (ARIA 1.2 pattern): focus stays on the trigger,
   * the open listbox is navigated with the keyboard (arrows, Home/End,
   * type-ahead) and mirrors the app's design tokens in both themes.
   * `size="mini"` renders the compact variant used in preference rows.
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
  import BaseIcon from '@components/icons/BaseIcon.vue'

  const props = withDefaults(
    defineProps<{
      modelValue?: string
      options: readonly string[]
      size?: 'md' | 'mini'
    }>(),
    { size: 'md', modelValue: '' },
  )

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const root = ref<HTMLElement | null>(null)
  const trigger = ref<HTMLButtonElement | null>(null)
  const open = ref(false)
  const openUp = ref(false)
  const activeIndex = ref(-1)

  const uid = `pf-select-${Math.random().toString(36).slice(2, 9)}`

  const selected = computed(() => props.modelValue || props.options[0] || '')
  const selectedIndex = computed(() => props.options.indexOf(selected.value))

  function optionId(index: number): string {
    return `${uid}-opt-${index}`
  }

  function openMenu(): void {
    if (open.value || !props.options.length) return
    activeIndex.value = Math.max(selectedIndex.value, 0)
    // Flip upward when the viewport below can't fit the menu but above can.
    const rect = root.value?.getBoundingClientRect()
    const estimated = Math.min(props.options.length * 40 + 12, 272)
    openUp.value = rect
      ? window.innerHeight - rect.bottom < estimated && rect.top > estimated
      : false
    open.value = true
    void nextTick(() => scrollActiveIntoView())
  }

  function closeMenu(): void {
    open.value = false
    activeIndex.value = -1
  }

  function toggle(): void {
    if (open.value) {
      closeMenu()
    } else {
      openMenu()
    }
  }

  function select(option: string): void {
    emit('update:modelValue', option)
    closeMenu()
    trigger.value?.focus()
  }

  function moveActive(delta: number): void {
    const count = props.options.length
    if (!count) return
    activeIndex.value = (activeIndex.value + delta + count) % count
    scrollActiveIntoView()
  }

  function scrollActiveIntoView(): void {
    if (activeIndex.value < 0) return
    document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' })
  }

  // Type-ahead: jump to the first option matching what was typed recently.
  let typed = ''
  let typedTimer: ReturnType<typeof setTimeout> | undefined
  function typeahead(char: string): void {
    typed += char.toLowerCase()
    clearTimeout(typedTimer)
    typedTimer = setTimeout(() => (typed = ''), 600)
    const match = props.options.findIndex((opt) => opt.toLowerCase().startsWith(typed))
    if (match === -1) return
    if (open.value) {
      activeIndex.value = match
      scrollActiveIntoView()
    } else {
      select(props.options[match])
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key } = event
    if (!open.value) {
      if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault()
        openMenu()
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typeahead(key)
      }
      return
    }
    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        moveActive(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveActive(-1)
        break
      case 'Home':
        event.preventDefault()
        activeIndex.value = 0
        scrollActiveIntoView()
        break
      case 'End':
        event.preventDefault()
        activeIndex.value = props.options.length - 1
        scrollActiveIntoView()
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (activeIndex.value >= 0) select(props.options[activeIndex.value])
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        closeMenu()
        break
      default:
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          typeahead(key)
        }
    }
  }

  function onPointerDownOutside(event: PointerEvent): void {
    if (open.value && root.value && !root.value.contains(event.target as Node)) {
      closeMenu()
    }
  }

  onMounted(() => document.addEventListener('pointerdown', onPointerDownOutside))
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDownOutside)
    clearTimeout(typedTimer)
  })
</script>

<template>
  <div
    ref="root"
    class="pf-select"
    :class="[`pf-select--${size}`, { 'pf-select--open': open }]"
  >
    <button
      ref="trigger"
      type="button"
      class="pf-select__trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="uid"
      :aria-activedescendant="open && activeIndex >= 0 ? optionId(activeIndex) : undefined"
      @click="toggle"
      @keydown="onKeydown"
      @blur="closeMenu"
    >
      <span class="pf-select__value">{{ selected }}</span>
      <span class="pf-select__chevron" aria-hidden="true">
        <BaseIcon name="chevron-down" :size="size === 'mini' ? 15 : 16" />
      </span>
    </button>

    <Transition name="pf-select-pop">
      <ul
        v-if="open"
        :id="uid"
        class="pf-select__menu"
        :class="{ 'pf-select__menu--up': openUp }"
        role="listbox"
        :aria-label="selected"
      >
        <li
          v-for="(opt, i) in options"
          :id="optionId(i)"
          :key="opt"
          role="option"
          :aria-selected="opt === selected"
          class="pf-select__option"
          :class="{
            'pf-select__option--active': i === activeIndex,
            'pf-select__option--selected': opt === selected,
          }"
          @pointerenter="activeIndex = i"
          @pointerdown.prevent
          @click="select(opt)"
        >
          <span class="pf-select__option-label">{{ opt }}</span>
          <BaseIcon v-if="opt === selected" name="check" :size="15" class="pf-select__check" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
  .pf-select {
    position: relative;
    display: inline-block;
  }
  .pf-select--md {
    display: block;
  }

  /* Trigger */
  .pf-select__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    text-align: left;
    color: hsl(var(--color-text));
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    font-weight: 600;
    cursor: pointer;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .pf-select--md .pf-select__trigger {
    padding: 11px 12px 11px 14px;
    border-radius: var(--radius-lg);
    font-size: 14px;
  }
  .pf-select--mini .pf-select__trigger {
    padding: 9px 10px 9px 13px;
    border-radius: var(--radius-md);
    font-size: 13.5px;
  }
  .pf-select__trigger:hover {
    border-color: hsl(var(--color-border-strong));
  }
  .pf-select__trigger:focus-visible,
  .pf-select--open .pf-select__trigger {
    border-color: hsl(var(--color-primary));
    box-shadow: 0 0 0 3px hsl(var(--color-primary) / 0.14);
  }
  .pf-select__value {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-select__chevron {
    display: flex;
    flex: none;
    color: hsl(var(--color-text-faint));
    transition: transform 0.18s ease;
  }
  .pf-select--open .pf-select__chevron {
    transform: rotate(180deg);
  }

  /* Menu */
  .pf-select__menu {
    position: absolute;
    z-index: 40;
    top: calc(100% + 6px);
    left: 0;
    min-width: 100%;
    max-height: 272px;
    overflow-y: auto;
    margin: 0;
    padding: 6px;
    list-style: none;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
  }
  .pf-select__menu--up {
    top: auto;
    bottom: calc(100% + 6px);
  }

  /* Options */
  .pf-select__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 11px;
    border-radius: var(--radius-md);
    font-size: 13.5px;
    font-weight: 600;
    color: hsl(var(--color-text));
    cursor: pointer;
    white-space: nowrap;
  }
  .pf-select--mini .pf-select__option {
    padding: 8px 10px;
    font-size: 13px;
  }
  .pf-select__option--active {
    background: hsl(var(--color-primary) / 0.09);
  }
  .pf-select__option--selected {
    color: hsl(var(--color-primary));
    font-weight: 700;
  }
  .pf-select__option-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pf-select__check {
    flex: none;
    color: hsl(var(--color-primary));
  }

  /* Open/close motion */
  .pf-select-pop-enter-active,
  .pf-select-pop-leave-active {
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
  }
  .pf-select-pop-enter-from,
  .pf-select-pop-leave-to {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  .pf-select__menu--up.pf-select-pop-enter-from,
  .pf-select__menu--up.pf-select-pop-leave-to {
    transform: translateY(4px) scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-select__chevron,
    .pf-select-pop-enter-active,
    .pf-select-pop-leave-active {
      transition: none;
    }
  }
</style>
