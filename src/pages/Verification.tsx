import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useProctoringContext } from '../context/ProctoringContext';
import { Camera, Mic, Wifi, CheckCircle2, AlertCircle, Scan, Loader2 } from 'lucide-react';
import { AIEngine, type DetectionResult } from '../utils/ai-engine';

export const Verification: React.FC = () => {
  const { startSession, user, setUser } = useProctoringContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const aiEngineRef = useRef<AIEngine | null>(null);
  const [isEngineLoaded, setIsEngineLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('Position your face within the circle');
  const [checks, setChecks] = useState({
    camera: false,
    mic: false,
    internet: false,
    face: false
  });
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const scanStartRef = useRef<number | null>(null);

  // Use a ref for the callback to always have the latest state access without re-initializing AIEngine
  const onResultsRef = useRef<(results: DetectionResult) => void>(() => {});

  onResultsRef.current = (results: DetectionResult) => {
    if (!isScanningRef.current) return;

    if (!results.faces || results.faces.length === 0) {
      setVerificationMessage('No face detected. Please ensure you are visible.');
      scanStartRef.current = null;
      return;
    }

    if (results.faces.length > 1) {
      setVerificationMessage('Multiple people detected. Registration requires only one person.');
      scanStartRef.current = null;
      return;
    }

    // Stable detection: Must see exactly one face for at least 1.5 seconds
    if (!scanStartRef.current) {
      scanStartRef.current = Date.now();
      setVerificationMessage('Hold still... Scanning...');
    } else if (Date.now() - scanStartRef.current > 1500) {
      // Successfully captured stable face landmarks
      console.log('Face captured successfully');
      setUser(prev => prev ? ({ ...prev, faceData: results.faces[0] }) : prev);
      setChecks(prev => ({ ...prev, face: true }));
      setIsScanning(false);
      isScanningRef.current = false;
      scanStartRef.current = null;
      setVerificationMessage('Face ID registered successfully!');
    } else {
      const progress = Math.round(((Date.now() - scanStartRef.current) / 1500) * 100);
      setVerificationMessage(`Scanning... ${progress}%`);
    }
  };

  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Initialize AI Engine
    const initAI = async () => {
      try {
        aiEngineRef.current = new AIEngine((results) => onResultsRef.current(results));
        await aiEngineRef.current.load();
        setIsEngineLoaded(true);
      } catch (err) {
        console.error('AI Engine init failed', err);
      }
    };

    // Initial checks
    const runChecks = async () => {
      try {
        console.log('Requesting camera and microphone...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: true 
        });
        
        streamRef.current = stream;
        console.log('Media stream obtained');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            videoRef.current?.play().catch(e => console.error('Error playing video:', e));
            setIsVideoReady(true);
            setChecks(prev => ({ ...prev, camera: true, mic: true }));
          };
        }
        
        // Simulate internet check
        setTimeout(() => setChecks(prev => ({ ...prev, internet: true })), 1500);
      } catch (err: any) {
        console.error('Camera/Mic access denied or error:', err);
        setVerificationMessage(`Error: ${err.message || 'Could not access camera'}. Please check permissions.`);
      }
    };

    runChecks();
    initAI();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Frame detection loop
  useEffect(() => {
    let animationId: number;
    const detectFrame = async () => {
      if (videoRef.current && aiEngineRef.current && isEngineLoaded && isVideoReady) {
        if (videoRef.current.readyState === 4) { // HAVE_ENOUGH_DATA
          await aiEngineRef.current.detect(videoRef.current);
        }
      }
      animationId = requestAnimationFrame(detectFrame);
    };
    
    detectFrame();
    
    return () => cancelAnimationFrame(animationId);
  }, [isEngineLoaded, isVideoReady]);

  const handleScan = () => {
    setIsScanning(true);
    isScanningRef.current = true;
    // The actual scan completion is handled in the AIEngine callback
  };

  const allReady = Object.values(checks).every(v => v);

  return (
    <div className="verification-screen" style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>System Integrity Check</h2>
          <p style={{ color: '#94a3b8' }}>Welcome, {user?.name}. Please verify your environment.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div className="preview-container" style={{ position: 'relative' }}>
            <div style={{
              aspectRatio: '16/9',
              background: '#1e293b',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              position: 'relative',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              
              {isScanning && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#60a5fa',
                    boxShadow: '0 0 15px #3b82f6',
                    zIndex: 20
                  }}
                />
              )}

              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '250px',
                height: '250px',
                border: '2px dashed rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />

              {isScanning && (
                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '0.5rem 1rem',
                  borderRadius: '2rem',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  zIndex: 30,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {verificationMessage}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {!isEngineLoaded ? (
                <div style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}>
                  <Loader2 size={20} className="animate-spin" /> Initializing AI Guard...
                </div>
              ) : !checks.face ? (
                <button 
                  onClick={handleScan}
                  disabled={!checks.camera}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#3b82f6',
                    borderRadius: '1rem',
                    border: 'none',
                    color: 'white',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <Scan size={20} /> Register Face ID
                </button>
              ) : (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '1rem',
                  border: '1px solid #10b981',
                  color: '#10b981',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  Face Identity Verified Successfully
                </div>
              )}
            </div>
          </div>

          <div className="checks-list">
            <div className="glass-panel" style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '1.5rem',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Prerequisites</h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <CheckItem label="Webcam Access" status={checks.camera} icon={<Camera size={20} />} />
                <CheckItem label="Microphone Access" status={checks.mic} icon={<Mic size={20} />} />
                <CheckItem label="Internet Connection" status={checks.internet} icon={<Wifi size={20} />} />
                <CheckItem label="Identity Verification" status={checks.face} icon={<Scan size={20} />} />
              </div>

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <p style={{ color: '#f59e0b', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  Ensure you are in a well-lit room and no other person is visible in the frame.
                </p>
              </div>

              <button
                disabled={!allReady}
                onClick={startSession}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: allReady ? 'linear-gradient(to right, #10b981, #059669)' : '#334155',
                  borderRadius: '1rem',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: allReady ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease'
                }}
              >
                Launch Safe Exam Browser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ label: string, status: boolean, icon: React.ReactNode }> = ({ label, status, icon }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '0.75rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ color: status ? '#3b82f6' : '#64748b' }}>{icon}</span>
      <span style={{ fontSize: '0.9375rem', color: status ? 'white' : '#94a3b8' }}>{label}</span>
    </div>
    {status ? (
      <CheckCircle2 size={20} color="#10b981" />
    ) : (
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }}
      />
    )}
  </div>
);
