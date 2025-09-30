<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0 fill-height d-flex flex-column">
        <div class="app-header">
          <TabBar 
            :tabs="tabs" 
            :active-tab-id="activeTabId" 
            @switch-tab="handleSwitchTab"
            @close-tab="handleCloseTab"
            @new-tab="handleNewTab"
            @duplicate-tab="handleDuplicateTab"
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
  </v-app>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, onBeforeUnmount, nextTick, onBeforeUpdate, watch } from 'vue';
import TabBar from './components/TabBar.vue';
import TerminalTab from './components/TerminalTab.vue';
import SettingsModal from './components/SettingsModal.vue';
import { useSettingsStore } from './stores/settings';

// --- Font Settings ---
const fontFamily = ref('"MesloLGS NF", monospace');
const fontSize = ref(14);

// --- State Management ---
let tabCounter = 1;
const tabs = ref([
  {
    id: 1, 
    name: 'Tab 1', 
    connected: false, 
    connectionOptions: { host: '', port: 22, username: '' } 
  },
]);
const activeTabId = ref(1);
const terminalTabRefs = ref<any[]>([]);
const settingsOpen = ref(false);
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

// --- Tab Actions ---
function handleNewTab(optionsToClone = {}) {
  tabCounter++;
  const newTab = {
    id: tabCounter,
    name: `Tab ${tabCounter}`,
    connected: false,
    connectionOptions: {
      host: '', 
      port: 22, 
      username: '',
      ...optionsToClone
    },
  };
  tabs.value.push(newTab);
  activeTabId.value = newTab.id;
}

function handleDuplicateTab() {
  const activeTab = getActiveTab();
  if (!activeTab) return;

  tabCounter++;
  const newTab = {
    id: tabCounter,
    name: `Tab ${tabCounter}`,
    connected: activeTab.connected, // Inherit connected state
    connectionOptions: { ...activeTab.connectionOptions },
  };
  tabs.value.push(newTab);
  activeTabId.value = newTab.id;

  if (activeTab.connected) {
    // If the original tab was connected, share its session
    nextTick(() => {
      window.ssh.duplicateSession(activeTab.id, newTab.id);
    });
  }
}

function handleSwitchTab(tabId: number) {
  activeTabId.value = tabId;
}

function handleCloseTab(tabId: number) {
  const index = tabs.value.findIndex(t => t.id === tabId);
  if (index === -1) return;

  // Disconnect before closing
  handleDisconnect(tabId);

  // If closing the active tab, decide which tab to switch to
  if (activeTabId.value === tabId) {
    const newActiveTab = tabs.value[index - 1] || tabs.value[index + 1];
    activeTabId.value = newActiveTab ? newActiveTab.id : 0;
  }

  tabs.value.splice(index, 1);

  // If all tabs are closed, create a new default one
  if (tabs.value.length === 0) {
    nextTick(() => handleNewTab());
  }
}

// --- SSH Actions ---
function getTabById(tabId: number) {
  return tabs.value.find(t => t.id === tabId);
}
function getActiveTab() {
  return getTabById(activeTabId.value);
}

function handleConnect(tabId: number, options: any) {
  const tab = getTabById(tabId);
  if (!tab) return;

  tab.connectionOptions = { host: options.host, username: options.username, ...options };
  window.ssh.connect(tabId, options);
}

function handleDisconnect(tabId: number) {
  const tab = getTabById(tabId);
  if (tab && tab.connected) {
    window.ssh.disconnect(tabId);
  }
}

// --- Global IPC Listeners ---
let statusListener: (() => void) | undefined;
let errorListener: (() => void) | undefined;
let dataListener: (() => void) | undefined;
let increaseFontSizeListener: (() => void) | undefined;
let decreaseFontSizeListener: (() => void) | undefined;

onMounted(() => {
  // load settings on start
  settingsStore.load();
  (window as any).settings.onOpen(() => { settingsOpen.value = true })
  statusListener = window.ssh.on('ssh:status', ({ tabId, status }) => {
    const tab = getTabById(tabId);
    if (!tab) return;

    if (status === 'connected') {
      tab.connected = true;
    } else if (status === 'closed') {
      tab.connected = false;
    }
  });

  errorListener = window.ssh.on('ssh:error', ({ tabId, message }) => {
    const tab = getTabById(tabId);
    if (tab) {
      tab.connected = false;
    }
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    terminalTabRefs.value[tabIndex]?.write(`\r\n\u001b[31m*** SSH ERROR: ${message} ***\u001b[0m\r\n`);
  });

  dataListener = window.ssh.on('ssh:data', ({ tabId, data }) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    terminalTabRefs.value[tabIndex]?.write(data);
  });
});

onBeforeUnmount(() => {
  if (statusListener) statusListener();
  if (errorListener) errorListener();
  if (dataListener) dataListener();
  // Disconnect all tabs when the app closes
  tabs.value.forEach(tab => handleDisconnect(tab.id));
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