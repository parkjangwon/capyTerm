/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  ssh: {
    connect: (tabId: number, options: any) => void;
    disconnect: (tabId: number) => void;
    sendData: (tabId: number, data: string) => void;
    resize: (tabId: number, size: { rows: number, cols: number }) => void;
    onConnected: (callback: (args: { tabId: number }) => void) => void;
    onDisconnected: (callback: (args: { tabId: number }) => void) => void;
    onData: (callback: (args: { tabId: number, data: string }) => void) => void;
    onError: (callback: (args: { tabId: number, error: string }) => void) => void;
    removeAllListeners: () => void;
  }
  localTerminal: {
    spawn: (tabId: number) => void;
    sendData: (tabId: number, data: string) => void;
    resize: (tabId: number, size: { rows: number, cols: number }) => void;
    disconnect: (tabId: number) => void;
    onData: (callback: (args: { tabId: number, data: string }) => void) => void;
  }
}