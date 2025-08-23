import { useState } from 'react'
import './ScreenCapture.css'

interface Source {
  id: string
  name: string
  thumbnail: string
  display_id: string
}

function ScreenCapture() {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const takeFullScreenshot = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.takeScreenshot()
      if (result.success && result.dataURL) {
        setScreenshot(result.dataURL)
        console.log('Screenshot saved to:', result.path)
      } else {
        setError(result.error || 'Failed to take screenshot')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadSources = async () => {
    setLoading(true)
    setError(null)
    try {
      const availableSources = await window.electronAPI.getSources()
      setSources(availableSources)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setLoading(false)
    }
  }

  const captureSelectedSource = async () => {
    if (!selectedSource) {
      setError('Please select a source first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.captureSource(selectedSource)
      if (result.success && result.dataURL) {
        setScreenshot(result.dataURL)
        console.log(`Screenshot of ${result.sourceName} saved to:`, result.path)
      } else {
        setError(result.error || 'Failed to capture source')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-capture">
      <h2>Screen Capture Tool</h2>
      
      <div className="controls">
        <button 
          onClick={takeFullScreenshot} 
          disabled={loading}
          className="capture-btn primary"
        >
          {loading ? 'Capturing...' : 'Take Full Screenshot'}
        </button>

        <button 
          onClick={loadSources} 
          disabled={loading}
          className="capture-btn secondary"
        >
          Load Available Sources
        </button>

        {sources.length > 0 && (
          <div className="source-selector">
            <select 
              value={selectedSource || ''} 
              onChange={(e) => setSelectedSource(e.target.value)}
              className="source-select"
            >
              <option value="">Select a window/screen</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <button 
              onClick={captureSelectedSource} 
              disabled={loading || !selectedSource}
              className="capture-btn primary"
            >
              Capture Selected
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {sources.length > 0 && (
        <div className="sources-grid">
          <h3>Available Sources:</h3>
          <div className="source-thumbnails">
            {sources.map(source => (
              <div 
                key={source.id} 
                className={`source-item ${selectedSource === source.id ? 'selected' : ''}`}
                onClick={() => setSelectedSource(source.id)}
              >
                <img src={source.thumbnail} alt={source.name} />
                <p>{source.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {screenshot && (
        <div className="screenshot-preview">
          <h3>Screenshot Preview:</h3>
          <img src={screenshot} alt="Screenshot" />
          <button 
            onClick={() => setScreenshot(null)}
            className="capture-btn secondary"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default ScreenCapture
