import { defineStore } from 'pinia';
import { ref } from 'vue';

export type TabType = 'ssh' | 'local';

export interface Tab {
  id: number;
  name: string;
  type: TabType;
  connected: boolean;
  connectionOptions?: any;
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<number | null>(null);
  let nextTabId = 1;

  function getTabById(id: number) {
    return tabs.value.find(t => t.id === id);
  }

  function updateTabNames() {
    tabs.value.forEach((tab, index) => {
      tab.name = tab.type === 'local' ? `Local Shell ${index + 1}` : `Terminal ${index + 1}`;
    });
  }

  function handleNewTab(type: TabType = 'ssh') {
    const newId = nextTabId++;
    const newTab: Tab = {
      id: newId,
      name: ``, // Will be set by updateTabNames
      type,
      connected: type === 'local', // Local tabs are connected by default
    };
    if (type === 'ssh') {
      newTab.connectionOptions = {};
    }
    tabs.value.push(newTab);
    updateTabNames();
    activeTabId.value = newTab.id;
    return newId;
  }

  function handleNewSshTab() {
    return handleNewTab('ssh');
  }

  function handleNewLocalTab() {
    return handleNewTab('local');
  }

  function handleSwitchTab(id: number) {
    activeTabId.value = id;
  }

  function switchToNextTab() {
    if (tabs.value.length < 2) return;
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
    const nextIndex = (currentIndex + 1) % tabs.value.length;
    activeTabId.value = tabs.value[nextIndex].id;
  }

  function switchToPreviousTab() {
    if (tabs.value.length < 2) return;
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
    const previousIndex = (currentIndex - 1 + tabs.value.length) % tabs.value.length;
    activeTabId.value = tabs.value[previousIndex].id;
  }

  function handleCloseTab(id: number) {
    const index = tabs.value.findIndex(t => t.id === id);
    if (index === -1) return;

    if (activeTabId.value === id) {
      const nextActiveTab = tabs.value[index + 1] || tabs.value[index - 1];
      activeTabId.value = nextActiveTab?.id || null;
    }

    tabs.value.splice(index, 1);
    updateTabNames();
  }

  // Initialize with a single ssh tab
  handleNewSshTab();

  return {
    tabs,
    activeTabId,
    getTabById,
    handleNewSshTab,
    handleNewLocalTab,
    handleSwitchTab,
    handleCloseTab,
    switchToNextTab,
    switchToPreviousTab,
  };
});