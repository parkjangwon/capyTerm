<template>
  <div v-if="open" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <header class="modal-header">
        <h3>{{ $t('settings.title') }}</h3>
        <nav class="tabs">
          <button :class="{active: activeTab==='ui'}" @click="activeTab='ui'">{{ $t('settings.tab.ui') }}</button>
          <button :class="{active: activeTab==='session'}" @click="activeTab='session'">{{ $t('settings.tab.session') }}</button>
        </nav>
      </header>
      <section class="modal-body">
        <template v-if="activeTab==='ui'">
          <div class="section">
            <h4>{{ $t('settings.theme') }}</h4>
            <div class="row">
              <label>
                <input type="radio" value="light" v-model="themeLocal" /> {{ $t('settings.light') }}
              </label>
              <label>
                <input type="radio" value="dark" v-model="themeLocal" /> {{ $t('settings.dark') }}
              </label>
            </div>
            <div class="row">
              <label>{{ $t('app.language') }}</label>
              <select v-model="languageLocal" @change="onChangeLanguage">
                <option value="ko">{{ $t('app.korean') }}</option>
                <option value="en">{{ $t('app.english') }}</option>
              </select>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="section">
            <h4>세션 그룹</h4>
            <div class="row add-row toolbar">
              <input v-model="filterText" :placeholder="$t('settings.filterPlaceholder')" />
              <span class="spacer"></span>
              <button @click="openAddChooser">{{ $t('app.add') }}</button>
            </div>

            <div v-if="showSessionForm" class="panel">
              <div class="row add-row">
                <input v-model="sessionForm.name" :placeholder="$t('settings.sessionName')" />
                <input v-model="sessionForm.host" :placeholder="$t('settings.host')" />
                <input v-model.number="sessionForm.port" type="number" :placeholder="$t('settings.port')" />
                <input v-model="sessionForm.user" :placeholder="$t('settings.user')" />
                <select v-model="sessionForm.authMethod">
                  <option value="password">{{ $t('settings.password') }}</option>
                  <option value="key">{{ $t('settings.key') }}</option>
                </select>
                <template v-if="sessionForm.authMethod==='password'">
                  <input v-model="sessionForm.password" type="password" :placeholder="$t('settings.password')" />
                </template>
                <template v-else>
                  <input v-model="sessionForm.privateKeyPath" :placeholder="$t('settings.privateKeyPath')" />
                  <input v-model="sessionForm.passphrase" type="password" :placeholder="$t('settings.passphrase')" />
                </template>
                <select v-model="sessionForm.folderId">
                  <option :value="undefined">{{ $t('settings.sessionGroupLabel') }}</option>
                  <option v-for="f in settings.sshSessionFolders" :key="f.id" :value="f.id">{{ $t('app.sessionGroup') }}: {{ f.name }}</option>
                </select>
                <button @click="saveSession">{{ $t('app.confirm') }}</button>
                <button class="danger" @click="cancelSessionForm">{{ $t('app.cancel') }}</button>
              </div>
            </div>

            <ul class="tree">
              <li class="tree-group">
                <div class="group-header"
                     @click="toggleFolder('root')"
                     @dragover.prevent="onDragOver"
                     @drop.prevent="onDropOnRoot">
                  <span>{{ isOpen('root') ? 'V' : '>' }} {{ $t('settings.root') }}</span>
                </div>
                <ul v-show="isOpen('root')">
                  <li v-for="s in filteredRootSessions" :key="s.id" class="list-item"
                      draggable="true"
                      @dragstart="onDragStartSession(s.id)">
                    <span class="grow">{{ s.name }} — {{ s.user }}@{{ s.host }} ({{ s.auth.method }})</span>
                    <div class="menu-wrap">
                      <button class="menu-btn" @click.stop="toggleSessionMenu(s.id)">…</button>
                      <div v-if="openSessionMenuId===s.id" class="menu" @click.stop>
                        <button @click="cloneSession(s.id); closeMenus()">{{ $t('app.clone') }}</button>
                        <button @click="openSessionEdit(s.id); closeMenus()">{{ $t('app.edit') }}</button>
                        <button class="danger" @click="removeSession(s.id); closeMenus()">{{ $t('app.delete') }}</button>
                      </div>
                    </div>
                  </li>
                </ul>
              </li>
              <li v-for="f in filteredChildGroups(undefined)" :key="f.id" class="tree-group"
                  :draggable="true"
                  @dragstart="onDragStartFolder(f.id)"
                  @dragover.prevent="onDragOver"
                  @drop.prevent="onDropOnFolder(f.id)">
                <div class="group-header" @click="toggleFolder(f.id)">
                  <span>{{ isOpen(f.id) ? 'V' : '>' }} {{ $t('settings.group') }}: {{ f.name }}</span>
                  <span class="spacer"></span>
                  <div class="menu-wrap" @click.stop>
                    <button class="menu-btn" @click="toggleGroupMenu(f.id)">…</button>
                    <div v-if="openGroupMenuId===f.id" class="menu">
                      <button @click="openFolderEdit(f.id); closeMenus()">{{ $t('app.edit') }}</button>
                      <button class="danger" @click="removeFolder(f.id); closeMenus()">{{ $t('app.delete') }}</button>
                    </div>
                  </div>
                </div>
                <ul v-show="isOpen(f.id)">
                  <li v-for="s in filteredSessionsByFolderId(f.id)" :key="s.id" class="list-item"
                      draggable="true"
                      @dragstart="onDragStartSession(s.id)">
                    <span class="grow">{{ s.name }} — {{ s.user }}@{{ s.host }} ({{ s.auth.method }})</span>
                    <div class="menu-wrap">
                      <button class="menu-btn" @click.stop="toggleSessionMenu(s.id)">…</button>
                      <div v-if="openSessionMenuId===s.id" class="menu" @click.stop>
                        <button @click="cloneSession(s.id); closeMenus()">{{ $t('app.clone') }}</button>
                        <button @click="openSessionEdit(s.id); closeMenus()">{{ $t('app.edit') }}</button>
                        <button class="danger" @click="removeSession(s.id); closeMenus()">{{ $t('app.delete') }}</button>
                      </div>
                    </div>
                  </li>
                  <li v-for="cg in filteredChildGroups(f.id)" :key="cg.id" class="tree-group"
                      :draggable="true"
                      @dragstart="onDragStartFolder(cg.id)"
                      @dragover.prevent="onDragOver"
                      @drop.prevent="onDropOnFolder(cg.id)">
                    <div class="group-header" @click="toggleFolder(cg.id)">
                      <span>{{ isOpen(cg.id) ? 'V' : '>' }} {{ $t('settings.group') }}: {{ cg.name }}</span>
                      <span class="spacer"></span>
                      <div class="menu-wrap" @click.stop>
                        <button class="menu-btn" @click="toggleGroupMenu(cg.id)">…</button>
                        <div v-if="openGroupMenuId===cg.id" class="menu">
                          <button @click="openFolderEdit(cg.id); closeMenus()">{{ $t('app.edit') }}</button>
                          <button class="danger" @click="removeFolder(cg.id); closeMenus()">{{ $t('app.delete') }}</button>
                        </div>
                      </div>
                    </div>
                    <ul v-show="isOpen(cg.id)">
                      <li v-for="s in filteredSessionsByFolderId(cg.id)" :key="s.id" class="list-item"
                          draggable="true"
                          @dragstart="onDragStartSession(s.id)">
                        <span class="grow">{{ s.name }} — {{ s.user }}@{{ s.host }} ({{ s.auth.method }})</span>
                          <div class="menu-wrap">
                            <button class="menu-btn" @click.stop="toggleSessionMenu(s.id)">…</button>
                            <div v-if="openSessionMenuId===s.id" class="menu" @click.stop>
                              <button @click="cloneSession(s.id); closeMenus()">{{ $t('app.clone') }}</button>
                              <button @click="openSessionEdit(s.id); closeMenus()">{{ $t('app.edit') }}</button>
                              <button class="danger" @click="removeSession(s.id); closeMenus()">{{ $t('app.delete') }}</button>
                            </div>
                          </div>
                      </li>
                      <!-- deeper levels -->
                      <li v-for="gg in filteredChildGroups(cg.id)" :key="gg.id" class="tree-group"
                          :draggable="true"
                          @dragstart="onDragStartFolder(gg.id)"
                          @dragover.prevent="onDragOver"
                          @drop.prevent="onDropOnFolder(gg.id)">
                        <div class="group-header" @click="toggleFolder(gg.id)">
                          <span>{{ isOpen(gg.id) ? 'V' : '>' }} {{ $t('settings.group') }}: {{ gg.name }}</span>
                          <span class="spacer"></span>
                          <div class="menu-wrap" @click.stop>
                            <button class="menu-btn" @click="toggleGroupMenu(gg.id)">…</button>
                            <div v-if="openGroupMenuId===gg.id" class="menu">
                              <button @click="openFolderEdit(gg.id); closeMenus()">{{ $t('app.edit') }}</button>
                              <button class="danger" @click="removeFolder(gg.id); closeMenus()">{{ $t('app.delete') }}</button>
                            </div>
                          </div>
                        </div>
                        <ul v-show="isOpen(gg.id)">
                          <li v-for="s in filteredSessionsByFolderId(gg.id)" :key="s.id" class="list-item"
                              draggable="true"
                              @dragstart="onDragStartSession(s.id)">
                            <span class="grow">{{ s.name }} — {{ s.user }}@{{ s.host }} ({{ s.auth.method }})</span>
                            <div class="menu-wrap">
                              <button class="menu-btn" @click.stop="toggleSessionMenu(s.id)">…</button>
                              <div v-if="openSessionMenuId===s.id" class="menu" @click.stop>
                                <button @click="cloneSession(s.id); closeMenus()">{{ $t('app.clone') }}</button>
                                <button @click="editSession(s.id); toggleSessionForm(true); closeMenus()">{{ $t('app.edit') }}</button>
                                <button class="danger" @click="removeSession(s.id); closeMenus()">{{ $t('app.delete') }}</button>
                              </div>
                            </div>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>

            <div v-if="folderEdit.id" class="panel">
              <div class="row add-row">
                <input v-model="folderEdit.name" :placeholder="$t('settings.groupName')" />
                <select v-model="folderEdit.parentId">
                  <option :value="undefined">{{ $t('settings.parentNone') }}</option>
                  <option v-for="pf in folderParentOptions(folderEdit.id)" :key="pf.id" :value="pf.id">상위: {{ pf.name }}</option>
                </select>
                <button @click="applyFolderEdit">{{ $t('app.confirm') }}</button>
                <button class="danger" @click="cancelFolderEdit">{{ $t('app.cancel') }}</button>
              </div>
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

            <!-- Group add/edit modal is shared via folderEdit panel above for edit; below is create form -->
            <div v-if="showGroupForm" class="modal-backdrop" @click.self="closeGroupForm">
              <div class="modal small">
                <header class="modal-header"><h3>{{ $t('settings.groupAddTitle') }}</h3></header>
                <section class="modal-body">
                  <div class="row add-row">
                    <input v-model="newFolderName" :placeholder="$t('settings.groupName')" />
                    <select v-model="newFolderParentId">
                      <option :value="undefined">{{ $t('settings.parentNone') }}</option>
                      <option v-for="pf in settings.sshSessionFolders" :key="pf.id" :value="pf.id">상위: {{ pf.name }}</option>
                    </select>
                    <button @click="addFolder">{{ $t('app.add') }}</button>
                    <button class="danger" @click="closeGroupForm">{{ $t('app.cancel') }}</button>
                  </div>
                </section>
              </div>
            </div>

            <!-- Session add/edit modal -->
            <div v-if="showSessionForm" class="modal-backdrop" @click.self="cancelSessionForm">
              <div class="modal">
                <header class="modal-header"><h3>{{ $t('settings.sessionEditTitle', { mode: sessionForm.id ? $t('settings.editMode.edit') : $t('settings.editMode.add') }) }}</h3></header>
                <section class="modal-body">
                  <div class="row add-row">
                    <input v-model="sessionForm.name" :placeholder="$t('settings.sessionName')" />
                    <input v-model="sessionForm.host" :placeholder="$t('settings.host')" />
                    <input v-model.number="sessionForm.port" type="number" :placeholder="$t('settings.port')" />
                    <input v-model="sessionForm.user" :placeholder="$t('settings.user')" />
                    <select v-model="sessionForm.authMethod">
                      <option value="password">{{ $t('settings.password') }}</option>
                      <option value="key">{{ $t('settings.key') }}</option>
                    </select>
                    <template v-if="sessionForm.authMethod==='password'">
                      <input v-model="sessionForm.password" type="password" :placeholder="$t('settings.password')" />
                    </template>
                    <template v-else>
                      <input v-model="sessionForm.privateKeyPath" :placeholder="$t('settings.privateKeyPath')" />
                      <input v-model="sessionForm.passphrase" type="password" :placeholder="$t('settings.passphrase')" />
                    </template>
                    <select v-model="sessionForm.folderId">
                      <option :value="undefined">{{ $t('settings.sessionGroupLabel') }}</option>
                      <option v-for="f in settings.sshSessionFolders" :key="f.id" :value="f.id">{{ $t('app.sessionGroup') }}: {{ f.name }}</option>
                    </select>
                  </div>
                </section>
                <footer class="modal-footer">
                  <button @click="saveSession">{{ $t('app.confirm') }}</button>
                  <button class="danger" @click="cancelSessionForm">{{ $t('app.cancel') }}</button>
                </footer>
              </div>
            </div>
          </div>
        </template>
      </section>
      <footer class="modal-footer">
        <button @click="applyAndClose">{{ $t('app.confirm') }}</button>
      </footer>
    </div>
  </div>
  
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, reactive, defineProps, defineEmits, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits(['close'])

