import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', '.vscode/**', 'coverage/**', 'vite.config.ts', 'eslint.config.ts'],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Vue 3
  ...pluginVue.configs['flat/recommended'],

  // Custom rule overrides
  {
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        WebSocket: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
      },
      parserOptions: {
        parser: tseslint.parser,
        project: ['./tsconfig.app.json'],
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Vue specific
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'],
        },
      ],
      'vue/block-lang': [
        'error',
        {
          script: { lang: 'ts' },
        },
      ],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/no-unused-refs': 'warn',
      'vue/padding-line-between-blocks': 'error',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },

  // Prettier must be last – disables all formatting rules
  eslintConfigPrettier,
)
