<template>
  <div class="modal-backdrop" @click.self="$emit('cancel')">
    <div class="modal">
      <header class="modal-header">
        <h3>{{ $t('settings.sessionEditTitle', { mode: session.id ? $t('settings.editMode.edit') : $t('settings.editMode.add') }) }}</h3>
      </header>
      <section class="modal-body">
        <div class="row add-row">
          <input v-model="session.name" :placeholder="$t('settings.sessionName')" />
          <input v-model="session.host" :placeholder="$t('settings.host')" />
          <input v-model.number="session.port" type="number" :placeholder="$t('settings.port')" />
          <input v-model="session.user" :placeholder="$t('settings.user')" />
          <select v-model="session.authMethod">
            <option value="password">{{ $t('settings.password') }}</option>
            <option value="key">{{ $t('settings.key') }}</option>
          </select>
          <template v-if="session.authMethod==='password'">
            <input v-model="session.password" type="password" :placeholder="$t('settings.password')" />
          </template>
          <template v-else>
            <input v-model="session.privateKeyPath" :placeholder="$t('settings.privateKeyPath')" />
            <input v-model="session.passphrase" type="password" :placeholder="$t('settings.passphrase')" />
          </template>
          <select v-model="session.folderId">
            <option :value="undefined">{{ $t('settings.sessionGroupLabel') }}</option>
            <option v-for="f in folders" :key="f.id" :value="f.id">{{ $t('app.sessionGroup') }}: {{ f.name }}</option>
          </select>
        </div>
      </section>
      <footer class="modal-footer">
        <button @click="$emit('save', session)">{{ $t('app.confirm') }}</button>
        <button class="danger" @click="$emit('cancel')">{{ $t('app.cancel') }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, onBeforeUnmount } from 'vue'

interface SessionFormData {
  id?: string
  name: string
  host: string
  port: number
  user: string
  authMethod: 'password' | 'key'
  password: string
  privateKeyPath: string
  passphrase: string
  folderId?: string
}

const props = defineProps<{
  initialSession?: Partial<SessionFormData>
  folders: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  save: [session: SessionFormData]
  cancel: []
}>()

const session = reactive<SessionFormData>({
  id: undefined,
  name: '',
  host: '',
  port: 22,
  user: '',
  authMethod: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: '',
  folderId: undefined,
  ...props.initialSession
})

watch(() => props.initialSession, (newVal) => {
  if (newVal) {
    // Create default values first, then override with newVal
    const defaults: SessionFormData = {
      id: undefined,
      name: '',
      host: '',
      port: 22,
      user: '',
      authMethod: 'password',
      password: '',
      privateKeyPath: '',
      passphrase: '',
      folderId: undefined
    }
    // Merge newVal into defaults, preserving id if it exists
    const merged = { ...defaults, ...newVal }
    Object.assign(session, merged)
  }
}, { deep: true })

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('cancel')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onEsc)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEsc)
})
</script>

<style scoped>
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
  width: 700px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
}
.modal-header, .modal-footer {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-footer { border-top: 1px solid var(--border); border-bottom: none; text-align: right; }
.modal-body { padding: 16px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.add-row input { width: 180px; }
input, select { background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
button { background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; cursor: pointer; }
button.danger { background: #a33; color: white; border-color: #a33; }
</style>
