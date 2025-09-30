<template>
  <li class="tree-group"
      :draggable="folder !== undefined"
      @dragstart="folder && $emit('drag-start-folder', folder.id)"
      @dragover.prevent="onDragOver"
      @drop.prevent="handleDrop">
    <div class="group-header" @click="toggleExpanded">
      <span>{{ isExpanded ? 'V' : '>' }} {{ label }}</span>
      <span class="spacer"></span>
      <div v-if="folder" class="menu-wrap" @click.stop>
        <button class="menu-btn" @click="toggleMenu">…</button>
        <div v-if="menuOpen" class="menu">
          <button @click="$emit('edit-folder', folder.id); closeMenu()">{{ $t('app.edit') }}</button>
          <button class="danger" @click="$emit('delete-folder', folder.id); closeMenu()">{{ $t('app.delete') }}</button>
        </div>
      </div>
    </div>
    <ul v-show="isExpanded">
      <SessionTreeItem
        v-for="s in sessions"
        :key="s.id"
        :session="s"
        @drag-start="$emit('drag-start-session', $event)"
        @clone="$emit('clone-session', $event)"
        @edit="$emit('edit-session', $event)"
        @delete="$emit('delete-session', $event)"
      />
      <slot></slot>
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SessionTreeItem from './SessionTreeItem.vue'

interface Folder {
  id: string
  name: string
}

interface Session {
  id: string
  name: string
  host: string
  user: string
  auth: { method: string }
}

const props = defineProps<{
  folder?: Folder
  label: string
  sessions: Session[]
  expanded?: boolean
}>()

const emit = defineEmits<{
  'drag-start-folder': [id: string]
  'drag-start-session': [id: string]
  'drop': [folderId?: string]
  'edit-folder': [id: string]
  'delete-folder': [id: string]
  'clone-session': [id: string]
  'edit-session': [id: string]
  'delete-session': [id: string]
}>()

// Auto-expand if group has sessions or children
const hasContent = props.sessions.length > 0
const isExpanded = ref(props.expanded ?? hasContent)
const menuOpen = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDrop() {
  emit('drop', props.folder?.id)
}
</script>

<style scoped>
.tree-group { margin: 6px 0; }
.group-header { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 6px 0; 
  cursor: pointer;
}
.group-header .spacer { flex: 1; }
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
ul { list-style: none; padding-left: 20px; }
</style>