const settings = useSettingsStore()
const { t, locale } = useI18n()

const activeTab = ref<'ui' | 'session'>('ui')
const themeLocal = ref(settings.theme)
const languageLocal = ref(settings.language)
watch(() => props.open, async (val: boolean) => {
  if (val && !settings.loaded) {
    await settings.load()
  }
  themeLocal.value = settings.theme
  languageLocal.value = settings.language
  // prepare folder inputs
  folderEdits.value = Object.fromEntries(settings.sshSessionFolders.map((f: { id: string, name: string }) => [f.id, f.name]))
})

watch(themeLocal, (v: string) => settings.setTheme(v as any))
function onChangeLanguage() {
  settings.setLanguage(languageLocal.value as any)
  locale.value = settings.language
}

const newFolderName = ref('')
const newFolderParentId = ref<string | undefined>(undefined)
const folderEdits = ref<Record<string, string>>({})
const expanded = ref<Record<string, boolean>>({ root: true })
const showSessionForm = ref(false)
const folderEdit = reactive<{ id?: string, name?: string, parentId?: string | undefined }>({})
const addChooserOpen = ref(false)
const addType = ref<string>('')
const showGroupForm = ref(false)
const filterText = ref('')

function addFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  settings.addFolder(name, newFolderParentId.value)
  newFolderName.value = ''
  newFolderParentId.value = undefined
}

