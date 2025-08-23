import { app, BrowserWindow, ipcMain, desktopCapturer, screen, globalShortcut } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// const require = createRequire(import.meta.url)
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
let screenshotInterval: NodeJS.Timeout | null = null
let isRecording = false

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
  })
  
  // Make window excluded from screenshots on macOS
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'screen-saver')

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



app.whenReady().then(() => {
  createWindow()
  setupScreenshotHandlers()
  setupWindowHandlers()
  setupGlobalShortcuts()
})

// Screenshot functionality
function setupScreenshotHandlers() {
  // Handler for capturing the entire screen
  ipcMain.handle('capture-screen', async () => {
    try {
      // Temporarily set window to not capture
      if (win) {
        win.setContentProtection(true)
      }
      
      // Small delay to ensure the protection is applied
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workAreaSize

      // Get all available sources (screens)
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })

      // Find the main screen source (not the overlay window)
      const screenSource = sources.find(source => 
        source.name === 'Entire Screen' || 
        source.name.includes('Screen') ||
        source.name === 'Desktop'
      ) || sources[0]
      
      if (!screenSource) {
        throw new Error('No screen source found')
      }

      // Get the thumbnail as a NativeImage
      const screenshot = screenSource.thumbnail

      // Convert to buffer
      const buffer = screenshot.toPNG()
      
      // Re-enable capture after screenshot
      if (win) {
        win.setContentProtection(false)
      }

      // Create directory if it doesn't exist
      const screenshotDir = path.join(app.getPath('home'), 'Library', 'Pictures', 'ScreenCap')
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true })
      }

      // Save to file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
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
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Handler for taking a screenshot (alias for capture-screen)
  ipcMain.handle('take-screenshot', async () => {
    try {
      // Temporarily set window to not capture
      if (win) {
        win.setContentProtection(true)
      }
      
      // Small delay to ensure the protection is applied
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workAreaSize

      // Get all available sources (screens)
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })

      // Find the main screen source (not the overlay window)
      const screenSource = sources.find(source => 
        source.name === 'Entire Screen' || 
        source.name.includes('Screen') ||
        source.name === 'Desktop'
      ) || sources[0]
      
      if (!screenSource) {
        throw new Error('No screen source found')
      }

      // Get the thumbnail as a NativeImage
      const screenshot = screenSource.thumbnail

      // Convert to buffer
      const buffer = screenshot.toPNG()
      
      // Re-enable capture after screenshot
      if (win) {
        win.setContentProtection(false)
      }

      // Create directory if it doesn't exist
      const screenshotDir = path.join(app.getPath('home'), 'Library', 'Pictures', 'ScreenCap')
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true })
      }

      // Save to file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
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
        error: error instanceof Error ? error.message : String(error)
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

      // Create directory if it doesn't exist
      const screenshotDir = path.join(app.getPath('home'), 'Library', 'Pictures', 'ScreenCap')
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true })
      }

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(screenshotDir, `screenshot-${source.name}-${timestamp}.png`)
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
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}

// Window control handlers
function setupWindowHandlers() {
  // Handle quit app
  ipcMain.on('quit-app', () => {
    app.quit()
  })

  // Handle overlay visibility
  ipcMain.on('overlay-hidden', () => {
    // Overlay is hidden, but window stays open
  })

  // Handle request for current recording state
  ipcMain.handle('get-recording-state', () => {
    return isRecording
  })

  ipcMain.on('minimize-window', () => {
    if (win) {
      win.minimize()
    }
  })

  ipcMain.on('close-window', () => {
    if (win) {
      win.close()
    }
  })

  ipcMain.on('hide-window', () => {
    if (win) {
      win.hide()
    }
  })

  ipcMain.on('show-window', () => {
    if (win) {
      win.show()
    }
  })
}

// Global keyboard shortcuts
function setupGlobalShortcuts() {
  // Register global shortcut for show/hide
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (win) {
      win.webContents.send('hide-overlay')
    }
  })

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (win) {
      win.show()
      win.focus()
      win.webContents.send('show-overlay')
      // Send current recording state when showing
      win.webContents.send('recording-state-changed', isRecording)
    }
  })

  // Toggle recording
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (isRecording) {
      // Stop recording
      isRecording = false
      if (screenshotInterval) {
        clearInterval(screenshotInterval)
        screenshotInterval = null
      }
      console.log('Recording stopped via shortcut')
    } else {
      // Start recording
      isRecording = true
      if (screenshotInterval) {
        clearInterval(screenshotInterval)
      }
      captureScreenshot()
      screenshotInterval = setInterval(() => {
        captureScreenshot()
      }, 5000)
      console.log('Recording started via shortcut')
    }
    
    // Notify renderer of state change
    if (win) {
      win.webContents.send('recording-state-changed', isRecording)
    }
  })
}

// Handle app activation (dock icon click on macOS)
app.on('activate', () => {
  if (win) {
    win.show()
    win.webContents.send('show-overlay')
    // Send current recording state when showing via dock
    win.webContents.send('recording-state-changed', isRecording)
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Unregister shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  // Stop recording if active
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
  }
})

// Screenshot capture function
async function captureScreenshot() {
  try {
    // Temporarily set window to not capture
    if (win) {
      win.setContentProtection(true)
    }
    
    // Small delay to ensure the protection is applied
    await new Promise(resolve => setTimeout(resolve, 50))

    // Get the primary display
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // Get all available sources (screens)
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    // Find the main screen source
    const screenSource = sources.find(source => 
      source.name === 'Entire Screen' || 
      source.name.includes('Screen') ||
      source.name === 'Desktop'
    ) || sources[0]
    
    if (!screenSource) {
      throw new Error('No screen source found')
    }

    // Get the thumbnail as a NativeImage
    const screenshot = screenSource.thumbnail

    // Convert to buffer
    const buffer = screenshot.toPNG()
    
    // Re-enable capture after screenshot
    if (win) {
      win.setContentProtection(false)
    }

    // Create directory if it doesn't exist
    const screenshotDir = path.join(app.getPath('home'), 'Library', 'Pictures', 'ScreenCap')
    if (!existsSync(screenshotDir)) {
      await mkdir(screenshotDir, { recursive: true })
    }

    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
    await writeFile(screenshotPath, buffer)

    console.log('Screenshot saved:', screenshotPath)
    return { success: true, path: screenshotPath }
  } catch (error) {
    console.error('Screenshot error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Handle recording state
ipcMain.on('recording-started', () => {
  console.log('Recording started')
  isRecording = true
  
  // Clear any existing interval
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
  }
  
  // Take immediate screenshot
  captureScreenshot()
  
  // Start taking screenshots every 5 seconds
  screenshotInterval = setInterval(() => {
    captureScreenshot()
  }, 5000)
  
  // Notify renderer of state change
  if (win) {
    win.webContents.send('recording-state-changed', true)
  }
})

ipcMain.on('recording-stopped', () => {
  console.log('Recording stopped')
  isRecording = false
  
  // Clear the interval
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
    screenshotInterval = null
  }
  
  // Notify renderer of state change
  if (win) {
    win.webContents.send('recording-state-changed', false)
  }
})
