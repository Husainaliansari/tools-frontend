<script setup lang="ts">
  /**
   * Generic admin data table. Provide `columns` and `rows`; override any cell
   * with a scoped slot named `cell-<key>` receiving `{ row, value }`.
   *
   * Column sorting is server-driven: mark a column `sortable`, bind `sortKey`
   * and `sortDir`, and handle the `sort` event (fired with the column key) by
   * updating your query and reloading.
   */
  import AdminIcon from './AdminIcon.vue'

  interface Column {
    key: string
    label: string
    align?: 'left' | 'right' | 'center'
    width?: string
    nowrap?: boolean
    sortable?: boolean
  }

  const props = withDefaults(
    defineProps<{
      columns: Column[]
      rows: Record<string, unknown>[]
      rowKey?: string
      loading?: boolean
      emptyLabel?: string
      clickable?: boolean
      sortKey?: string
      sortDir?: 'asc' | 'desc'
    }>(),
    { rowKey: 'id', emptyLabel: 'No records found.' },
  )
  const emit = defineEmits<{
    rowClick: [Record<string, unknown>]
    sort: [string]
  }>()
</script>

<template>
  <div class="ad-table-wrap">
    <table class="ad-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align ?? 'left', width: col.width }"
            :class="{ 'is-sortable': col.sortable, 'is-active': col.sortable && sortKey === col.key }"
            @click="col.sortable && emit('sort', col.key)"
          >
            <slot :name="`header-${col.key}`" :col="col">
              <span class="ad-th">
                {{ col.label }}
                <AdminIcon
                  v-if="col.sortable"
                  :name="sortKey === col.key ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down'"
                  :size="13"
                  class="ad-th__sort"
                />
              </span>
            </slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="ad-table__state">
            <span class="ad-spinner" style="margin: 0 auto" />
          </td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="ad-table__state ad-muted">{{ emptyLabel }}</td>
        </tr>
        <tr
          v-for="row in rows"
          v-else
          :key="String(row[rowKey])"
          :class="{ 'is-clickable': clickable }"
          @click="clickable && emit('rowClick', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align ?? 'left', whiteSpace: col.nowrap ? 'nowrap' : undefined }"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
  .ad-table-wrap { overflow-x: auto; }
  .ad-table__state { text-align: center; padding: 32px 16px; font-size: 13.5px; }
  .ad-th { display: inline-flex; align-items: center; gap: 4px; }
  th.is-sortable { cursor: pointer; user-select: none; }
  th.is-sortable:hover { color: var(--ad-text); }
  .ad-th__sort { opacity: 0.4; }
  th.is-active .ad-th__sort { opacity: 1; color: var(--ad-primary); }
</style>