function saveFolderName(id: string) {
  const name = folderEdits.value[id]?.trim()
  if (!name) return
  settings.renameFolder(id, name)
}

function removeFolder(id: string) {
  settings.removeFolder(id)
}

const sessionForm = reactive<any>({
  id: undefined,
  name: '',
  host: '',
  port: 22,
  user: '',
  authMethod: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: '',
  folderId: undefined as string | undefined,
})

function resetSessionForm() {
  Object.assign(sessionForm, { id: undefined, name: '', host: '', port: 22, user: '', authMethod: 'password', password: '', privateKeyPath: '', passphrase: '', folderId: undefined })
}

function saveSession() {
  if (!sessionForm.name || !sessionForm.host || !sessionForm.user) return
  if (sessionForm.authMethod === 'password') {
    settings.upsertSession({
      id: sessionForm.id,
      name: sessionForm.name,
      host: sessionForm.host,
      port: sessionForm.port,
      user: sessionForm.user,
      folderId: sessionForm.folderId,
      auth: { method: 'password', password: sessionForm.password }
    })
  } else {
    settings.upsertSession({
      id: sessionForm.id,
      name: sessionForm.name,
      host: sessionForm.host,
      port: sessionForm.port,
      user: sessionForm.user,
      folderId: sessionForm.folderId,
      auth: { method: 'key', privateKeyPath: sessionForm.privateKeyPath, passphrase: sessionForm.passphrase || undefined }
    })
  }
  resetSessionForm()
  showSessionForm.value = false
}

