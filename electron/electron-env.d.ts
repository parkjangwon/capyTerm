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
    connect: (options: any) => void;
    sendData: (data: string) => void;
    resize: (size: { rows: number, cols: number }) => void;
    disconnect: () => void;
    onData: (func: (data: string) => void) => () => void;
    onConnected: (func: () => void) => () => void;
    onDisconnected: (func: () => void) => () => void;
    onError: (func: (error: string) => void) => () => void;
    removeAllListeners: () => void;
  }
}