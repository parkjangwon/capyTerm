<template>
  <li class="list-item"
      draggable="true"
      @dragstart="$emit('drag-start', session.id)">
    <span class="grow">{{ session.name }} — {{ session.user }}@{{ session.host }} ({{ session.auth.method }})</span>
    <div class="menu-wrap">
      <button class="menu-btn" @click.stop="toggleMenu">…</button>
      <div v-if="menuOpen" class="menu" @click.stop>
        <button @click="$emit('clone', session.id); closeMenu()">{{ $t('app.clone') }}</button>
        <button @click="$emit('edit', session.id); closeMenu()">{{ $t('app.edit') }}</button>
        <button class="danger" @click="$emit('delete', session.id); closeMenu()">{{ $t('app.delete') }}</button>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Session {
  id: string
  name: string
  host: string
  user: string
  auth: { method: string }
}

defineProps<{
  session: Session
}>()

defineEmits<{
  'drag-start': [id: string]
  clone: [id: string]
  edit: [id: string]
  delete: [id: string]
}>()

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}
</script>

<style scoped>
.list-item { 
  display: flex; 
  gap: 8px; 
  align-items: center; 
  padding: 6px 8px; 
  background: var(--panel); 
  border: 1px solid var(--border); 
  border-radius: 6px; 
}
.list-item .grow { flex: 1; }
.menu-wrap { position: relative; }
.menu-btn { background: transparent; border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.menu { 
  position: absolute; 
  right: 0; 
  top: 120%; 
  background: var(--panel); 
  border: 1px solid var(--border); 
  border-radius: 6px; 
  padding: 6px; 
  display: flex; 
  flex-direction: row; 
  flex-wrap: nowrap; 
  gap: 6px; 
  z-index: 2000; 
}
.menu button { min-width: max-content; white-space: nowrap; }
button { background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; cursor: pointer; }
button.danger { background: #a33; color: white; border-color: #a33; }
</style>
