<template>
  <div id="app-container">
    <div class="app-header">
      <TabBar 
        :tabs="tabs"
        :active-tab-id="activeTabId"
        @switch-tab="tabsStore.handleSwitchTab"
        @close-tab="onCloseTab"
      />
    </div>
    <div class="tab-content-area">
      <template v-for="(tab, index) in tabs" :key="tab.id">
        <TerminalTab 
          :ref="(el) => { if (el) terminalTabRefs[index] = el }"
          :tab-id="tab.id"
          :connected="tab.connected"
          :type="tab.type"
          @connect="(options) => handleConnect(tab.id, options)"
          @spawn="() => handleSpawn(tab.id)"
          v-show="tab.id === activeTabId"
        />
      </template>
    </div>
    <Screensaver :active="isScreensaverActive" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onBeforeUpdate } from 'vue';
import { storeToRefs } from 'pinia';
import TabBar from './components/TabBar.vue';
import TerminalTab from './components/TerminalTab.vue';
import Screensaver from './components/Screensaver.vue';
import { useTabsStore } from './stores/tabs';
import { sshService } from './services/ssh';
import { localTerminalService } from './services/localTerminal';

const tabsStore = useTabsStore();
const { tabs, activeTabId } = storeToRefs(tabsStore);

const terminalTabRefs = ref<any[]>([]);
const isScreensaverActive = ref(false);
let inactivityTimer: number;

onBeforeUpdate(() => {
  terminalTabRefs.value = [];
});

function handleConnect(tabId: number, options: any) {
  resetInactivityTimer();
  const tab = tabsStore.getTabById(tabId);
  if (tab) {
    tab.connectionOptions = options;
    sshService.connect(tabId, options);
  }
}

function handleSpawn(tabId: number) {
  resetInactivityTimer();
  localTerminalService.spawn(tabId);
}

function onCloseTab(tabId: number) {
  resetInactivityTimer();
  const tab = tabsStore.getTabById(tabId);
  if (!tab) return;

  if (tab.type === 'ssh') {
    sshService.disconnect(tabId);
  } else {
    localTerminalService.disconnect(tabId);
  }
  tabsStore.handleCloseTab(tabId);
}

function closeActiveTabOrWindow() {
  if (tabs.value.length > 1) {
    if (activeTabId.value) {
      onCloseTab(activeTabId.value);
    }
  } else {
    window.app.close();
  }
}

function handleUserActivity() {
  if (isScreensaverActive.value) {
    isScreensaverActive.value = false;
  }
  resetInactivityTimer();
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = window.setTimeout(() => {
    isScreensaverActive.value = true;
  }, 600000); // 10 minutes
}

function handleKeyDown(e: KeyboardEvent) {
  handleUserActivity();
  const isModifierKey = e.metaKey || e.ctrlKey;

  if (isModifierKey && e.key === 't') {
    e.preventDefault();
    tabsStore.handleNewSshTab();
    return;
  }
  if (isModifierKey && e.key === 'h') {
    // Disable local shell on Windows
    if (navigator.userAgent.indexOf('Win') === -1) {
      e.preventDefault();
      tabsStore.handleNewLocalTab();
    }
    return;
  }
  if (isModifierKey && e.key === 'w') {
    e.preventDefault();
    closeActiveTabOrWindow();
    return;
  }
  if (isModifierKey && e.key === '[') {
    e.preventDefault();
    tabsStore.switchToPreviousTab();
    return;
  }
  if (isModifierKey && e.key === ']') {
    e.preventDefault();
    tabsStore.switchToNextTab();
    return;
  }
}

onMounted(() => {
  sshService.init(tabsStore);
  localTerminalService.init();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousemove', handleUserActivity);
  resetInactivityTimer();

  window.app.onCloseActiveTabOrWindow(closeActiveTabOrWindow);

  window.ssh.onData(({ tabId, data }) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    if (tabIndex !== -1 && terminalTabRefs.value[tabIndex]) {
      terminalTabRefs.value[tabIndex].write(data);
    }
  });

  window.localTerminal.onData(({ tabId, data }) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    if (tabIndex !== -1 && terminalTabRefs.value[tabIndex]) {
      terminalTabRefs.value[tabIndex].write(data);
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('mousemove', handleUserActivity);
  clearTimeout(inactivityTimer);
  tabs.value.forEach(tab => {
    if (tab.type === 'ssh') {
      sshService.disconnect(tab.id);
    } else {
      localTerminalService.disconnect(tab.id);
    }
  });
});

</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
  background-color: #1e1e1e;
  color: #d4d4d4;
}

#app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  flex-shrink: 0;
}

.tab-content-area {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}
</style>