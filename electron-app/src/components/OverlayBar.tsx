import React, { useState, useEffect } from 'react';
import { Play, X, EyeOff, MessageSquare, LogIn, Loader2 } from 'lucide-react';

interface OverlayBarProps {
  onClose?: () => void;
  onHide?: () => void;
}

const OverlayBar: React.FC<OverlayBarProps> = ({ onHide }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'authenticating' | 'authenticated'>('authenticated');
  const [user, setUser] = useState<any>({ name: 'Demo User', email: 'demo@example.com' });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Bypass auth check - always authenticated
    if (window.ipcRenderer) {
      setIsAuthenticated(true);
      setAuthStatus('authenticated');
      setUser({ name: 'Demo User', email: 'demo@example.com' });
      // Get recording state
      const recording = await window.ipcRenderer.invoke('get-recording-state');
      setIsRecording(recording);
    }
  };

  // Listen for recording state changes and auth status changes from main process
  useEffect(() => {
    if (window.ipcRenderer) {
      const handleRecordingStateChange = (_event: any, recording: boolean) => {
        setIsRecording(recording);
      };

      const handleAuthStatusChange = (_event: any, data: any) => {
        console.log('Auth status changed:', data);
        setIsAuthenticated(data.isAuthenticated);
        setUser(data.user || null);
        if (data.user) {
          console.log('User data received:', data.user);
        }
        if (data.isAuthenticated) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      };

      const handleAuthTimeout = () => {
        setAuthStatus('unauthenticated');
        setIsAuthenticated(false);
      };

      window.ipcRenderer.on('recording-state-changed', handleRecordingStateChange);
      window.ipcRenderer.on('auth-status-changed', handleAuthStatusChange);
      window.ipcRenderer.on('auth-timeout', handleAuthTimeout);

      return () => {
        window.ipcRenderer.off('recording-state-changed', handleRecordingStateChange);
        window.ipcRenderer.off('auth-status-changed', handleAuthStatusChange);
        window.ipcRenderer.off('auth-timeout', handleAuthTimeout);
      };
    }
  }, []);

  const toggleRecording = () => {
    // Bypass auth check - allow recording without authentication
    const newState = !isRecording;
    // Send message to main process to handle recording
    if (window.ipcRenderer) {
      window.ipcRenderer.send(newState ? 'recording-started' : 'recording-stopped');
    }
    setIsRecording(newState);
  };

  const handleLogin = async () => {
    if (window.ipcRenderer) {
      setAuthStatus('authenticating');
      const result = await window.ipcRenderer.invoke('request-auth');
      if (!result.success) {
        setAuthStatus('unauthenticated');
      }
    }
  };

  const handleLogout = async () => {
    if (window.ipcRenderer) {
      // Stop recording if active
      if (isRecording) {
        window.ipcRenderer.send('recording-stopped');
        setIsRecording(false);
      }
      
      await window.ipcRenderer.invoke('logout');
      setIsAuthenticated(false);
      setAuthStatus('unauthenticated');
      setUser(null);
    }
  };

  const handleClose = () => {
    // Stop recording before quitting
    if (isRecording) {
      if (window.ipcRenderer) {
        window.ipcRenderer.send('recording-stopped');
      }
    }
    // Quit the entire app via IPC
    if (window.ipcRenderer) {
      window.ipcRenderer.send('quit-app');
    }
  };

  // Render different UI based on auth status
  // Bypassed - always show authenticated UI

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
        {/* Listen/Listening Button or Login Button */}
        <button
          onClick={isAuthenticated ? toggleRecording : handleLogin}
          className={`
            flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
            ${isAuthenticated
              ? (isRecording 
                ? 'bg-red-500/90 text-white' 
                : 'hover:bg-white/5 text-white/80 hover:text-white')
              : 'hover:bg-white/5 text-white/80 hover:text-white'
            }
          `}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {!isAuthenticated ? (
            <>
              <LogIn className="w-3 h-3" />
              <span>Sign In</span>
            </>
          ) : isRecording ? (
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

        {/* Divider and other buttons - Only show when authenticated */}
        {isAuthenticated && (
          <>
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

                        <div className="w-px h-4 bg-white/10" />

            {/* User Display and Logout Button */}
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className=" hover:bg-white/5 rounded-full transition-all duration-200"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                title="Sign Out"
              >
                <div className="w-5 h-5 rounded-full bg-neutral-400 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-white">
                    {user?.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt={user.name || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </span>
                </div>
              </button>
            </div>
          </>
        )}

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