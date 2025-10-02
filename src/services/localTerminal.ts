import { useTabsStore } from '../stores/tabs';

class LocalTerminalService {
  private store: ReturnType<typeof useTabsStore> | null = null;

  init(store: ReturnType<typeof useTabsStore>) {
    this.store = store;

    window.localTerminal.onData(({ tabId, data }) => {
      // This needs to be handled in the component to write to the terminal.
      // We can use an event bus or a more sophisticated solution later.
    });
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
