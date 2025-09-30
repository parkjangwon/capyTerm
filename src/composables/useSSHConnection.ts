import { onMounted, onBeforeUnmount } from 'vue'
import type { Tab } from './useTabManager'

export function useSSHConnection(
  getTabById: (tabId: number) => Tab | undefined,
  terminalTabRefs: any
) {
  let statusListener: (() => void) | undefined
  let errorListener: (() => void) | undefined
  let dataListener: (() => void) | undefined

  function handleConnect(tabId: number, options: any) {
    const tab = getTabById(tabId)
    if (!tab) return

    tab.connectionOptions = { 
      host: options.host, 
      username: options.username, 
      ...options 
    }
    window.ssh.connect(tabId, options)
  }

  function handleDisconnect(tabId: number) {
    const tab = getTabById(tabId)
    if (tab && tab.connected) {
      window.ssh.disconnect(tabId)
    }
  }

  function setupListeners(tabs: any) {
    statusListener = window.ssh.on('ssh:status', ({ tabId, status }: any) => {
      const tab = getTabById(tabId)
      if (!tab) return

      if (status === 'connected') {
        tab.connected = true
      } else if (status === 'closed') {
        tab.connected = false
      }
    })

    errorListener = window.ssh.on('ssh:error', ({ tabId, message }: any) => {
      const tab = getTabById(tabId)
      if (tab) {
        tab.connected = false
      }
      const tabIndex = tabs.value.findIndex((t: Tab) => t.id === tabId)
      terminalTabRefs.value[tabIndex]?.write(`\r\n\u001b[31m*** SSH ERROR: ${message} ***\u001b[0m\r\n`)
    })

    dataListener = window.ssh.on('ssh:data', ({ tabId, data }: any) => {
      const tabIndex = tabs.value.findIndex((t: Tab) => t.id === tabId)
      terminalTabRefs.value[tabIndex]?.write(data)
    })
  }

  function cleanupListeners(tabs: any) {
    if (statusListener) statusListener()
    if (errorListener) errorListener()
    if (dataListener) dataListener()
    
    // Disconnect all tabs when cleaning up
    tabs.value.forEach((tab: Tab) => handleDisconnect(tab.id))
  }

  return {
    handleConnect,
    handleDisconnect,
    setupListeners,
    cleanupListeners
  }
}
