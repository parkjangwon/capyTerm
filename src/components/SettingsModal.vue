<template>
  <div v-if="open" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <header class="modal-header">
        <nav class="tabs">
          <button :class="{active: activeTab==='ui'}" @click="activeTab='ui'">
            <span class="tab-label">{{ $t('settings.tab.ui') }}</span>
          </button>
          <button :class="{active: activeTab==='session'}" @click="activeTab='session'">
            <span class="tab-label">{{ $t('settings.tab.session') }}</span>
          </button>
        </nav>
      </header>
      <section class="modal-body">
        <UISettings v-if="activeTab==='ui'" ref="uiSettingsRef" />
        <SessionManager v-else />
      </section>
      <footer class="modal-footer">
        <button @click="applyAndClose">{{ $t('app.confirm') }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '../stores/settings'
import UISettings from './settings/UISettings.vue'
import SessionManager from './settings/SessionManager.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits(['close'])

const settings = useSettingsStore()
const activeTab = ref<'ui' | 'session'>('ui')
const uiSettingsRef = ref<InstanceType<typeof UISettings> | null>(null)

watch(() => props.open, async (val: boolean) => {
  if (val && !settings.loaded) {
    await settings.load()
  }
  // Sync UI settings when modal opens
  if (uiSettingsRef.value) {
    uiSettingsRef.value.themeLocal = settings.theme
    uiSettingsRef.value.languageLocal = settings.language
  }
})

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    // Check if there are any child modals open (they have higher z-index)
    const childModals = document.querySelectorAll('.modal-backdrop')
    // If there's more than one modal backdrop, a child modal is open
    if (childModals.length <= 1) {
      close()
    }
    // Otherwise, let the child modal handle the ESC key
  }
}

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
.modal-header {
  padding: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--bg);
}
.modal-footer { 
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: none;
  text-align: right;
  background: var(--bg);
}
.modal-body { 
  padding: 24px;
  min-height: 400px;
}

/* Material Design Tabs */
.tabs {
  display: flex;
  gap: 0;
  padding: 0 24px;
}

.tabs button {
  position: relative;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 16px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.6);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.tabs button:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.04);
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.87);
}

.tabs button.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
}

.tabs button.active:hover {
  background: rgba(25, 118, 210, 0.04);
}

.tab-label {
  display: inline-block;
}
.close-btn { background: transparent; border: none; color: var(--fg); font-size: 18px; cursor: pointer; }
.section { margin-bottom: 20px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.add-row input { width: 180px; }
.list { list-style: none; padding: 0; margin: 8px 0 0 0; display: flex; flex-direction: column; gap: 6px; }
.list-item { display: flex; gap: 8px; align-items: center; padding: 6px 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; }
.list-item .grow { flex: 1; }
input, select { background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
button:not(.tabs button) { 
  background: var(--btn-bg); 
  color: var(--btn-fg); 
  border: 1px solid var(--border); 
  border-radius: 4px; 
  padding: 6px 10px; 
  cursor: pointer; 
}

.modal-footer button {
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.modal-footer button:hover {
  background: #1565c0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.modal-footer button:active {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
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


