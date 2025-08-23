import { app, BrowserWindow, ipcMain, desktopCapturer, screen, nativeImage } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  setupScreenshotHandlers()
})

// Screenshot functionality
function setupScreenshotHandlers() {
  // Handler for taking screenshots
  ipcMain.handle('take-screenshot', async () => {
    try {
      // Get all available sources (screens and windows)
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize
      })

      // Find the main screen source
      const screenSource = sources.find(source => source.name === 'Entire Screen' || source.name.includes('Screen'))
      
      if (!screenSource) {
        throw new Error('No screen source found')
      }

      // Get the thumbnail as a NativeImage
      const screenshot = screenSource.thumbnail

      // Convert to buffer
      const buffer = screenshot.toPNG()

      // Optional: Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(app.getPath('pictures'), `screenshot-${timestamp}.png`)
      await writeFile(screenshotPath, buffer)

      // Return the screenshot data
      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize()
      }
    } catch (error) {
      console.error('Screenshot error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Handler for getting all available sources
  ipcMain.handle('get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 }
      })

      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id
      }))
    } catch (error) {
      console.error('Error getting sources:', error)
      return []
    }
  })

  // Handler for capturing a specific source
  ipcMain.handle('capture-source', async (_, sourceId) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize
      })

      const source = sources.find(s => s.id === sourceId)
      
      if (!source) {
        throw new Error('Source not found')
      }

      const screenshot = source.thumbnail
      const buffer = screenshot.toPNG()

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(app.getPath('pictures'), `screenshot-${source.name}-${timestamp}.png`)
      await writeFile(screenshotPath, buffer)

      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize(),
        sourceName: source.name
      }
    } catch (error) {
      console.error('Capture error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })
}
