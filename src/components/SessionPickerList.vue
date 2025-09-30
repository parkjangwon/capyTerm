<template>
  <div class="session-list">
    <!-- Root sessions -->
    <div v-if="rootSessions.length > 0" class="session-group">
      <SessionPickerItem
        v-for="(session, index) in rootSessions"
        :key="session.id"
        :display-name="session.name"
        :user="session.user"
        :host="session.host"
        :is-selected="selectedIndex === index"
        @select="$emit('select-session', session)"
      />
    </div>

    <!-- Folders with sessions -->
    <div 
      v-for="folder in foldersWithSessions" 
      :key="folder.id"
      class="session-group"
    >
      <div class="folder-header">
        <span class="folder-icon">📁</span>
        <span class="folder-name">{{ folder.name }}</span>
      </div>
      <div class="folder-sessions">
        <SessionPickerItem
          v-for="(session, index) in getSessionsInFolder(folder.id)"
          :key="session.id"
          :display-name="session.name"
          :user="session.user"
          :host="session.host"
          :is-selected="selectedIndex === rootSessions.length + getFolderOffset(folder.id) + index"
          @select="$emit('select-session', session)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SessionPickerItem from './SessionPickerItem.vue'
import type { SshSessionItem, SshSessionFolder } from '../stores/settings'

interface Props {
  sessions: SshSessionItem[]
  folders: SshSessionFolder[]
  selectedIndex: number
}

const props = defineProps<Props>()

defineEmits<{
  'select-session': [session: SshSessionItem]
}>()

// Root sessions (no folder)
const rootSessions = computed(() => 
  props.sessions.filter(s => !s.folderId)
)

// Folders that have sessions
const foldersWithSessions = computed(() => 
  props.folders.filter(f => 
    props.sessions.some(s => s.folderId === f.id)
  )
)

function getSessionsInFolder(folderId: string) {
  return props.sessions.filter(s => s.folderId === folderId)
}

// Calculate offset for folder sessions in the flat list
function getFolderOffset(folderId: string): number {
  let offset = 0
  for (const folder of foldersWithSessions.value) {
    if (folder.id === folderId) break
    offset += getSessionsInFolder(folder.id).length
  }
  return offset
}
</script>

<style scoped>
.session-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px 0;
}

.session-group {
  margin-bottom: 16px;
}

.session-group:last-child {
  margin-bottom: 0;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.folder-icon {
  font-size: 16px;
}

.folder-name {
  flex: 1;
}

.folder-sessions {
  padding-left: 12px;
}

/* Scrollbar styling */
.session-list::-webkit-scrollbar {
  width: 8px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.2);
  border-radius: 4px;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.3);
}
</style>
