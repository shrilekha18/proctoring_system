import React, { useEffect, useRef, useState } from 'react';
import { useProctoringContext } from '../context/ProctoringContext';
import { AIEngine, type DetectionResult } from '../utils/ai-engine';
import { AudioEngine } from '../utils/audio-engine';
import { AlertTriangle, Mic, Video, Shield, Timer, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/dashboard.css';

export const Dashboard: React.FC = () => {
  const { user, violations, trustScore, addViolation, setSessionStatus } = useProctoringContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const aiEngineRef = useRef<AIEngine | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour exam

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          setSessionStatus('COMPLETED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setSessionStatus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('TAB_SWITCHED', 'User switched tab or minimized window');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Alt+Tab, etc.
      if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault();
        addViolation('FORBIDDEN_KEY', `Forbidden key combination pressed: ${e.key}`);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addViolation('FULLSCREEN_EXIT', 'User exited full-screen mode');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Auto-enter fullscreen
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [addViolation]);

  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initSystems();
    return () => {
      audioEngineRef.current?.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initSystems = async () => {
    try {
      console.log('Dashboard: Requesting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }

      aiEngineRef.current = new AIEngine((results) => {
        handleAIDetection(results);
      });
      await aiEngineRef.current.load();

      audioEngineRef.current = new AudioEngine(
        () => {
          addViolation('VOICE_DETECTED', 'Suspicious audio detected in environment');
        },
        (data) => setAudioData(new Uint8Array(data))
      );
      await audioEngineRef.current.start();

      requestAnimationFrame(detectFrame);
    } catch (err) {
      console.error('System init failed', err);
    }
  };

  const detectFrame = async () => {
    if (videoRef.current && aiEngineRef.current) {
      const phones = await aiEngineRef.current.detect(videoRef.current);
      if (phones && phones.length > 0) {
        addViolation('MOBILE_PHONE_DETECTED', 'Mobile phone detected in frame');
      }
    }
    requestAnimationFrame(detectFrame);
  };

  const handleAIDetection = (results: DetectionResult) => {
    if (results.faces.length === 0) {
      addViolation('FACE_NOT_FOUND', 'Candidate face not found in frame');
    } else if (results.faces.length > 1) {
      addViolation('MULTIPLE_FACES', 'Multiple people detected in frame');
    } else {
      // Face Matching (Identity Verification)
      if (user?.faceData && aiEngineRef.current) {
        const similarity = aiEngineRef.current.compareFaces(user.faceData, results.faces[0]);
        if (similarity < 0.6) { // 0.6 is a threshold for similarity
          addViolation('FACE_NOT_FOUND', 'Unidentified person detected');
        }
      }
    }

    if (results.lookingAway) {
      addViolation('LOOKING_AWAY', 'Candidate is looking away from screen');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dashboard-layout" style={{ 
      height: '100vh', 
      background: '#0f172a', 
      display: 'grid', 
      gridTemplateColumns: '1fr 350px',
      overflow: 'hidden'
    }}>
      <main style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          padding: '1rem 1.5rem', 
          borderRadius: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', color: '#3b82f6' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>SafeProctor Active</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monitoring workspace...</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Time Remaining</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: timeLeft < 300 ? '#ef4444' : 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Timer size={18} /> {formatTime(timeLeft)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Integrity Score</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: trustScore < 70 ? '#ef4444' : '#10b981' }}>
                {trustScore}%
              </div>
            </div>
          </div>

          <button 
            onClick={() => setSessionStatus('COMPLETED')}
            style={{ 
              padding: '0.625rem 1.25rem', 
              background: '#ef4444', 
              border: 'none', 
              borderRadius: '0.5rem', 
              color: 'white', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            End Exam <LogOut size={18} />
          </button>
        </header>

        <div style={{ flex: 1, position: 'relative', borderRadius: '1.5rem', overflow: 'hidden', background: '#000' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Audio Environment</div>
              <div style={{ display: 'flex', gap: '2px', height: '30px', alignItems: 'flex-end' }}>
                {Array.from(audioData).slice(0, 30).map((v, i) => (
                  <div key={i} style={{ width: '3px', height: `${(v/255)*100}%`, background: v > 80 ? '#ef4444' : '#3b82f6', borderRadius: '1px' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <StatusBadge icon={<Video size={14} />} label="Video" active />
              <StatusBadge icon={<Mic size={14} />} label="Audio" active />
            </div>
          </div>
        </div>
      </main>

      <aside style={{ background: '#1e293b', borderLeft: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="#ef4444" /> Violation Log
          </h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <AnimatePresence initial={false}>
            {violations.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                  borderRadius: '0.75rem',
                  marginBottom: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{v.type.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', margin: 0 }}>{v.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {violations.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '3rem', color: '#64748b' }}>
              <Shield size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.875rem' }}>System secured. No violations detected.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

const StatusBadge: React.FC<{ icon: React.ReactNode, label: string, active: boolean }> = ({ icon, label, active }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    padding: '0.5rem 0.75rem', 
    background: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    borderRadius: '0.5rem',
    border: `1px solid ${active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
    color: active ? '#10b981' : '#ef4444',
    fontSize: '0.75rem',
    fontWeight: 600
  }}>
    {icon} {label}
  </div>
);