function editSession(id: string) {
  const s = settings.sshSessions.find(x => x.id === id)
  if (!s) return
  sessionForm.id = s.id
  sessionForm.name = s.name
  sessionForm.host = s.host
  sessionForm.port = s.port || 22
  sessionForm.user = s.user
  sessionForm.folderId = s.folderId
  if (s.auth.method === 'password') {
    sessionForm.authMethod = 'password'
    sessionForm.password = (s.auth as any).password || ''
    sessionForm.privateKeyPath = ''
    sessionForm.passphrase = ''
  } else {
    sessionForm.authMethod = 'key'
    sessionForm.privateKeyPath = (s.auth as any).privateKeyPath || ''
    sessionForm.passphrase = (s.auth as any).passphrase || ''
    sessionForm.password = ''
  }
}

function openSessionEdit(id: string) {
  editSession(id)
  showSessionForm.value = true
}

function removeSession(id: string) {
  settings.removeSession(id)
}

function cloneSession(id: string) {
  const s = settings.sshSessions.find(x => x.id === id)
  if (!s) return
  const clone = JSON.parse(JSON.stringify(s))
  delete clone.id
  clone.name = `${s.name} (copy)`
  settings.upsertSession(clone)
}

function sessionsByFolderId(folderId: string) {
  return settings.sshSessions.filter(s => s.folderId === folderId)
}

