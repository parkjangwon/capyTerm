<template>
  <div class="section">
    <div class="toolbar">
      <input 
        v-model="filterText" 
        class="search-input"
        :placeholder="$t('settings.filterPlaceholder')" 
      />
      <button class="add-btn" @click="openAddChooser">
        <span class="btn-icon">+</span>
        {{ $t('app.add') }}
      </button>
    </div>

    <div class="sessions-container">
      <!-- Root sessions (미지정) -->
      <SessionGroup
        v-if="filteredRootSessions.length > 0"
        :label="$t('settings.root')"
        :sessions="filteredRootSessions"
        :show-header="true"
        @drag-start-session="onDragStartSession"
        @drop="onDropOnRoot"
        @clone-session="cloneSession"
        @edit-session="openSessionEdit"
        @delete-session="removeSession"
      />

      <!-- Folders with sessions -->
      <SessionGroup
        v-for="folder in filteredFolders"
        :key="folder.id"
        :label="folder.name"
        :sessions="filteredSessionsByFolderId(folder.id)"
        :is-folder="true"
        @drag-start-folder="onDragStartFolder(folder.id)"
        @drag-start-session="onDragStartSession"
        @drop="onDropOnFolder(folder.id)"
        @edit="openFolderEdit(folder.id)"
        @delete="removeFolder(folder.id)"
        @clone-session="cloneSession"
        @edit-session="openSessionEdit"
        @delete-session="removeSession"
      />
    </div>

    <!-- Add chooser modal -->
    <div v-if="addChooserOpen" class="modal-backdrop" @click.self="closeAddChooser">
      <div class="modal small">
        <header class="modal-header"><h3>{{ $t('app.add') }}</h3></header>
        <section class="modal-body">
          <div class="row">
            <select v-model="addType">
              <option disabled value="">{{ $t('settings.addWhat') }}</option>
              <option value="session">{{ $t('app.session') }}</option>
              <option value="group">{{ $t('app.sessionGroup') }}</option>
            </select>
            <button @click="confirmAdd">{{ $t('app.confirm') }}</button>
            <button class="danger" @click="closeAddChooser">{{ $t('app.cancel') }}</button>
          </div>
        </section>
      </div>
    </div>

    <!-- Session Form -->
    <SessionForm
      v-if="showSessionForm"
      :initial-session="sessionFormData"
      :folders="settings.sshSessionFolders"
      @save="saveSession"
      @cancel="cancelSessionForm"
    />

    <!-- Folder Form -->
    <FolderForm
      v-if="showGroupForm"
      :available-parents="settings.sshSessionFolders"
      @save="addFolder"
      @cancel="closeGroupForm"
    />

    <!-- Folder Edit Form -->
    <FolderForm
      v-if="folderEdit.id"
      :title="$t('app.edit')"
      :initial-name="folderEdit.name"
      :initial-parent-id="folderEdit.parentId"
      :available-parents="folderParentOptions(folderEdit.id)"
      @save="applyFolderEdit"
      @cancel="cancelFolderEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import SessionGroup from './SessionGroup.vue'
import SessionForm from './SessionForm.vue'
import FolderForm from './FolderForm.vue'

const settings = useSettingsStore()

const filterText = ref('')
const addChooserOpen = ref(false)
const addType = ref<string>('')
const showSessionForm = ref(false)
const showGroupForm = ref(false)
const sessionFormData = ref<any>({})
const folderEdit = reactive<{ id?: string, name?: string, parentId?: string | undefined }>({})

// Drag & Drop
let dragFolderId: string | undefined
let dragSessionId: string | undefined

function onDragStartFolder(id: string) { 
  dragFolderId = id
  dragSessionId = undefined 
}

function onDragStartSession(id: string) { 
  dragSessionId = id
  dragFolderId = undefined 
}

function onDropOnFolder(targetFolderId?: string) {
  if (dragFolderId) {
    settings.moveFolder(dragFolderId, targetFolderId)
  } else if (dragSessionId) {
    settings.moveSessionToFolder(dragSessionId, targetFolderId)
  }
  dragFolderId = undefined
  dragSessionId = undefined
}

function onDropOnRoot() {
  if (dragFolderId) settings.moveFolder(dragFolderId, undefined)
  if (dragSessionId) settings.moveSessionToFolder(dragSessionId, undefined)
  dragFolderId = undefined
  dragSessionId = undefined
}

// Filtering
const rootSessions = computed(() => settings.sshSessions.filter(s => !s.folderId))

const filteredRootSessions = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return rootSessions.value
  return rootSessions.value.filter(s => s.name.toLowerCase().includes(q) || `${s.user} ${s.host}`.toLowerCase().includes(q))
})

// Get all folders that match filter or contain matching sessions
const filteredFolders = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return settings.sshSessionFolders
  
  return settings.sshSessionFolders.filter(folder => {
    // Show folder if name matches
    if (folder.name.toLowerCase().includes(q)) return true
    // Show folder if it contains matching sessions
    const sessionsInFolder = settings.sshSessions.filter(s => s.folderId === folder.id)
    return sessionsInFolder.some(s => 
      s.name.toLowerCase().includes(q) || 
      `${s.user} ${s.host}`.toLowerCase().includes(q)
    )
  })
})

