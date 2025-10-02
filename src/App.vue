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
          @connect="(options) => handleConnect(tab.id, options)"
          v-show="tab.id === activeTabId"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onBeforeUpdate } from 'vue';
import { storeToRefs } from 'pinia';
import TabBar from './components/TabBar.vue';
import TerminalTab from './components/TerminalTab.vue';
import { useTabsStore } from './stores/tabs';
import { sshService } from './services/ssh';

const tabsStore = useTabsStore();
const { tabs, activeTabId } = storeToRefs(tabsStore);

const terminalTabRefs = ref<any[]>([]);

onBeforeUpdate(() => {
  terminalTabRefs.value = [];
});

function handleConnect(tabId: number, options: any) {
  const tab = tabsStore.getTabById(tabId);
  if (tab) {
    tab.connectionOptions = options;
    sshService.connect(tabId, options);
  }
}

function onCloseTab(tabId: number) {
  tabsStore.handleCloseTab(tabId);
  sshService.disconnect(tabId);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.metaKey && e.key === 't') {
    e.preventDefault();
    tabsStore.handleNewTab();
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
      tabsStore.switchToPreviousTab();
    } else {
      tabsStore.switchToNextTab();
    }
    return;
  }
}

onMounted(() => {
  sshService.init(tabsStore);
  window.addEventListener('keydown', handleKeyDown);

  window.ssh.onData(({ tabId, data }) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    if (tabIndex !== -1 && terminalTabRefs.value[tabIndex]) {
      terminalTabRefs.value[tabIndex].write(data);
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  tabs.value.forEach(tab => sshService.disconnect(tab.id));
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