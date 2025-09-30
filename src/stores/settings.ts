import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

export interface SshSessionFolder {
  id: string
  name: string
  parentId?: string
}

export interface SshPasswordAuth {
  method: 'password'
  password: string
}

export interface SshKeyAuth {
  method: 'key'
  privateKeyPath: string
  passphrase?: string
}

export type SshAuth = SshPasswordAuth | SshKeyAuth

export interface SshSessionItem {
  id: string
  folderId?: string
  name: string
  host: string
  user: string
  auth: SshAuth
  port?: number
}

export interface SettingsState {
  theme: ThemeMode
  sshSessionFolders: SshSessionFolder[]
  sshSessions: SshSessionItem[]
  loaded: boolean
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    theme: 'dark',
    sshSessionFolders: [],
    sshSessions: [],
    loaded: false,
  }),
  getters: {
    sessionsByFolder(state): Record<string, SshSessionItem[]> {
      const map: Record<string, SshSessionItem[]> = {}
      for (const s of state.sshSessions) {
        const key = s.folderId || 'root'
        if (!map[key]) map[key] = []
        map[key].push(s)
      }
      return map
    }
  },
  actions: {
    async load() {
      const result = await (window as any).settings.read()
      this.theme = (result?.theme === 'light' ? 'light' : 'dark')
      this.sshSessionFolders = Array.isArray(result?.sshSessionFolders) ? result.sshSessionFolders : []
      this.sshSessions = Array.isArray(result?.sshSessions) ? result.sshSessions : []
      this.loaded = true
      this.applyTheme()
    },
    async save() {
      const payload = JSON.parse(JSON.stringify({
        theme: this.theme,
        sshSessionFolders: this.sshSessionFolders,
        sshSessions: this.sshSessions,
      }))
      const res = await (window as any).settings.write(payload)
      if (!res?.ok) {
        console.error('[Settings] write failed:', res?.error, 'path:', res?.path)
      } else {
        console.log('[Settings] saved to', res.path)
      }
    },
    setTheme(theme: ThemeMode) {
      this.theme = theme
      this.applyTheme()
      this.save()
    },
    applyTheme() {
      const root = document.documentElement
      root.setAttribute('data-theme', this.theme)
    },
    addFolder(name: string, parentId?: string) {
      const folder: SshSessionFolder = { id: generateId('folder'), name, parentId }
      this.sshSessionFolders.push(folder)
      this.save()
      return folder
    },
    renameFolder(id: string, name: string) {
      const f = this.sshSessionFolders.find(x => x.id === id)
      if (f) { f.name = name; this.save() }
    },
    moveFolder(id: string, newParentId?: string) {
      if (id === newParentId) return
      const folder = this.sshSessionFolders.find(x => x.id === id)
      if (!folder) return
      const isDescendant = (candidateId: string | undefined, targetId: string): boolean => {
        if (!candidateId) return false
        if (candidateId === targetId) return true
        const parent = this.sshSessionFolders.find(f => f.id === candidateId)
        return isDescendant(parent?.parentId, targetId)
      }
      if (isDescendant(newParentId, id)) return
      folder.parentId = newParentId
      this.save()
    },
    removeFolder(id: string) {
      const removed = this.sshSessionFolders.find(x => x.id === id)
      const parentId = removed?.parentId
      this.sshSessionFolders = this.sshSessionFolders.filter(x => x.id !== id)
      this.sshSessionFolders = this.sshSessionFolders.map(x => (x.parentId === id ? { ...x, parentId } : x))
      this.sshSessions = this.sshSessions.map(s => (s.folderId === id ? { ...s, folderId: parentId } : s))
      this.save()
    },
    upsertSession(session: Partial<SshSessionItem> & { name: string, host: string, user: string, auth: SshAuth }) {
      if (session.id) {
        const idx = this.sshSessions.findIndex(s => s.id === session.id)
        if (idx >= 0) {
          this.sshSessions[idx] = { ...this.sshSessions[idx], ...session } as SshSessionItem
        }
      } else {
        const s: SshSessionItem = { id: generateId('session'), port: 22, ...session } as SshSessionItem
        this.sshSessions.push(s)
      }
      this.save()
    },
    moveSessionToFolder(sessionId: string, folderId?: string) {
      const s = this.sshSessions.find(x => x.id === sessionId)
      if (!s) return
      s.folderId = folderId
      this.save()
    },
    removeSession(id: string) {
      this.sshSessions = this.sshSessions.filter(s => s.id !== id)
      this.save()
    }
  }
})


