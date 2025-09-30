<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0 fill-height d-flex flex-column">
        <div class="app-header">
          <TabBar 
            :tabs="tabs" 
            :active-tab-id="activeTabId" 
            @switch-tab="handleSwitchTab"
            @close-tab="onCloseTab"
            @new-tab="handleNewTab"
            @duplicate-tab="onDuplicateTab"
            @open-settings="settingsOpen = true"
          />
        </div>
        <div class="tab-content-area">
          <TerminalTab 
            v-for="(tab, index) in tabs" 
            :key="tab.id"
            :ref="(el) => { if (el) terminalTabRefs[index] = el }"
            :tab-id="tab.id"
            :connected="tab.connected"
            :connection-options="tab.connectionOptions"
            @connect="(options) => handleConnect(tab.id, options)"
            @disconnect="() => handleDisconnect(tab.id)"
            v-show="tab.id === activeTabId"
          />
        </div>
      </v-container>
    </v-main>
    <SettingsModal :open="settingsOpen" @close="settingsOpen = false" />
    <SessionPickerModal 
      :open="sessionPickerOpen" 
      @close="sessionPickerOpen = false"
      @select-session="handleSessionSelect"
    />
  </v-app>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, onBeforeUnmount, onBeforeUpdate, watch, nextTick } from 'vue';
import TabBar from './components/TabBar.vue';
import TerminalTab from './components/TerminalTab.vue';
import SettingsModal from './components/SettingsModal.vue';
import SessionPickerModal from './components/SessionPickerModal.vue';
import { useSettingsStore } from './stores/settings';
import { useTabManager } from './composables/useTabManager';
import { useSSHConnection } from './composables/useSSHConnection';

// --- Font Settings ---
const fontFamily = ref('"MesloLGS NF", monospace');
const fontSize = ref(14);

// --- Tab Management ---
const {
  tabs,
  activeTabId,
  getTabById,
  handleNewTab,
  handleDuplicateTab,
  handleSwitchTab,
  handleCloseTab
} = useTabManager();

// --- Terminal Refs ---
const terminalTabRefs = ref<any[]>([]);
const settingsOpen = ref(false);
const sessionPickerOpen = ref(false);
const settingsStore = useSettingsStore();

// Ensure refs are updated correctly before each render
onBeforeUpdate(() => {
  terminalTabRefs.value = [];
});

// Watch for font changes and update the active terminal
watch([fontFamily, fontSize], ([newFamily, newSize]) => {
  const activeTabIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
  if (activeTabIndex !== -1 && terminalTabRefs.value[activeTabIndex]) {
    terminalTabRefs.value[activeTabIndex].updateFont(newFamily, newSize);
  }
});

// --- SSH Connection Management ---
const {
  handleConnect,
  handleDisconnect,
  setupListeners,
  cleanupListeners
} = useSSHConnection(getTabById, terminalTabRefs);

// Wrap handlers for tab operations
function onCloseTab(tabId: number) {
  handleCloseTab(tabId, handleDisconnect);
}

function onDuplicateTab() {
  handleDuplicateTab((originalId: number, newId: number) => {
    window.ssh.duplicateSession(originalId, newId);
  });
}

// --- Session Picker ---
async function handleSessionSelect(session: any) {
  // Create new tab with session info
  const newTab = handleNewTab();
  
  if (!newTab) {
    console.error('Failed to create new tab');
    return;
  }
  
  const connectionOptions = {
    host: session.host,
    port: session.port || 22,
    username: session.user,
    ...(session.auth.method === 'password' 
      ? { password: session.auth.password }
      : { privateKeyPath: session.auth.privateKeyPath, passphrase: session.auth.passphrase }
    )
  };
  
  // Wait for the tab to be fully rendered, then connect
  await nextTick();
  handleConnect(newTab.id, connectionOptions);
}

// --- Keyboard Shortcuts ---
function handleKeyDown(e: KeyboardEvent) {
  // Command + B (Mac) or Ctrl + B (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault();
    sessionPickerOpen.value = true;
  }
}

// --- Lifecycle ---
onMounted(() => {
  // load settings on start
  settingsStore.load();
  (window as any).settings.onOpen(() => { settingsOpen.value = true });
  
  // Setup SSH listeners
  setupListeners(tabs);
  
  // Setup keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  cleanupListeners(tabs);
  window.removeEventListener('keydown', handleKeyDown);
});

</script>

<style>
@import url('https://cdn.jsdelivr.net/npm/@fontsource/meslo-lgs-nf@5.0.19/index.min.css');

html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: var(--v-theme-background);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0; /* Prevent header from shrinking */
}

.tab-content-area {
  flex-grow: 1;
  position: relative;
  overflow: hidden; /* Prevent content from overflowing */
}

</style>