function filteredSessionsByFolderId(folderId: string) {
  const q = filterText.value.trim().toLowerCase()
  const list = settings.sshSessions.filter(s => s.folderId === folderId)
  if (!q) return list
  return list.filter(s => s.name.toLowerCase().includes(q) || `${s.user} ${s.host}`.toLowerCase().includes(q))
}

// Session actions
function openSessionEdit(id: string) {
  const s = settings.sshSessions.find(x => x.id === id)
  if (!s) return
  
  sessionFormData.value = {
    id: s.id,
    name: s.name,
    host: s.host,
    port: s.port || 22,
    user: s.user,
    folderId: s.folderId,
    authMethod: s.auth.method === 'password' ? 'password' : 'key',
    password: s.auth.method === 'password' ? (s.auth as any).password || '' : '',
    privateKeyPath: s.auth.method === 'key' ? (s.auth as any).privateKeyPath || '' : '',
    passphrase: s.auth.method === 'key' ? (s.auth as any).passphrase || '' : ''
  }
  showSessionForm.value = true
}

function saveSession(session: any) {
  if (!session.name || !session.host || !session.user) return
  
  if (session.authMethod === 'password') {
    settings.upsertSession({
      id: session.id,
      name: session.name,
      host: session.host,
      port: session.port,
      user: session.user,
      folderId: session.folderId,
      auth: { method: 'password', password: session.password }
    })
  } else {
    settings.upsertSession({
      id: session.id,
      name: session.name,
      host: session.host,
      port: session.port,
      user: session.user,
      folderId: session.folderId,
      auth: { method: 'key', privateKeyPath: session.privateKeyPath, passphrase: session.passphrase || undefined }
    })
  }
  
  cancelSessionForm()
}

function cancelSessionForm() {
  showSessionForm.value = false
  sessionFormData.value = {}
}

function removeSession(id: string) {
  const session = settings.sshSessions.find(s => s.id === id)
  if (!session) return
  if (confirm(`세션 "${session.name}"을(를) 삭제하시겠습니까?`)) {
    settings.removeSession(id)
  }
}

function cloneSession(id: string) {
  const s = settings.sshSessions.find(x => x.id === id)
  if (!s) return
  const clone = JSON.parse(JSON.stringify(s))
  delete clone.id
  clone.name = `${s.name} (copy)`
  settings.upsertSession(clone)
}

// Folder actions
function openFolderEdit(id: string) {
  const f = settings.sshSessionFolders.find(x => x.id === id)
  if (!f) return
  folderEdit.id = f.id
  folderEdit.name = f.name
  folderEdit.parentId = f.parentId
}

function cancelFolderEdit() { 
  folderEdit.id = undefined
  folderEdit.name = undefined
  folderEdit.parentId = undefined 
}

function applyFolderEdit(data: { name: string, parentId?: string }) {
  if (!folderEdit.id) return
  settings.renameFolder(folderEdit.id, data.name)
  settings.moveFolder(folderEdit.id, data.parentId)
  cancelFolderEdit()
}

function removeFolder(id: string) {
  const folder = settings.sshSessionFolders.find(f => f.id === id)
  if (!folder) return
  const sessionsInFolder = settings.sshSessions.filter(s => s.folderId === id)
  const childFolders = settings.sshSessionFolders.filter(f => f.parentId === id)
  
  let message = `세션 그룹 "${folder.name}"을(를) 삭제하시겠습니까?`
  if (sessionsInFolder.length > 0 || childFolders.length > 0) {
    message += `\n\n포함된 세션 ${sessionsInFolder.length}개와 하위 그룹 ${childFolders.length}개도 함께 삭제됩니다.`
  }
  
  if (confirm(message)) {
    settings.removeFolder(id)
  }
}

function folderParentOptions(excludeId: string) {
  return settings.sshSessionFolders.filter(f => f.id !== excludeId)
}

// Add chooser
function openAddChooser() { 
  addType.value = ''
  addChooserOpen.value = true
  // Add ESC listener for add chooser
  window.addEventListener('keydown', onAddChooserEsc)
}

function closeAddChooser() { 
  addChooserOpen.value = false
  window.removeEventListener('keydown', onAddChooserEsc)
}

function onAddChooserEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && addChooserOpen.value) {
    e.stopPropagation()
    closeAddChooser()
  }
}

function confirmAdd() {
  if (addType.value === 'session') {
    sessionFormData.value = {}
    showSessionForm.value = true
    addChooserOpen.value = false
  } else if (addType.value === 'group') {
    showGroupForm.value = true
    addChooserOpen.value = false
  }
}

function closeGroupForm() { 
  showGroupForm.value = false 
}

function addFolder(data: { name: string, parentId?: string }) {
  settings.addFolder(data.name, data.parentId)
  closeGroupForm()
}
</script>

<style scoped>
.section { 
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
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

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-btn:hover {
  background: #1565c0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-icon {
  font-size: 18px;
  line-height: 1;
}

.sessions-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.sessions-container::-webkit-scrollbar {
  width: 8px;
}

.sessions-container::-webkit-scrollbar-track {
  background: transparent;
}

.sessions-container::-webkit-scrollbar-thumb {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.2);
  border-radius: 4px;
}

.sessions-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.3);
}

input, select { background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
button:not(.add-btn):not(.action-btn) { background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; cursor: pointer; }
button.danger { background: #a33; color: white; border-color: #a33; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.modal {
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
}
.modal.small { width: 520px; }
.modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-body { padding: 16px; }
</style>
