import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useProctoringContext } from '../context/ProctoringContext';
import { AIEngine, type DetectionResult } from '../utils/ai-engine';
import { AudioEngine } from '../utils/audio-engine';
import { Shield, ChevronRight, Play, Calendar, Clock, Video, Maximize, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import * as faceMesh from '@mediapipe/face_mesh';
import '../styles/dashboard.css';

interface FeatureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Dashboard: React.FC = () => {
  const { user, trustScore, addViolation, setSessionStatus, sessionStatus, exams, currentExam, setCurrentExam } = useProctoringContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const aiEngineRef = useRef<AIEngine | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const isTerminatedRef = useRef(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  
  const [featureBoxes, setFeatureBoxes] = useState<{ leftEye: FeatureBox, rightEye: FeatureBox, mouth: FeatureBox } | null>(null);
  const isMouthMovingRef = useRef(false);
  const [isLookingAwayUI, setIsLookingAwayUI] = useState(false);
  const [isCenteredUI, setIsCenteredUI] = useState(true);
  const [distanceStatusUI, setDistanceStatusUI] = useState<'OPTIMAL' | 'TOO_CLOSE' | 'TOO_FAR'>('OPTIMAL');
  const [isVoiceDetectedUI, setIsVoiceDetectedUI] = useState(false);
  const stableVoiceRef = useRef<number | null>(null);

  const [systemStatus, setSystemStatus] = useState({ camera: false, mic: false, ai: false });
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));

  const shuffledQuestions = useMemo(() => {
    if (!currentExam) return [];
    return [...currentExam.questions].sort(() => Math.random() - 0.5);
  }, [currentExam]);

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isExamStarted) return;
    const preventDefault = (e: Event) => e.preventDefault();
    const handleVisibilityChange = () => {
      if (document.hidden && !isTerminatedRef.current) {
        addViolation('TAB_SWITCHED', 'Critical: Tab switch detected during exam.');
      }
    };
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isExamStarted, addViolation]);

  const handleAIDetection = useCallback((results: DetectionResult) => {
    if (isTerminatedRef.current) { setFeatureBoxes(null); return; }

    if (results.faces.length === 0) {
      if (isExamStarted) addViolation('FACE_NOT_FOUND', 'Candidate face not found in frame');
      setFeatureBoxes(null);
      isMouthMovingRef.current = false;
      setIsLookingAwayUI(false);
    } else if (results.faces.length > 1) {
      if (isExamStarted) addViolation('MULTIPLE_FACES', 'Multiple people detected in frame');
      setFeatureBoxes(null);
      isMouthMovingRef.current = false;
    } else {
      if (aiEngineRef.current) {
        const features = aiEngineRef.current.getFeatureBoxes(results.faces[0]) as { leftEye: FeatureBox, rightEye: FeatureBox, mouth: FeatureBox };
        setFeatureBoxes(features);
        const isMoving = aiEngineRef.current.isMouthMoving(results.faces[0]);
        isMouthMovingRef.current = isMoving;
      }

      if (isExamStarted && user?.faceData && aiEngineRef.current) {
        const similarity = aiEngineRef.current.compareFaces(user.faceData as faceMesh.NormalizedLandmark[], results.faces[0]);
        if (similarity < 0.55) addViolation('FACE_NOT_FOUND', 'Unidentified person detected');
      }

      setIsLookingAwayUI(results.lookingAway);
      setIsCenteredUI(results.isCentered);
      setDistanceStatusUI(results.distanceStatus);

      if (isExamStarted) {
        if (results.lookingAway) addViolation('LOOKING_AWAY', 'Focus Lock: Candidate looking away from screen');
        if (!results.isCentered) addViolation('LOOKING_AWAY', 'Position Lock: Candidate head not centered');
        if (results.distanceStatus !== 'OPTIMAL') {
          addViolation('LOOKING_AWAY', `Distance Lock: Candidate is ${results.distanceStatus === 'TOO_CLOSE' ? 'too close to' : 'too far from'} camera`);
        }
      }
    }
  }, [addViolation, isExamStarted, user?.faceData]);

  const detectFrame = useCallback(async function loop() {
    if (isTerminatedRef.current) return;
    if (videoRef.current && aiEngineRef.current) {
      const phones = await aiEngineRef.current.detect(videoRef.current);
      if (isExamStarted && phones && phones.length > 0) {
        const phoneDetected = phones.some(p => p.class === 'cell phone');
        if (phoneDetected) addViolation('MOBILE_PHONE_DETECTED', 'Mobile phone detected in frame');
        const multiplePeople = phones.filter(p => p.class === 'person').length > 1;
        if (multiplePeople) addViolation('MULTIPLE_FACES', 'Multiple people detected in room');
      }
    }
    requestAnimationFrame(loop);
  }, [addViolation, isExamStarted]);

  const initSystems = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      setSystemStatus(prev => ({ ...prev, camera: true, mic: true }));
      if (videoRef.current) videoRef.current.srcObject = stream;

      aiEngineRef.current = new AIEngine(handleAIDetection);
      await aiEngineRef.current.load();
      setSystemStatus(prev => ({ ...prev, ai: true }));

      audioEngineRef.current = new AudioEngine(
        () => {
          setIsVoiceDetectedUI(true);
          setTimeout(() => setIsVoiceDetectedUI(false), 500);
          
          if (isExamStarted && !isTerminatedRef.current && isMouthMovingRef.current) {
            if (!stableVoiceRef.current) stableVoiceRef.current = Date.now();
            else if (Date.now() - stableVoiceRef.current > 2000) {
              addViolation('VOICE_DETECTED', 'Speech detected with mouth movement.');
              stableVoiceRef.current = null;
            }
          } else stableVoiceRef.current = null;
        },
        () => {}
      );
      await audioEngineRef.current.start();
      requestAnimationFrame(detectFrame);
      return stream;
    } catch (err) { console.error(err); return null; }
  }, [addViolation, detectFrame, handleAIDetection, isExamStarted]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    initSystems().then(s => activeStream = s);
    return () => {
      audioEngineRef.current?.stop();
      activeStream?.getTracks().forEach(t => t.stop());
    };
  }, [initSystems]);

  useEffect(() => {
    if (sessionStatus === 'COMPLETED') {
      isTerminatedRef.current = true;
      audioEngineRef.current?.stop();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (!isExamStarted || sessionStatus !== 'EXAM') return;
    const timer = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 0) { setSessionStatus('COMPLETED'); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isExamStarted, sessionStatus, setSessionStatus]);

  const handleStartExam = () => {
    if (!currentExam) return;
    setTimeLeft(currentExam.durationMinutes * 60);
    setIsExamStarted(true);
    document.documentElement.requestFullscreen().catch(console.error);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentExam) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', padding: '3rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>Scheduled Examinations</h1>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {exams.map(exam => (
              <div key={exam.id} style={{ background: '#1e293b', padding: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{exam.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>{exam.description}</p>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> {new Date(exam.scheduledDate).toLocaleDateString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {exam.durationMinutes} Minutes</span>
                  </div>
                </div>
                <button onClick={() => setCurrentExam(exam)} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', border: 'none', borderRadius: '0.75rem', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Select Exam</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div style={{ height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '600px', background: '#1e293b', padding: '3rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '1rem', color: '#3b82f6' }}><Shield size={32} /></div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentExam.title}</h1>
          </div>
          <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <InstructionItem icon={<Maximize size={16} />} text="Full-screen mode is required throughout the exam." />
            <InstructionItem icon={<Video size={16} />} text="AI Focus Lock: Gaze tracking and position monitoring active." />
            <InstructionItem icon={<Mic size={16} />} text="Audio environment is monitored for suspicious sounds." />
          </div>
          <button onClick={handleStartExam} disabled={!systemStatus.camera || !systemStatus.ai} style={{ width: '100%', padding: '1.125rem', background: systemStatus.camera ? '#3b82f6' : '#334155', border: 'none', borderRadius: '1rem', color: 'white', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Play size={20} fill="currentColor" /> Start Examination
          </button>
        </motion.div>
      </div>
    );
  }

  const q = shuffledQuestions[currentQuestionIdx];

  return (
    <div className="dashboard-layout" style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'white' }}>
      <header style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#3b82f6' }}><Shield size={20} /></div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{currentExam.title}</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>USER: {user?.name} • SESSION: {sessionId}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Time Left</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'monospace' }}>{formatTime(timeLeft)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Trust Score</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: trustScore < 70 ? '#ef4444' : '#10b981' }}>{trustScore}%</div>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', padding: '1rem', overflow: 'hidden' }}>
        <main style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '2.5rem', flex: 1, overflowY: 'auto' }}>
            {q ? (
              <>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#3b82f6', fontWeight: 700 }}>Question {currentQuestionIdx + 1} / {shuffledQuestions.length}</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2.5rem', lineHeight: '1.4' }}>{q.question}</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {q.options.map((opt, idx) => (
                    <button key={idx} onClick={() => setAnswers({...answers, [currentQuestionIdx]: idx})} style={{ padding: '1.25rem', background: answers[currentQuestionIdx] === idx ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${answers[currentQuestionIdx] === idx ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, borderRadius: '1rem', color: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: answers[currentQuestionIdx] === idx ? '#3b82f6' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{String.fromCharCode(65 + idx)}</div>
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: '4rem' }}>Exam configuration error. Please contact administrator.</div>}
          </div>
          <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between' }}>
            <button disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(p => p - 1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>Previous</button>
            {currentQuestionIdx === shuffledQuestions.length - 1 ? (
              <button onClick={() => setSessionStatus('COMPLETED')} style={{ padding: '0.75rem 2rem', background: '#10b981', border: 'none', borderRadius: '0.75rem', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Submit Exam</button>
            ) : (
              <button onClick={() => setCurrentQuestionIdx(p => p + 1)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Next Question <ChevronRight size={18} /></button>
            )}
          </div>
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ flex: 1, background: '#000', borderRadius: '1.5rem', overflow: 'hidden', position: 'relative' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {featureBoxes && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', left: `${featureBoxes.leftEye.x * 100}%`, top: `${featureBoxes.leftEye.y * 100}%`, width: `${featureBoxes.leftEye.width * 100}%`, height: `${featureBoxes.leftEye.height * 100}%`, border: '1px solid #3b82f6' }} />
                <div style={{ position: 'absolute', left: `${featureBoxes.rightEye.x * 100}%`, top: `${featureBoxes.rightEye.y * 100}%`, width: `${featureBoxes.rightEye.width * 100}%`, height: `${featureBoxes.rightEye.height * 100}%`, border: '1px solid #3b82f6' }} />
              </div>
            )}
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(16, 185, 129, 0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900 }}>LIVE_PROCTOR_SYNC</div>
            
            {/* Visual Warnings Overlay */}
            {(distanceStatusUI !== 'OPTIMAL' || isLookingAwayUI || !isCenteredUI) && (
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', background: 'rgba(239, 68, 68, 0.9)', padding: '0.6rem', borderRadius: '0.75rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 900, color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                {distanceStatusUI === 'TOO_CLOSE' ? 'MOVE FURTHER BACK' : 
                 distanceStatusUI === 'TOO_FAR' ? 'MOVE CLOSER' : 
                 !isCenteredUI ? 'CENTER YOUR HEAD' : 'EYE FOCUS LOST'}
              </div>
            )}

            {/* Voice Detection HUD */}
            {isVoiceDetectedUI && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', top: '3rem', right: '1rem', background: 'rgba(239, 68, 68, 0.8)', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mic size={12} /> VOICE_DETECTED
              </motion.div>
            )}
          </div>
          <div style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Environment Analysis</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <StatusRow label="Gaze Tracking" active={!isLookingAwayUI} />
              <StatusRow label="Distance Lock" active={distanceStatusUI === 'OPTIMAL'} />
              <StatusRow label="Voice Monitor" active={!isVoiceDetectedUI} />
              <StatusRow label="Neural Match" active={true} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const StatusRow: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
    <span style={{ color: '#94a3b8' }}>{label}</span>
    <span style={{ color: active ? '#10b981' : '#ef4444', fontWeight: 800 }}>{active ? 'OK' : 'VIOLATION'}</span>
  </div>
);

const InstructionItem: React.FC<{ icon: React.ReactNode, text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1' }}>
    <div style={{ color: '#3b82f6' }}>{icon}</div>
    <p style={{ margin: 0, fontSize: '0.875rem' }}>{text}</p>
  </div>
);
