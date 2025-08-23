import { useState } from 'react'
import ScreenCapture from './components/ScreenCapture'
import './App.css'

function App() {
  const [showCapture, setShowCapture] = useState(true)

  return (
    <>
      <div className="app-header">
        <h1>Electron Screen Capture</h1>
        <p>Capture your entire screen or specific windows</p>
      </div>
      
      {showCapture && <ScreenCapture />}
    </>
  )
}

export default App
