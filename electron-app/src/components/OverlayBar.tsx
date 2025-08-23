import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Pause, Play, X, Minimize2 } from 'lucide-react';

interface OverlayBarProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

const OverlayBar: React.FC<OverlayBarProps> = ({ onClose, onMinimize }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [screenshotCount, setScreenshotCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      // Start timer
      const timerId = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      // Start screenshot capture every 5 seconds
      const screenshotId = setInterval(() => {
        captureScreen();
      }, 5000);

      // Capture immediately when starting
      captureScreen();

      setIntervalId(screenshotId);

      return () => {
        clearInterval(timerId);
        clearInterval(screenshotId);
      };
    } else {
      // Reset when stopped
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setTimeElapsed(0);
    }
  }, [isRecording]);

  const captureScreen = async () => {
    try {
      const result = await window.electronAPI.takeScreenshot();
      if (result.success) {
        setScreenshotCount(prev => prev + 1);
        console.log('Screenshot saved:', result.path);
      } else {
        console.error('Failed to capture screen:', result.error);
      }
    } catch (error) {
      console.error('Error capturing screen:', error);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setScreenshotCount(0);
    }
    setIsRecording(!isRecording);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md rounded-xl px-3 py-2 shadow-2xl z-[9999] min-w-[320px] border border-white/10 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Status indicator */}
        <div className="flex items-center">
          {isRecording ? (
            <Badge variant="destructive" className="flex items-center gap-1.5 bg-red-500/90 text-white px-2.5 py-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Recording
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-white/10 text-white/70 hover:bg-white/15">
              <Square className="w-3 h-3 mr-1" />
              Stopped
            </Badge>
          )}
        </div>

        {/* Time display */}
        <div className="flex items-center gap-3 text-white font-mono">
          <span className="text-sm font-medium tracking-wide">{formatTime(timeElapsed)}</span>
          {isRecording && (
            <span className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-md">
              <Camera className="w-3 h-3" />
              {screenshotCount}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant={isRecording ? "destructive" : "default"}
            onClick={toggleRecording}
            className="h-7"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isRecording ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Start
              </>
            )}
          </Button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onMinimize}
            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OverlayBar;