const rootSessions = computed(() => settings.sshSessions.filter(s => !s.folderId))

const filteredRootSessions = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return rootSessions.value
  return rootSessions.value.filter(s => `${s.name} ${s.user} ${s.host}`.toLowerCase().includes(q))
})

function childGroups(parentId: string | undefined) {
  return settings.sshSessionFolders.filter(g => g.parentId === parentId)
}

function filteredChildGroups(parentId: string | undefined) {
  const q = filterText.value.trim().toLowerCase()
  const list = childGroups(parentId)
  if (!q) return list
  return list.filter(g => g.name.toLowerCase().includes(q))
}

function filteredSessionsByFolderId(folderId: string) {
  const q = filterText.value.trim().toLowerCase()
  const list = settings.sshSessions.filter(s => s.folderId === folderId)
  if (!q) return list
  return list.filter(s => `${s.name} ${s.user} ${s.host}`.toLowerCase().includes(q))
}

function toggleFolder(id: string) {
  expanded.value[id] = !expanded.value[id]
}
function isOpen(id: string) {
  return !!expanded.value[id]
}

function toggleSessionForm(val?: boolean) {
  showSessionForm.value = typeof val === 'boolean' ? val : !showSessionForm.value
  if (showSessionForm.value) resetSessionForm()
}

function openAddChooser() { addType.value = ''; addChooserOpen.value = true }
function closeAddChooser() { addChooserOpen.value = false }
function confirmAdd() {
  if (addType.value === 'session') {
    showSessionForm.value = true
    addChooserOpen.value = false
  } else if (addType.value === 'group') {
    showGroupForm.value = true
    addChooserOpen.value = false
  }
}
function closeGroupForm() { showGroupForm.value = false }

