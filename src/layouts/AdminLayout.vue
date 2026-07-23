<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { RouterView, useRoute } from 'vue-router'
  import AdminSidebar from '@components/admin/AdminSidebar.vue'
  import AdminTopbar from '@components/admin/AdminTopbar.vue'
  import AdminCommandPalette from '@components/admin/AdminCommandPalette.vue'
  import '@styles/admin.css'

  const collapsed = ref(false)
  const mobileOpen = ref(false)
  const cmdOpen = ref(false)

  const route = useRoute()
  watch(
    () => route.name,
    () => {
      mobileOpen.value = false
    },
  )

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      cmdOpen.value = !cmdOpen.value
    }
    if (e.key === 'Escape') cmdOpen.value = false
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="pf-admin">
    <div class="pf-admin__shell">
      <AdminSidebar
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @toggle="collapsed = !collapsed"
        @close="mobileOpen = false"
      />
      <div class="pf-admin__main">
        <AdminTopbar @open-search="cmdOpen = true" @toggle-sidebar="mobileOpen = !mobileOpen" />
        <main class="pf-admin__content">
          <RouterView v-slot="{ Component }">
            <component :is="Component" />
          </RouterView>
        </main>
      </div>
      <AdminCommandPalette v-if="cmdOpen" @close="cmdOpen = false" />
    </div>
  </div>
</template>
