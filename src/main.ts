import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'

// Global styles (Tailwind + custom)
import './styles/main.css'

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
