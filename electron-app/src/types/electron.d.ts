export interface IElectronAPI {
  takeScreenshot: () => Promise<{
    success: boolean;
    dataURL?: string;
    path?: string;
    size?: { width: number; height: number };
    error?: string;
  }>;
  getSources: () => Promise<Array<{
    id: string;
    name: string;
    thumbnail: string;
    display_id: string;
  }>>;
  captureSource: (sourceId: string) => Promise<{
    success: boolean;
    dataURL?: string;
    path?: string;
    size?: { width: number; height: number };
    sourceName?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    ipcRenderer: {
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      off: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export {};
