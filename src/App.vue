<template>
  <div id="app-container">
    <div class="app-header">
      <TabBar 
        :tabs="tabs" 
        :active-tab-id="activeTabId" 
        @switch-tab="handleSwitchTab"
        @close-tab="onCloseTab"
      />
    </div>
    <div class="tab-content-area">
      <template v-for="(tab, index) in tabs" :key="tab.id">
        <TerminalTab 
          :ref="(el) => { if (el) terminalTabRefs[index] = el }"
          :tab-id="tab.id"
          :connected="tab.connected"
          @connect="(options) => handleConnect(tab.id, options)"
          v-show="tab.id === activeTabId"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onBeforeUpdate } from 'vue';
import TabBar from './components/TabBar.vue';
import TerminalTab from './components/TerminalTab.vue';
import { useTabManager } from './composables/useTabManager';

const { tabs, activeTabId, getTabById, handleNewTab, handleSwitchTab, handleCloseTab, switchToNextTab, switchToPreviousTab } = useTabManager();

const terminalTabRefs = ref<any[]>([]);

onBeforeUpdate(() => {
  terminalTabRefs.value = [];
});

function handleConnect(tabId: number, options: any) {
  const tab = getTabById(tabId);
  if (tab) {
    tab.connectionOptions = options;
    window.ssh.connect(tabId, options);
  }
}

function onCloseTab(tabId: number) {
  handleCloseTab(tabId);
  window.ssh.disconnect(tabId);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.metaKey && e.key === 't') {
    e.preventDefault();
    handleNewTab();
    return;
  }
  if (e.metaKey && e.key === 'w') {
    e.preventDefault();
    if (activeTabId.value) {
      onCloseTab(activeTabId.value);
    }
    return;
  }
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      switchToPreviousTab();
    } else {
      switchToNextTab();
    }
    return;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);

  window.ssh.onConnected(({ tabId }) => {
    const tab = getTabById(tabId);
    if (tab) {
      tab.connected = true;
    }
  });

  window.ssh.onDisconnected(({ tabId }) => {
    const tab = getTabById(tabId);
    if (tab) {
      tab.connected = false;
    }
  });

  window.ssh.onError(({ tabId, error }) => {
    alert(`Connection Failed for tab ${tabId}: ${error}`);
    const tab = getTabById(tabId);
    if (tab) {
      tab.connected = false;
    }
  });

  window.ssh.onData(({ tabId, data }) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    if (tabIndex !== -1 && terminalTabRefs.value[tabIndex]) {
      terminalTabRefs.value[tabIndex].write(data);
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  tabs.value.forEach(tab => window.ssh.disconnect(tab.id));
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