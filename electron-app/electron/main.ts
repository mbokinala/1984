import axios from "axios";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from "electron";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let screenshotInterval: NodeJS.Timeout | null = null;
let screenshotCounter = 0;
let nthFrameCallback:
  | ((frame: { path: string; timestamp: string }) => void)
  | null = null;
let isRecording = false;
let isAuthenticated = true; // TEMPORARY: Bypassing auth for testing
let authUser: any = null;
let authCheckInterval: NodeJS.Timeout | null = null;
const WEB_APP_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://your-web-app.com";

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
      webSecurity: true,
    },
  });

  // Make window excluded from screenshots on macOS
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, "screen-saver");

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.whenReady().then(async () => {
  createWindow();
  setupAuthHandlers();
  await checkAuthStatus();
  setupScreenshotHandlers();
  setupWindowHandlers();
  setupGlobalShortcuts();

  // Register callback for every 20th frame
  setNthFrameCallback((frame) => {
    // Function triggered after every 20th frame is captured
    // TODO: Add processing logic here
    console.log("20th frame captured");

    const cwd = path.join(
      app.getPath("home"),
      "Library",
      "Pictures",
      "ScreenCap"
    );

    // Use the timestamp in the output filename
    const outputFilename = `output-${frame.timestamp}.mp4`;
    execSync(`./make_movie.sh 1 ${outputFilename}`, {
      cwd,
    });

    const uploadEndpoint = `https://combative-schnauzer-947.convex.site/uploadRecording`;

    // Read the output mp4 file and send it in the body
    const outputPath = path.join(cwd, outputFilename);
    const fileBuffer = readFileSync(outputPath);
    fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
      },
      body: fileBuffer,
    }).then(() => {
      console.log("Uploaded recording");
    });

    // delete all png files in the cwd
    execSync(`rm ${cwd}/*.png`, {
      cwd,
    });

    execSync(`rm ${cwd}/*.mp4`, {
      cwd,
    });
  }, 60);
});

