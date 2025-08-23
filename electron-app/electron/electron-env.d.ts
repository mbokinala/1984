/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  electronAPI: {
    takeScreenshot: () => Promise<{
      success: boolean
      dataURL?: string
      path?: string
      size?: { width: number; height: number }
      error?: string
    }>
    getSources: () => Promise<Array<{
      id: string
      name: string
      thumbnail: string
      display_id: string
    }>>
    captureSource: (sourceId: string) => Promise<{
      success: boolean
      dataURL?: string
      path?: string
      size?: { width: number; height: number }
      sourceName?: string
      error?: string
    }>
  }
}
