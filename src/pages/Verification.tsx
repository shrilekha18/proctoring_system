import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProctoringContext } from '../context/ProctoringContext';
import { Camera, Mic, Wifi, CheckCircle2, Scan, Loader2, Eye } from 'lucide-react';
import { AIEngine, type DetectionResult } from '../utils/ai-engine';

interface FeatureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  
  const [registrationStep, setRegistrationStep] = useState<'none' | 'center' | 'left' | 'right' | 'complete'>('none');
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const [capturedFaces, setCapturedFaces] = useState<{ center?: unknown, left?: unknown, right?: unknown }>({});
  const [boundingBox, setBoundingBox] = useState<{x:number, y:number, width:number, height:number} | null>(null);
  const [featureBoxes, setFeatureBoxes] = useState<{ leftEye: FeatureBox, rightEye: FeatureBox, mouth: FeatureBox } | null>(null);
  const scanStartRef = useRef<number | null>(null);
  
  const handleResults = useCallback((results: DetectionResult) => {
    if (registrationStep === 'none' || registrationStep === 'complete') {
      setBoundingBox(null);
      setFeatureBoxes(null);
      return;
    }

    if (!results.faces || results.faces.length === 0) {
      setVerificationMessage('No face detected. Please ensure you are visible.');
      scanStartRef.current = null;
      setBoundingBox(null);
      setFeatureBoxes(null);
      return;
    }

    if (results.faces.length > 1) {
      setVerificationMessage('Multiple people detected. Registration requires only one person.');
      scanStartRef.current = null;
      setBoundingBox(null);
      setFeatureBoxes(null);
      return;
    }

    // Calculate and set bounding box and feature boxes for visualization
    if (aiEngineRef.current) {
      const box = aiEngineRef.current.getBoundingBox(results.faces[0]);
      setBoundingBox(box);
      const features = aiEngineRef.current.getFeatureBoxes(results.faces[0]) as { leftEye: FeatureBox, rightEye: FeatureBox, mouth: FeatureBox };
      setFeatureBoxes(features);
    }

    const { yaw, pitch } = results.headPose;

    // Check if head position is correct for the current step
    let positionCorrect = false;
    if (registrationStep === 'center') {
      if (Math.abs(yaw) < 8 && Math.abs(pitch) < 8) {
        positionCorrect = true;
        setVerificationMessage('Biometric analysis: Stabilizing eyes and mouth...');
      } else {
        setVerificationMessage('Please look directly at the camera');
      }
    } else if (registrationStep === 'left') {
      if (yaw > 15 && yaw < 35) {
        positionCorrect = true;
        setVerificationMessage('Left profile captured. Processing features...');
      } else if (yaw <= 15) {
        setVerificationMessage('Turn your head slowly to your LEFT');
      } else {
        setVerificationMessage('Too far! Turn back slightly');
      }
    } else if (registrationStep === 'right') {
      if (yaw < -15 && yaw > -35) {
        positionCorrect = true;
        setVerificationMessage('Right profile captured. Finalizing scan...');
      } else if (yaw >= -15) {
        setVerificationMessage('Turn your head slowly to your RIGHT');
      } else {
        setVerificationMessage('Too far! Turn back slightly');
      }
    }

    if (positionCorrect) {
      if (!scanStartRef.current) {
        scanStartRef.current = Date.now();
      } else if (Date.now() - scanStartRef.current > 1200) {
        // Step complete
        const nextStepMap: Record<string, string> = {
          'center': 'left',
          'left': 'right',
          'right': 'complete'
        };
        const nextStep = nextStepMap[registrationStep] as 'none' | 'center' | 'left' | 'right' | 'complete';

        const updatedCapturedFaces = { ...capturedFaces, [registrationStep]: results.faces[0] };
        setCapturedFaces(updatedCapturedFaces);
        setRegistrationStep(nextStep);
        scanStartRef.current = null;

        if (nextStep === 'complete') {
          setUser(prev => prev ? ({ 
            ...prev, 
            faceData: updatedCapturedFaces.center, 
            multiViewData: updatedCapturedFaces 
          }) : prev);
          setChecks(prev => ({ ...prev, face: true }));
          setIsScanning(false);
          isScanningRef.current = false;
          setVerificationMessage('Face Identity Verified Successfully!');
        }
      } else {
        const progress = Math.round(((Date.now() - scanStartRef.current) / 1200) * 100);
        setVerificationMessage(`Mapping ${registrationStep} features... ${progress}%`);
      }
    } else {
      scanStartRef.current = null;
    }
  }, [capturedFaces, registrationStep, setUser]);

  const onResultsRef = useRef<(results: DetectionResult) => void>(handleResults);

  useEffect(() => {
    onResultsRef.current = handleResults;
  }, [handleResults]);

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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: true 
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error('Error playing video:', e));
            setIsVideoReady(true);
            setChecks(prev => ({ ...prev, camera: true, mic: true }));
          };
        }
        
        // Simulate internet check
        setTimeout(() => setChecks(prev => ({ ...prev, internet: true })), 1000);
      } catch (err: unknown) {
        console.error('Camera/Mic access denied or error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Could not access camera';
        setVerificationMessage(`Error: ${errorMessage}. Please check permissions.`);
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
    setRegistrationStep('center');
    setIsScanning(true);
    isScanningRef.current = true;
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
        <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Advanced Biometric Verification</h2>
            <p style={{ color: '#94a3b8' }}>Welcome, {user?.name}. Laptop camera initialization successful.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Camera:</span>
            <span style={{ color: '#10b981', marginLeft: '0.5rem', fontWeight: 600 }}>ACTIVE</span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div className="preview-container" style={{ position: 'relative' }}>
            <div style={{
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              position: 'relative',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isVideoReady ? 1 : 0 }} 
              />
              
              {/* Feature Focus HUD */}
              {featureBoxes && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
                  {/* Left Eye */}
                  <div style={{
                    position: 'absolute',
                    left: `${featureBoxes.leftEye.x * 100}%`,
                    top: `${featureBoxes.leftEye.y * 100}%`,
                    width: `${featureBoxes.leftEye.width * 100}%`,
                    height: `${featureBoxes.leftEye.height * 100}%`,
                    border: '1px solid #60a5fa',
                    boxShadow: '0 0 5px #60a5fa'
                  }}>
                    <div style={{ position: 'absolute', top: -15, left: 0, fontSize: '0.5rem', color: '#60a5fa', fontWeight: 700 }}>EYE_L</div>
                  </div>
                  {/* Right Eye */}
                  <div style={{
                    position: 'absolute',
                    left: `${featureBoxes.rightEye.x * 100}%`,
                    top: `${featureBoxes.rightEye.y * 100}%`,
                    width: `${featureBoxes.rightEye.width * 100}%`,
                    height: `${featureBoxes.rightEye.height * 100}%`,
                    border: '1px solid #60a5fa',
                    boxShadow: '0 0 5px #60a5fa'
                  }}>
                    <div style={{ position: 'absolute', top: -15, left: 0, fontSize: '0.5rem', color: '#60a5fa', fontWeight: 700 }}>EYE_R</div>
                  </div>
                  {/* Mouth */}
                  <div style={{
                    position: 'absolute',
                    left: `${featureBoxes.mouth.x * 100}%`,
                    top: `${featureBoxes.mouth.y * 100}%`,
                    width: `${featureBoxes.mouth.width * 100}%`,
                    height: `${featureBoxes.mouth.height * 100}%`,
                    border: '1px solid #fbbf24',
                    boxShadow: '0 0 5px #fbbf24'
                  }}>
                    <div style={{ position: 'absolute', bottom: -15, left: 0, fontSize: '0.5rem', color: '#fbbf24', fontWeight: 700 }}>MOUTH_TRACK</div>
                  </div>
                </div>
              )}

              {boundingBox && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: 'absolute',
                    border: '2px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '0.5rem',
                    left: `${boundingBox.x * 100}%`,
                    top: `${boundingBox.y * 100}%`,
                    width: `${boundingBox.width * 100}%`,
                    height: `${boundingBox.height * 100}%`,
                    pointerEvents: 'none',
                    zIndex: 25
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: 0,
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Eye size={12} /> Biometric Lock
                  </div>
                </motion.div>
              )}
              
              {isScanning && registrationStep !== 'complete' && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(to right, transparent, #3b82f6, transparent)',
                    boxShadow: '0 0 15px #3b82f6',
                    zIndex: 20
                  }}
                />
              )}

              {/* Step Indicators */}
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '1rem',
                zIndex: 30
              }}>
                <StepIndicator label="Center" active={registrationStep === 'center'} complete={!!capturedFaces.center} />
                <StepIndicator label="Left" active={registrationStep === 'left'} complete={!!capturedFaces.left} />
                <StepIndicator label="Right" active={registrationStep === 'right'} complete={!!capturedFaces.right} />
              </div>

              {(isScanning || registrationStep === 'complete') && (
                <div style={{
                  position: 'absolute',
                  bottom: '2rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '1rem',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  zIndex: 30,
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  {registrationStep === 'complete' ? <CheckCircle2 size={18} color="#10b981" /> : <Loader2 size={18} className="animate-spin text-blue-500" />}
                  <span style={{ fontWeight: 500 }}>{verificationMessage}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {!isEngineLoaded ? (
                <div style={{
                  width: '100%',
                  padding: '1.25rem',
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
                  <Loader2 size={20} className="animate-spin" /> Calibrating Laptop Camera...
                </div>
              ) : registrationStep === 'none' ? (
                <button 
                  onClick={handleScan}
                  disabled={!checks.camera}
                  style={{
                    width: '100%',
                    padding: '1.25rem',
                    background: '#3b82f6',
                    borderRadius: '1rem',
                    border: 'none',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Scan size={20} /> Start Feature Mapping
                </button>
              ) : registrationStep === 'complete' ? (
                <div style={{
                  padding: '1.25rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '1rem',
                  border: '1px solid #10b981',
                  color: '#10b981',
                  textAlign: 'center',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}>
                  <CheckCircle2 size={20} /> Biometric ID Successfully Registered
                </div>
              ) : (
                <div style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '1rem',
                  border: '1px solid #3b82f6',
                  color: '#3b82f6',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}>
                  <Scan size={20} className="animate-pulse" /> Mapping {registrationStep.toUpperCase()} Region...
                </div>
              )}
            </div>
          </div>

          <div className="checks-list">
            <div className="glass-panel" style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '1.5rem',
              padding: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              height: '100%'
            }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Biometric Integrity</h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <CheckItem label="Camera Hardware" status={checks.camera} icon={<Camera size={20} />} />
                <CheckItem label="Voice Calibration" status={checks.mic} icon={<Mic size={20} />} />
                <CheckItem label="Neural Sync" status={checks.internet} icon={<Wifi size={20} />} />
                <CheckItem label="Biometric Profile" status={checks.face} icon={<Scan size={20} />} />
              </div>

              <div style={{ 
                marginTop: '2rem', 
                padding: '1.25rem', 
                background: 'rgba(59, 130, 246, 0.05)', 
                borderRadius: '1rem', 
                border: '1px solid rgba(59, 130, 246, 0.2)' 
              }}>
                <h4 style={{ fontSize: '0.875rem', color: '#60a5fa', marginBottom: '0.5rem', fontWeight: 600 }}>Laptop Camera Focus:</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: '1.6' }}>
                  The system is currently focusing on your <strong>Eyes</strong> and <strong>Mouth</strong> to create a unique biometric signature.
                </p>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                   <div style={{ padding: '2px 6px', background: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa', borderRadius: '4px', fontSize: '0.6rem', color: '#60a5fa' }}>EYE_PRECISION</div>
                   <div style={{ padding: '2px 6px', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid #fbbf24', borderRadius: '4px', fontSize: '0.6rem', color: '#fbbf24' }}>MOUTH_GEOMETRY</div>
                </div>
              </div>

              <button
                disabled={!allReady}
                onClick={startSession}
                style={{
                  width: '100%',
                  marginTop: '2rem',
                  padding: '1.25rem',
                  background: allReady ? 'linear-gradient(to right, #3b82f6, #2563eb)' : '#334155',
                  borderRadius: '1rem',
                  border: 'none',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: allReady ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  boxShadow: allReady ? '0 10px 15px -3px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                Proceed to Secure Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{ label: string, active: boolean, complete: boolean }> = ({ label, active, complete }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem'
  }}>
    <div style={{
      width: '40px',
      height: '4px',
      background: complete ? '#10b981' : active ? '#3b82f6' : 'rgba(255,255,255,0.2)',
      borderRadius: '2px',
      transition: 'all 0.3s ease'
    }} />
    <span style={{ 
      fontSize: '0.65rem', 
      textTransform: 'uppercase', 
      fontWeight: 800,
      color: complete ? '#10b981' : active ? '#3b82f6' : '#64748b'
    }}>{label}</span>
  </div>
);

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