// Authentication handlers
function setupAuthHandlers() {
  // Handle authentication request
  ipcMain.handle("request-auth", async () => {
    try {
      const sessionPath = path.join(app.getPath("userData"), "session.json");
      
      // Always generate a new ID for new auth attempts
      // This allows signing in with different accounts
      const electronAppId = `electron_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;
      
      console.log("Generated new electron app ID for auth:", electronAppId);

      // Save the electron app ID
      try {
        await writeFile(sessionPath, JSON.stringify({ electronAppId }));
      } catch (error) {
        console.error("Error saving electron app ID:", error);
      }

      // Open browser with authentication URL
      const authUrl = `${WEB_APP_URL}/sign-in?electronApp=true&appId=${electronAppId}`;
      console.log("Opening auth URL:", authUrl);
      await shell.openExternal(authUrl);

      // Start checking for authentication
      startAuthCheck(electronAppId);

      return { success: true, electronAppId };
    } catch (error) {
      console.error("Auth request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Handle auth status check
  ipcMain.handle("check-auth-status", async () => {
    console.log("Check auth status called, returning:", {
      isAuthenticated,
      user: authUser,
    });
    return { isAuthenticated, user: authUser };
  });

  // Handle logout
  ipcMain.handle("logout", async () => {
    console.log("Logout requested");

    // Get the electron app ID to clear it in Convex
    const sessionPath = path.join(app.getPath("userData"), "session.json");
    let electronAppId: string | null = null;

    try {
      if (existsSync(sessionPath)) {
        const sessionData = await readFile(sessionPath, "utf-8");
        const session = JSON.parse(sessionData);
        electronAppId = session.electronAppId;
      }
    } catch (error) {
      console.error("Error reading session:", error);
    }

    // Clear session in Convex
    if (electronAppId) {
      try {
        await axios.post(`${WEB_APP_URL}/api/electron-clear-session`, {
          electronAppId,
        });
        console.log("Cleared Convex session for:", electronAppId);
      } catch (error) {
        console.error("Error clearing Convex session:", error);
      }
    }

    // Clear local auth state
    isAuthenticated = false;
    authUser = null;

    // IMPORTANT: Clear the entire session file including electronAppId
    // This ensures a new ID is generated for the next sign-in
    try {
      await writeFile(sessionPath, JSON.stringify({}));
      console.log("Cleared local session completely");
    } catch (error) {
      console.error("Error clearing session file:", error);
    }

    // Notify renderer
    if (win) {
      win.webContents.send("auth-status-changed", { isAuthenticated: false });
    }

    return { success: true };
  });
}

// Check authentication status on startup
async function checkAuthStatus() {
  try {
    const sessionPath = path.join(app.getPath("userData"), "session.json");

    if (!existsSync(sessionPath)) {
      console.log("No session file found");
      return;
    }

    const sessionData = await readFile(sessionPath, "utf-8");
    const session = JSON.parse(sessionData);

    if (!session.electronAppId) {
      console.log("No electron app ID in session");
      return;
    }

    console.log("Checking auth for electron app:", session.electronAppId);

    // Check with server if this electron app is authenticated
    const response = await axios.post(
      `${WEB_APP_URL}/api/electron-auth-check`,
      { electronAppId: session.electronAppId }
    );

    if (response.data.authenticated && response.data.user) {
      // We're authenticated!
      isAuthenticated = true;
      authUser = response.data.user;
      console.log("Authenticated as:", authUser.email);

      // Notify renderer
      if (win) {
        win.webContents.send("auth-status-changed", {
          isAuthenticated: true,
          user: authUser,
        });
      }
    } else {
      console.log("Not authenticated");
    }
  } catch (error) {
    console.error("Error checking auth:", error);
  }
}

// Start checking for authentication completion
function startAuthCheck(electronAppId: string) {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
  }

  let checkCount = 0;
  const maxChecks = 60; // Check for 5 minutes max

  authCheckInterval = setInterval(async () => {
    checkCount++;

    if (checkCount > maxChecks) {
      clearInterval(authCheckInterval!);
      authCheckInterval = null;
      console.log("Auth check timeout");
      return;
    }

    try {
      const response = await axios.post(
        `${WEB_APP_URL}/api/electron-auth-check`,
        { electronAppId }
      );

      if (response.data.authenticated && response.data.user) {
        // Success!
        clearInterval(authCheckInterval!);
        authCheckInterval = null;

        isAuthenticated = true;
        authUser = response.data.user;
        console.log("Authenticated as:", authUser.email);

        // Save the session
        const sessionPath = path.join(app.getPath("userData"), "session.json");
        await writeFile(sessionPath, JSON.stringify({ electronAppId }));

        // Notify renderer
        if (win) {
          win.webContents.send("auth-status-changed", {
            isAuthenticated: true,
            user: authUser,
          });
        }
      }
    } catch (error) {
      // Ignore errors, just keep polling
    }
  }, 5000); // Check every 5 seconds
}

// Screenshot functionality
function setupScreenshotHandlers() {
  // Handler for capturing the entire screen
  ipcMain.handle("capture-screen", async () => {
    try {
      // Temporarily set window to not capture
      if (win) {
        win.setContentProtection(true);
      }

      // Small delay to ensure the protection is applied
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      // Get all available sources (screens)
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width, height },
      });

      // Find the main screen source (not the overlay window)
      const screenSource =
        sources.find(
          (source) =>
            source.name === "Entire Screen" ||
            source.name.includes("Screen") ||
            source.name === "Desktop"
        ) || sources[0];

      if (!screenSource) {
        throw new Error("No screen source found");
      }

      // Get the thumbnail as a NativeImage
      const screenshot = screenSource.thumbnail;

      // Convert to buffer
      const buffer = screenshot.toPNG();

      // Re-enable capture after screenshot
      if (win) {
        win.setContentProtection(false);
      }

      // Create directory if it doesn't exist
      const screenshotDir = path.join(
        app.getPath("home"),
        "Library",
        "Pictures",
        "ScreenCap"
      );
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true });
      }

      // Save to file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(
        screenshotDir,
        `screenshot-${timestamp}.png`
      );
      await writeFile(screenshotPath, buffer);

      // Return the screenshot data
      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize(),
      };
    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Handler for taking a screenshot (alias for capture-screen)
  ipcMain.handle("take-screenshot", async () => {
    try {
      // Temporarily set window to not capture
      if (win) {
        win.setContentProtection(true);
      }

      // Small delay to ensure the protection is applied
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      // Get all available sources (screens)
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width, height },
      });

      // Find the main screen source (not the overlay window)
      const screenSource =
        sources.find(
          (source) =>
            source.name === "Entire Screen" ||
            source.name.includes("Screen") ||
            source.name === "Desktop"
        ) || sources[0];

      if (!screenSource) {
        throw new Error("No screen source found");
      }

      // Get the thumbnail as a NativeImage
      const screenshot = screenSource.thumbnail;

      // Convert to buffer
      const buffer = screenshot.toPNG();

      // Re-enable capture after screenshot
      if (win) {
        win.setContentProtection(false);
      }

      // Create directory if it doesn't exist
      const screenshotDir = path.join(
        app.getPath("home"),
        "Library",
        "Pictures",
        "ScreenCap"
      );
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true });
      }

      // Save to file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(
        screenshotDir,
        `screenshot-${timestamp}.png`
      );
      await writeFile(screenshotPath, buffer);

      // Return the screenshot data
      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize(),
      };
    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Handler for getting all available sources
  ipcMain.handle("get-sources", async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 150, height: 150 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id,
      }));
    } catch (error) {
      console.error("Error getting sources:", error);
      return [];
    }
  });

  // Handler for capturing a specific source
  ipcMain.handle("capture-source", async (_, sourceId) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      const source = sources.find((s) => s.id === sourceId);

      if (!source) {
        throw new Error("Source not found");
      }

      let screenshot = source.thumbnail;

      const dimensions = screenshot.getSize();

      console.log("Dimensions are", dimensions.width, dimensions.height);

      if (dimensions.width % 2 != 0) {
        screenshot = screenshot.resize({
          width: dimensions.width + 1,
          height: dimensions.height,
        });
      }

      if (dimensions.height % 2 != 0) {
        screenshot = screenshot.resize({
          width: dimensions.width,
          height: dimensions.height + 1,
        });
      }

      const buffer = screenshot.toPNG();

      // Create directory if it doesn't exist
      const screenshotDir = path.join(
        app.getPath("home"),
        "Library",
        "Pictures",
        "ScreenCap"
      );
      if (!existsSync(screenshotDir)) {
        await mkdir(screenshotDir, { recursive: true });
      }

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(
        screenshotDir,
        `screenshot-${source.name}-${timestamp}.png`
      );
      await writeFile(screenshotPath, buffer);

      return {
        success: true,
        dataURL: screenshot.toDataURL(),
        path: screenshotPath,
        size: screenshot.getSize(),
        sourceName: source.name,
      };
    } catch (error) {
      console.error("Capture error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

// Window control handlers
function setupWindowHandlers() {
  // Handle quit app
  ipcMain.on("quit-app", () => {
    app.quit();
  });

  // Handle overlay visibility
  ipcMain.on("overlay-hidden", () => {
    // Overlay is hidden, but window stays open
  });

  // Handle request for current recording state
  ipcMain.handle("get-recording-state", () => {
    return isRecording;
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

// Global keyboard shortcuts
function setupGlobalShortcuts() {
  // Register global shortcut for show/hide
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
      // Send current recording state when showing
      win.webContents.send("recording-state-changed", isRecording);
    }
  });

  // Toggle recording
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (isRecording) {
      // Stop recording
      isRecording = false;
      if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
      }
      console.log("Recording stopped via shortcut");
    } else {
      // Start recording
      isRecording = true;
      if (screenshotInterval) {
        clearInterval(screenshotInterval);
      }
      captureScreenshot();
      screenshotInterval = setInterval(() => {
        captureScreenshot();
      }, 5000);
      console.log("Recording started via shortcut");
    }

    // Notify renderer of state change
    if (win) {
      win.webContents.send("recording-state-changed", isRecording);
    }
  });
}

// Handle app activation (dock icon click on macOS)
app.on("activate", () => {
  if (win) {
    win.show();
    win.webContents.send("show-overlay");
    // Send current recording state when showing via dock
    win.webContents.send("recording-state-changed", isRecording);
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Unregister shortcuts on quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  // Stop recording if active
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
  }
});

let frameInterval = 5; // Store the N value

function setNthFrameCallback(
  callback: (frame: { path: string; timestamp: string }) => void,
  n: number = 5
) {
  nthFrameCallback = callback;
  frameInterval = n;
  screenshotCounter = 0;
}

async function captureScreenshot() {
  screenshotCounter++;
  try {
    // Temporarily set window to not capture
    if (win) {
      win.setContentProtection(true);
    }

    // Small delay to ensure the protection is applied
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Get the primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Get all available sources (screens)
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
    });

    // Find the main screen source
    const screenSource =
      sources.find(
        (source) =>
          source.name === "Entire Screen" ||
          source.name.includes("Screen") ||
          source.name === "Desktop"
      ) || sources[0];

    if (!screenSource) {
      throw new Error("No screen source found");
    }

    // Get the thumbnail as a NativeImage
    let screenshot = screenSource.thumbnail;

    const dimensions = screenshot.getSize();

    console.log("Dimensions are", dimensions.width, dimensions.height);

    if (dimensions.width % 2 != 0) {
      screenshot = screenshot.resize({
        width: dimensions.width + 1,
        height: dimensions.height,
      });
    }

    if (dimensions.height % 2 != 0) {
      screenshot = screenshot.resize({
        width: dimensions.width,
        height: dimensions.height + 1,
      });
    }

    // Convert to buffer
    const buffer = screenshot.toPNG();

    // Re-enable capture after screenshot
    if (win) {
      win.setContentProtection(false);
    }

    // Create directory if it doesn't exist
    const screenshotDir = path.join(
      app.getPath("home"),
      "Library",
      "Pictures",
      "ScreenCap"
    );
    if (!existsSync(screenshotDir)) {
      await mkdir(screenshotDir, { recursive: true });
    }

    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = path.join(
      screenshotDir,
      `screenshot-${timestamp}.png`
    );
    await writeFile(screenshotPath, buffer);

    console.log("Screenshot saved:", screenshotPath);

    // Trigger Nth frame callback if set
    if (nthFrameCallback && screenshotCounter % frameInterval === 0) {
      nthFrameCallback({
        path: screenshotPath,
        timestamp: timestamp,
      });
    }
    return { success: true, path: screenshotPath };
  } catch (error) {
    console.error("Screenshot error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Handle recording state
ipcMain.on("recording-started", () => {
  console.log("Recording started");
  isRecording = true;

  // Clear any existing interval
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
  }

  // Take immediate screenshot
  captureScreenshot();

  // Start taking screenshots every 5 seconds
  screenshotInterval = setInterval(() => {
    captureScreenshot();
  }, 1000);

  // Notify renderer of state change
  if (win) {
    win.webContents.send("recording-state-changed", true);
  }
});

ipcMain.on("recording-stopped", () => {
  console.log("Recording stopped");
  isRecording = false;

  // Clear the interval
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  // Notify renderer of state change
  if (win) {
    win.webContents.send("recording-state-changed", false);
  }
});
