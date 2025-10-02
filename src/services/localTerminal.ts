class LocalTerminalService {
  init() {
    // The onData listener is handled in App.vue
  }

  spawn(tabId: number) {
    window.localTerminal.spawn(tabId);
  }

  disconnect(tabId: number) {
    window.localTerminal.disconnect(tabId);
  }

  sendData(tabId: number, data: string) {
    window.localTerminal.sendData(tabId, data);
  }

  resize(tabId: number, size: { rows: number, cols: number }) {
    window.localTerminal.resize(tabId, size);
  }
}

export const localTerminalService = new LocalTerminalService();