function openFolderEdit(id: string) {
  const f = settings.sshSessionFolders.find(x => x.id === id)
  if (!f) return
  folderEdit.id = f.id
  folderEdit.name = f.name
  folderEdit.parentId = f.parentId
}
function cancelFolderEdit() { folderEdit.id = undefined; folderEdit.name = undefined; folderEdit.parentId = undefined }
function applyFolderEdit() {
  if (!folderEdit.id || !folderEdit.name) return
  settings.renameFolder(folderEdit.id, folderEdit.name)
  settings.moveFolder(folderEdit.id, folderEdit.parentId)
  cancelFolderEdit()
}

function folderParentOptions(excludeId: string) {
  return settings.sshSessionFolders.filter(f => f.id !== excludeId)
}

// --- Drag & Drop ---
let dragFolderId: string | undefined
let dragSessionId: string | undefined
function onDragStartFolder(id: string) { dragFolderId = id; dragSessionId = undefined }
function onDragStartSession(id: string) { dragSessionId = id; dragFolderId = undefined }
function onDragOver(e: DragEvent) { e.preventDefault() }
function onDropOnFolder(targetFolderId: string) {
  if (dragFolderId) {
    // move folder under target folder
    settings.moveFolder(dragFolderId, targetFolderId)
  } else if (dragSessionId) {
    settings.moveSessionToFolder(dragSessionId, targetFolderId)
  }
  dragFolderId = undefined; dragSessionId = undefined
}
function onDropOnRoot() {
  if (dragFolderId) settings.moveFolder(dragFolderId, undefined)
  if (dragSessionId) settings.moveSessionToFolder(dragSessionId, undefined)
  dragFolderId = undefined; dragSessionId = undefined
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    // 우선순위: 가장 안쪽 모달부터 닫기
    if (showSessionForm.value) { showSessionForm.value = false; return }
    if (showGroupForm.value) { showGroupForm.value = false; return }
    if (addChooserOpen.value) { addChooserOpen.value = false; return }
    close()
  }
}

// context menus open/close state
const openGroupMenuId = ref<string>('')
const openSessionMenuId = ref<string>('')
function toggleGroupMenu(id: string) {
  openGroupMenuId.value = openGroupMenuId.value === id ? '' : id
  openSessionMenuId.value = ''
}
function toggleSessionMenu(id: string) {
  openSessionMenuId.value = openSessionMenuId.value === id ? '' : id
  openGroupMenuId.value = ''
}
function closeMenus() { openGroupMenuId.value = ''; openSessionMenuId.value = '' }

onMounted(() => {
  window.addEventListener('keydown', onEsc)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEsc)
})

function close() { emit('close') }
function applyAndClose() { settings.save(); emit('close') }
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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
.modal-header, .modal-footer {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-footer { border-top: 1px solid var(--border); border-bottom: none; text-align: right; }
.modal-body { padding: 16px; }
.close-btn { background: transparent; border: none; color: var(--fg); font-size: 18px; cursor: pointer; }
.section { margin-bottom: 20px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.add-row input { width: 180px; }
.list { list-style: none; padding: 0; margin: 8px 0 0 0; display: flex; flex-direction: column; gap: 6px; }
.list-item { display: flex; gap: 8px; align-items: center; padding: 6px 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; }
.list-item .grow { flex: 1; }
input, select { background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
button { background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; cursor: pointer; }
button.danger { background: #a33; color: white; border-color: #a33; }
.tree { list-style: none; padding-left: 0; }
.tree-group { margin: 6px 0; }
.tree-header { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; }
.tree-header .spacer { flex: 1; }
.group-header { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.group-header .spacer { flex: 1; }
.drag-icon { opacity: 0.7; cursor: grab; }
.menu-wrap { position: relative; }
.menu-btn { background: transparent; border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; }
.menu { position: absolute; right: 0; top: 120%; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 6px; display: flex; flex-direction: row; flex-wrap: nowrap; gap: 6px; z-index: 2000; }
/* 버튼 폭 개선: 글자 크기 기준으로 한 줄 배치 */
.menu button { min-width: max-content; white-space: nowrap; }
.row.add-row button, .modal-footer button { min-width: max-content; white-space: nowrap; }
</style>


