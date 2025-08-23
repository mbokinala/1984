import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, X, EyeOff, MessageSquare } from 'lucide-react';

interface OverlayBarProps {
  onClose?: () => void;
  onHide?: () => void;
}

const OverlayBar: React.FC<OverlayBarProps> = ({ onClose, onHide }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      // Start screenshot capture every 5 seconds
      const screenshotId = setInterval(() => {
        captureScreen();
      }, 5000);

      // Capture immediately when starting
      captureScreen();

      setIntervalId(screenshotId);

      return () => {
        clearInterval(screenshotId);
      };
    } else {
      // Reset when stopped
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  }, [isRecording]);

  // Listen for toggle recording from global shortcut
  useEffect(() => {
    if (window.ipcRenderer) {
      const handleToggleRecording = () => {
        toggleRecording();
      };

      window.ipcRenderer.on('toggle-recording', handleToggleRecording);

      return () => {
        window.ipcRenderer.off('toggle-recording', handleToggleRecording);
      };
    }
  }, []);

  const captureScreen = async () => {
    try {
      const result = await window.electronAPI.takeScreenshot();
      if (result.success) {
        console.log('Screenshot saved:', result.path);
      } else {
        console.error('Failed to capture screen:', result.error);
      }
    } catch (error) {
      console.error('Error capturing screen:', error);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleClose = () => {
    // Quit the entire app via IPC
    if (window.ipcRenderer) {
      window.ipcRenderer.send('quit-app');
    }
  };

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div 
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(20, 20, 20, 0.75)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Listen/Listening Button */}
        <button
          onClick={toggleRecording}
          className={`
            flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
            ${isRecording 
              ? 'bg-red-500/90 text-white' 
              : 'hover:bg-white/5 text-white/80 hover:text-white'
            }
          `}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {isRecording ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Listening</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Listen</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Ask Button (Coming Soon) */}
        <button
          disabled
          className="flex items-center gap-1.5 px-3 py-1 text-white/30 text-xs font-medium cursor-not-allowed"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Ask</span>
          <span className="text-[10px] ml-1 opacity-50">⌘⇧A</span>
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Hide Button */}
        <button
          onClick={onHide}
          className="flex items-center gap-1.5 px-3 py-1 hover:bg-white/5 text-white/60 hover:text-white/90 text-xs font-medium rounded-full transition-all duration-200"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <EyeOff className="w-3 h-3" />
          <span>Hide</span>
          <span className="text-[10px] ml-1 opacity-50">⌘⇧H</span>
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="ml-1 p-1 hover:bg-white/5 text-white/40 hover:text-red-400 rounded-full transition-all duration-200"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Quit"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default OverlayBar;