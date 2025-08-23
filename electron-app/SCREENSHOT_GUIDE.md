# Electron Screenshot Functionality Guide

## Overview
This Electron app now has full screenshot capability that captures the actual screen content including all visible windows, not just the desktop background.

## Key Features

### 1. **Full Screen Capture**
- Captures the entire screen with all visible windows
- Automatically saves to your Pictures folder with timestamp
- Returns both the image data URL and file path

### 2. **Window/Source Selection**
- Lists all available windows and screens
- Shows thumbnails of each source
- Allows capturing specific windows or screens

### 3. **API Methods**

#### From Renderer Process:
```javascript
// Take a full screenshot
const result = await window.electronAPI.takeScreenshot()

// Get all available sources
const sources = await window.electronAPI.getSources()

// Capture a specific source
const result = await window.electronAPI.captureSource(sourceId)
```

## How It Works

### Main Process (`electron/main.ts`)
- Uses Electron's `desktopCapturer` API to access screen and window sources
- Implements IPC handlers for screenshot requests
- Saves screenshots to the Pictures folder with timestamps

### Preload Script (`electron/preload.ts`)
- Exposes safe screenshot APIs to the renderer process
- Maintains security through context isolation

### React Component (`src/components/ScreenCapture.tsx`)
- Provides UI for screenshot functionality
- Shows preview of captured images
- Displays available sources with thumbnails

## Technical Details

### Security Configuration
```javascript
webPreferences: {
  contextIsolation: true,    // Isolates contexts for security
  nodeIntegration: false,     // Prevents direct Node.js access
  webSecurity: true          // Maintains web security
}
```

### Screenshot Process
1. **Source Discovery**: Uses `desktopCapturer.getSources()` to find all available screens and windows
2. **Capture**: Gets high-resolution thumbnails matching the display size
3. **Processing**: Converts to PNG buffer
4. **Storage**: Saves to Pictures folder with timestamp
5. **Display**: Returns data URL for preview in the app

## Troubleshooting

### If screenshots appear blank:
- Ensure the app has screen recording permissions (macOS)
- Check that windows are not minimized
- Verify the source name detection logic

### For VS Code Live Share:
- The app captures the actual screen content on the host machine
- Remote participants see what the host's screen shows
- File paths are relative to the host's file system

## Usage

1. **Run the app**: `npm run dev`
2. **Take Screenshot**: Click "Take Full Screenshot" button
3. **Select Source**: Click "Load Available Sources" to see all windows
4. **Capture Specific**: Select a window/screen and click "Capture Selected"

## Files Modified

- `electron/main.ts` - Added screenshot handlers
- `electron/preload.ts` - Exposed screenshot APIs
- `electron/electron-env.d.ts` - Added TypeScript definitions
- `src/components/ScreenCapture.tsx` - UI component
- `src/components/ScreenCapture.css` - Styling
- `src/App.tsx` - Integrated screenshot component

## Notes

- Screenshots are saved to: `~/Pictures/screenshot-[timestamp].png`
- The app uses the native resolution of your display for captures
- All windows and screens are captured, not just the desktop background
