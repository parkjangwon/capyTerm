<template>
  <div 
    class="session-item"
    :draggable="!isFolder"
    @dragstart="!isFolder && $emit('drag-start')"
  >
    <div class="session-icon">
      <span v-if="isFolder">📁</span>
      <span v-else>🖥️</span>
    </div>
    <div class="session-info">
      <div class="session-name">{{ displayName }}</div>
      <div v-if="!isFolder" class="session-details">
        {{ user }}@{{ host }} · {{ authMethod }}
      </div>
    </div>
    <div class="session-actions" @click.stop>
      <button class="action-btn" @click="toggleMenu">⋯</button>
      <div v-if="menuOpen" class="action-menu">
        <button v-if="!isFolder" @click="handleAction('clone')">복제</button>
        <button @click="handleAction('edit')">편집</button>
        <button class="danger" @click="handleAction('delete')">삭제</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  displayName: string
  user?: string
  host?: string
  authMethod?: string
  isFolder?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'drag-start': []
  clone: []
  edit: []
  delete: []
}>()

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function handleAction(action: 'clone' | 'edit' | 'delete') {
  if (action === 'clone') emit('clone')
  else if (action === 'edit') emit('edit')
  else if (action === 'delete') emit('delete')
  menuOpen.value = false
}
</script>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  background: var(--panel);
  border: 1px solid var(--border);
  margin-bottom: 6px;
}

.session-item:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.05);
  border-color: rgba(25, 118, 210, 0.3);
}

.session-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-details {
  font-size: 12px;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.session-actions {
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
</style>
