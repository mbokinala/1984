import { useState, useEffect } from 'react'
import OverlayBar from './components/OverlayBar'
import './App.css'

function App() {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    // Set up keyboard shortcut to show the bar again
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + S: Show window
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setIsHidden(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    // Send IPC message to close the app
    if (window.ipcRenderer) {
      window.ipcRenderer.send('close-window')
    } else {
      window.close()
    }
  }

  const handleHide = () => {
    // Hide the overlay bar
    setIsHidden(true)
  }

  return (
    <div className="min-h-screen bg-transparent">
      {!isHidden && (
        <OverlayBar 
          onClose={handleClose}
          onHide={handleHide}
        />
      )}
    </div>
  )
}

export default App