import { useState } from 'react'
import OverlayBar from './components/OverlayBar'
import './App.css'

function App() {
  const [isMinimized, setIsMinimized] = useState(false)

  const handleClose = () => {
    // Close the app
    window.close()
  }

  const handleMinimize = () => {
    // Minimize to tray or hide
    setIsMinimized(true)
    // You can also send an IPC message to minimize the window
    if (window.ipcRenderer) {
      window.ipcRenderer.send('minimize-window')
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {!isMinimized && (
        <OverlayBar 
          onClose={handleClose}
          onMinimize={handleMinimize}
        />
      )}
    </div>
  )
}

export default App