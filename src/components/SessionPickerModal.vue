<template>
  <div v-if="open" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <header class="modal-header">
        <h3>세션 선택</h3>
        <input 
          ref="searchInput"
          v-model="searchQuery" 
          type="text"
          class="search-input"
          placeholder="세션 검색..."
          @keydown.down.prevent="moveDown"
          @keydown.up.prevent="moveUp"
          @keydown.enter.prevent="selectCurrent"
          @keydown.esc="close"
        />
      </header>
      <section class="modal-body">
        <div v-if="filteredSessions.length === 0" class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>검색 결과가 없습니다</p>
        </div>
        <SessionPickerList
          v-else
          :sessions="filteredSessions"
          :folders="folders"
          :selected-index="selectedIndex"
          @select-session="handleSelectSession"
        />
      </section>
      <footer class="modal-footer">
        <div class="footer-hint">
          <kbd>↑</kbd><kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 선택 · <kbd>Esc</kbd> 닫기
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import SessionPickerList from './SessionPickerList.vue'
import { useSettingsStore } from '../stores/settings'
import type { SshSessionItem } from '../stores/settings'

interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'select-session': [session: SshSessionItem]
}>()

const settings = useSettingsStore()
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)

// Computed
const folders = computed(() => settings.sshSessionFolders)

const filteredSessions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return settings.sshSessions
  
  return settings.sshSessions.filter(session => {
    const searchText = `${session.name} ${session.user} ${session.host}`.toLowerCase()
    return searchText.includes(query)
  })
})

// Flatten sessions list for keyboard navigation (root sessions first, then folder sessions)
const flatSessionsList = computed(() => {
  const rootSessions = filteredSessions.value.filter(s => !s.folderId)
  const foldersWithSessions = folders.value.filter(f => 
    filteredSessions.value.some(s => s.folderId === f.id)
  )
  
  const folderSessions: SshSessionItem[] = []
  foldersWithSessions.forEach(folder => {
    const sessionsInFolder = filteredSessions.value.filter(s => s.folderId === folder.id)
    folderSessions.push(...sessionsInFolder)
  })
  
  return [...rootSessions, ...folderSessions]
})

const totalSessionCount = computed(() => flatSessionsList.value.length)

// Methods
function moveDown() {
  if (selectedIndex.value < totalSessionCount.value - 1) {
    selectedIndex.value++
  }
}

function moveUp() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

function selectCurrent() {
  if (flatSessionsList.value.length > 0 && selectedIndex.value < flatSessionsList.value.length) {
    const session = flatSessionsList.value[selectedIndex.value]
    handleSelectSession(session)
  }
}

function handleSelectSession(session: SshSessionItem) {
  emit('select-session', session)
  close()
}

function close() {
  emit('close')
  searchQuery.value = ''
  selectedIndex.value = 0
}

// Watch for modal open to focus search input
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    searchInput.value?.focus()
  }
})

// Reset selected index when search changes
watch(searchQuery, () => {
  selectedIndex.value = 0
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.modal {
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--bg);
  color: var(--fg);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(var(--fg-rgb, 0, 0, 0), 0.1);
}

.modal-header h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg);
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.modal-footer {
  padding: 12px 24px;
  border-top: 1px solid rgba(var(--fg-rgb, 0, 0, 0), 0.1);
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.02);
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.6);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
