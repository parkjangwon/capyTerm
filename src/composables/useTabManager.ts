import { ref, nextTick } from 'vue';

export function useTabManager() {
  const tabs = ref<any[]>([]);
  const activeTabId = ref<number | null>(null);
  let nextTabId = 1;

  const getTabById = (id: number) => {
    return tabs.value.find(t => t.id === id);
  };

  const updateTabNames = () => {
    tabs.value.forEach((tab, index) => {
      tab.name = `Terminal ${index + 1}`;
    });
  };

  const handleNewTab = () => {
    const newId = nextTabId++;
    const newTab = {
      id: newId,
      name: ``, // Will be set by updateTabNames
      type: 'terminal',
      connected: false,
      connectionOptions: {},
    };
    tabs.value.push(newTab);
    updateTabNames();
    activeTabId.value = newTab.id;
  };

  const handleSwitchTab = (id: number) => {
    activeTabId.value = id;
  };

  const switchToNextTab = () => {
    if (tabs.value.length < 2) return;
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
    const nextIndex = (currentIndex + 1) % tabs.value.length;
    activeTabId.value = tabs.value[nextIndex].id;
  };

  const switchToPreviousTab = () => {
    if (tabs.value.length < 2) return;
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
    const previousIndex = (currentIndex - 1 + tabs.value.length) % tabs.value.length;
    activeTabId.value = tabs.value[previousIndex].id;
  };

  const handleCloseTab = (id: number) => {
    const index = tabs.value.findIndex(t => t.id === id);
    if (index === -1) return;

    // Determine the next active tab *before* closing
    if (activeTabId.value === id) {
      const nextActiveTab = tabs.value[index + 1] || tabs.value[index - 1];
      activeTabId.value = nextActiveTab?.id || null;
    }

    // Remove the tab
    tabs.value.splice(index, 1);

    // Update names of remaining tabs
    updateTabNames();

    // If no tabs are left, create a new one
    if (tabs.value.length === 0) {
      nextTick(() => handleNewTab());
    }
  };

  // Initialize with a single tab
  handleNewTab();

  return {
    tabs,
    activeTabId,
    getTabById,
    handleNewTab,
    handleSwitchTab,
    handleCloseTab,
    switchToNextTab,
    switchToPreviousTab,
  };
}