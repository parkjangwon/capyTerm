<template>
  <div 
    class="session-group"
    :draggable="isFolder"
    @dragstart="isFolder && $emit('drag-start-folder')"
    @dragover.prevent
    @drop.prevent="$emit('drop')"
  >
    <div v-if="showHeader" class="group-header" @click="toggleExpanded">
      <span class="expand-icon">{{ isExpanded ? '▼' : '▶' }}</span>
      <div class="group-icon">
        <span v-if="isFolder">📁</span>
        <span v-else>📂</span>
      </div>
      <div class="group-info">
        <span class="group-name">{{ label }}</span>
        <span class="group-count">{{ sessions.length }}개</span>
      </div>
      <div v-if="isFolder" class="group-actions" @click.stop>
        <button class="action-btn" @click="toggleMenu">⋯</button>
        <div v-if="menuOpen" class="action-menu" :class="{ 'menu-above': menuAbove }" ref="menuRef">
          <button @click="handleAction('edit')">편집</button>
          <button class="danger" @click="handleAction('delete')">삭제</button>
        </div>
      </div>
    </div>

    <div v-show="isExpanded" class="group-content">
      <div class="sessions-list">
        <SessionListItem
          v-for="session in sessions"
          :key="session.id"
          :display-name="session.name"
          :user="session.user"
          :host="session.host"
          :auth-method="session.auth.method"
          @drag-start="$emit('drag-start-session', session.id)"
          @clone="$emit('clone-session', session.id)"
          @edit="$emit('edit-session', session.id)"
          @delete="$emit('delete-session', session.id)"
        />
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SessionListItem from './SessionListItem.vue'

interface Session {
  id: string
  name: string
  host: string
  user: string
  auth: { method: string }
}

interface Props {
  label: string
  sessions: Session[]
  isFolder?: boolean
  showHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFolder: false,
  showHeader: true
})

const emit = defineEmits<{
  'drag-start-folder': []
  'drag-start-session': [id: string]
  'drop': []
  'edit': []
  'delete': []
  'clone-session': [id: string]
  'edit-session': [id: string]
  'delete-session': [id: string]
}>()

// Auto-expand if group has sessions
const hasContent = computed(() => props.sessions.length > 0)
const isExpanded = ref(hasContent.value)
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const menuAbove = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function toggleMenu(event: MouseEvent) {
  menuOpen.value = !menuOpen.value
  
  if (menuOpen.value) {
    // Check if menu would overflow viewport
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const menuHeight = 80 // Approximate menu height
    const spaceBelow = window.innerHeight - rect.bottom
    
    menuAbove.value = spaceBelow < menuHeight + 10
  }
}

function handleAction(action: 'edit' | 'delete') {
  if (action === 'edit') emit('edit')
  else if (action === 'delete') emit('delete')
  menuOpen.value = false
}
</script>

<style scoped>
.session-group {
  margin-bottom: 16px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.03);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-bottom: 8px;
}

.group-header:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.06);
}

.expand-icon {
  font-size: 10px;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.6);
  width: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-size: 12px;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.5);
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.08);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.group-actions {
  position: relative;
  flex-shrink: 0;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.05);
  border-color: #1976d2;
}

.action-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 100px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-menu.menu-above {
  top: auto;
  bottom: calc(100% + 4px);
}

.action-menu button {
  background: transparent;
  border: none;
  color: var(--fg);
  padding: 8px 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}

.action-menu button:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.08);
}

.action-menu button.danger {
  color: #d32f2f;
}

.action-menu button.danger:hover {
  background: rgba(211, 47, 47, 0.1);
}

.group-content {
  padding-left: 20px;
}

.sessions-list {
  display: flex;
  flex-direction: column;
}
</style>
