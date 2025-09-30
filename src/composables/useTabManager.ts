import { ref, nextTick } from 'vue'

export interface Tab {
  id: number
  name: string
  connected: boolean
  connectionOptions: {
    host: string
    port: number
    username: string
    [key: string]: any
  }
}

export function useTabManager() {
  let tabCounter = 1
  const tabs = ref<Tab[]>([
    {
      id: 1,
      name: 'Tab 1',
      connected: false,
      connectionOptions: { host: '', port: 22, username: '' }
    }
  ])
  const activeTabId = ref(1)

  function getTabById(tabId: number) {
    return tabs.value.find(t => t.id === tabId)
  }

  function getActiveTab() {
    return getTabById(activeTabId.value)
  }

  function handleNewTab(optionsToClone: any = {}) {
    tabCounter++
    const newTab: Tab = {
      id: tabCounter,
      name: `Tab ${tabCounter}`,
      connected: false,
      connectionOptions: {
        host: '',
        port: 22,
        username: '',
        ...optionsToClone
      }
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
    return newTab
  }

  function handleDuplicateTab(onDuplicate?: (originalId: number, newId: number) => void) {
    const activeTab = getActiveTab()
    if (!activeTab) return

    tabCounter++
    const newTab: Tab = {
      id: tabCounter,
      name: `Tab ${tabCounter}`,
      connected: activeTab.connected,
      connectionOptions: { ...activeTab.connectionOptions }
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id

    if (activeTab.connected && onDuplicate) {
      nextTick(() => {
        onDuplicate(activeTab.id, newTab.id)
      })
    }
  }

  function handleSwitchTab(tabId: number) {
    activeTabId.value = tabId
  }

  function handleCloseTab(tabId: number, onDisconnect?: (tabId: number) => void) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return

    // Disconnect before closing
    if (onDisconnect) {
      onDisconnect(tabId)
    }

    // If closing the active tab, decide which tab to switch to
    if (activeTabId.value === tabId) {
      const newActiveTab = tabs.value[index - 1] || tabs.value[index + 1]
      activeTabId.value = newActiveTab ? newActiveTab.id : 0
    }

    tabs.value.splice(index, 1)

    // If all tabs are closed, create a new default one
    if (tabs.value.length === 0) {
      nextTick(() => handleNewTab())
    }
  }

  return {
    tabs,
    activeTabId,
    getTabById,
    getActiveTab,
    handleNewTab,
    handleDuplicateTab,
    handleSwitchTab,
    handleCloseTab
  }
}
