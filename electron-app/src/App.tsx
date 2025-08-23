import { useState, useEffect } from 'react'
import OverlayBar from './components/OverlayBar'
import './App.css'

function App() {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    // Listen for IPC messages from main process
    if (window.ipcRenderer) {
      const handleToggleVisibility = () => {
        setIsHidden(prev => !prev);
      };

      const handleShow = () => {
        setIsHidden(false);
        // Request current recording state when showing
        window.ipcRenderer.invoke('get-recording-state');
      };

      const handleHide = () => {
        setIsHidden(true);
      };

      window.ipcRenderer.on('toggle-visibility', handleToggleVisibility);
      window.ipcRenderer.on('show-overlay', handleShow);
      window.ipcRenderer.on('hide-overlay', handleHide);

      return () => {
        window.ipcRenderer.off('toggle-visibility', handleToggleVisibility);
        window.ipcRenderer.off('show-overlay', handleShow);
        window.ipcRenderer.off('hide-overlay', handleHide);
      };
    }
  }, []);

  const handleClose = () => {
    // Send IPC message to quit the app
    if (window.ipcRenderer) {
      window.ipcRenderer.send('quit-app')
    }
  }

  const handleHide = () => {
    // Hide the overlay bar
    setIsHidden(true)
    // Notify main process
    if (window.ipcRenderer) {
      window.ipcRenderer.send('overlay-hidden')
    }
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