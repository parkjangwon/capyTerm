import { useTabsStore } from '../stores/tabs';

class SshService {
  private store: ReturnType<typeof useTabsStore> | null = null;

  init(store: ReturnType<typeof useTabsStore>) {
    this.store = store;

    window.ssh.onConnected(({ tabId }) => {
      const tab = this.store?.getTabById(tabId);
      if (tab) {
        tab.connected = true;
      }
    });

    window.ssh.onDisconnected(({ tabId }) => {
      const tab = this.store?.getTabById(tabId);
      if (tab) {
        tab.connected = false;
      }
    });

    window.ssh.onError(({ tabId, error }) => {
      alert(`Connection Failed for tab ${tabId}: ${error}`);
      const tab = this.store?.getTabById(tabId);
      if (tab) {
        tab.connected = false;
      }
    });

    // Data handling is done in App.vue because it needs access to the component refs
  }

  connect(tabId: number, options: any) {
    window.ssh.connect(tabId, options);
  }

  disconnect(tabId: number) {
    window.ssh.disconnect(tabId);
  }

  sendData(tabId: number, data: string) {
    window.ssh.sendData(tabId, data);
  }

  resize(tabId: number, size: { rows: number, cols: number }) {
    window.ssh.resize(tabId, size);
  }
}

export const sshService = new SshService();