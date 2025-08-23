import { app, ipcMain, screen, desktopCapturer, globalShortcut, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
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
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, "screen-saver");
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.whenReady().then(() => {
  createWindow();
  setupScreenshotHandlers();
  setupWindowHandlers();
  setupGlobalShortcuts();
});
function setupScreenshotHandlers() {
  ipcMain.handle("capture-screen", async () => {
    try {
      if (win) {
        win.setContentProtection(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width, height }
      });
      const screenSource = sources.find(
        (source) => source.name === "Entire Screen" || source.name.includes("Screen") || source.name === "Desktop"
      ) || sources[0];
      if (!screenSource) {
        throw new Error("No screen source found");
      }
      const screenshot = screenSource.thumbnail;
      const buffer = screenshot.toPNG();
      if (win) {
        win.setContentProtection(false);
      }
      const screenshotDir = path.join(app.getPath("home"), "Library", "Pictures", "ScreenCap");
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`);
      await writeFile(screenshotPath, buffer);
      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize()
      };
    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("take-screenshot", async () => {
    try {
      if (win) {
        win.setContentProtection(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width, height }
      });
      const screenSource = sources.find(
        (source) => source.name === "Entire Screen" || source.name.includes("Screen") || source.name === "Desktop"
      ) || sources[0];
      if (!screenSource) {
        throw new Error("No screen source found");
      }
      const screenshot = screenSource.thumbnail;
      const buffer = screenshot.toPNG();
      if (win) {
        win.setContentProtection(false);
      }
      const screenshotDir = path.join(app.getPath("home"), "Library", "Pictures", "ScreenCap");
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`);
      await writeFile(screenshotPath, buffer);
      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize()
      };
    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle("get-sources", async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 150, height: 150 }
      });
      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id
      }));
    } catch (error) {
      console.error("Error getting sources:", error);
      return [];
    }
  });
  ipcMain.handle("capture-source", async (_, sourceId) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize
      });
      const source = sources.find((s) => s.id === sourceId);
      if (!source) {
        throw new Error("Source not found");
      }
      const screenshot = source.thumbnail;
      const buffer = screenshot.toPNG();
      const screenshotDir = path.join(app.getPath("home"), "Library", "Pictures", "ScreenCap");
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(screenshotDir, `screenshot-${source.name}-${timestamp}.png`);
      await writeFile(screenshotPath, buffer);
      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize(),
        sourceName: source.name
      };
    } catch (error) {
      console.error("Capture error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}
function setupWindowHandlers() {
  ipcMain.on("quit-app", () => {
    app.quit();
  });
  ipcMain.on("overlay-hidden", () => {
  });
  ipcMain.on("minimize-window", () => {
    if (win) {
      win.minimize();
    }
  });
  ipcMain.on("close-window", () => {
    if (win) {
      win.close();
    }
  });
  ipcMain.on("hide-window", () => {
    if (win) {
      win.hide();
    }
  });
  ipcMain.on("show-window", () => {
    if (win) {
      win.show();
    }
  });
}
function setupGlobalShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (win) {
      win.webContents.send("hide-overlay");
    }
  });
  globalShortcut.register("CommandOrControl+Shift+S", () => {
    if (win) {
      win.show();
      win.focus();
      win.webContents.send("show-overlay");
    }
  });
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (win) {
      win.webContents.send("toggle-recording");
    }
  });
}
app.on("activate", () => {
  if (win) {
    win.show();
    win.webContents.send("show-overlay");
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
