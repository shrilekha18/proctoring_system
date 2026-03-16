import React, { useEffect, useRef, useState } from 'react';
import { useProctoring } from '../../hooks/useProctoring';
import { AIEngine, DetectionResult } from '../../utils/ai-engine';
import { AudioEngine } from '../../utils/audio-engine';
import { Shield, AlertTriangle, Mic, Video, Monitor, Phone } from 'lucide-react';
import '../../styles/dashboard.css';

export const Dashboard: React.FC = () => {
  const { violations, status, addViolation, startMonitoring } = useProctoring();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const aiEngineRef = useRef<AIEngine | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Tab switching detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('TAB_SWITCHED', 'User switched tab or minimized window');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [addViolation]);

  const initSystems = async () => {
    if (!videoRef.current) return;

    // Start Webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;

    // Init AI Engine
    aiEngineRef.current = new AIEngine((results) => {
      handleAIDetection(results);
    });
    await aiEngineRef.current.load();

    // Init Audio Engine
    audioEngineRef.current = new AudioEngine(
      (volume) => {
        addViolation('VOICE_DETECTED', `Voice detected (Level: ${Math.round(volume)})`);
      },
      (data) => setAudioData(new Uint8Array(data))
    );
    await audioEngineRef.current.start();

    setIsReady(true);
    startMonitoring();
    requestAnimationFrame(detectFrame);
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
      addViolation('FACE_NOT_FOUND', 'Face not detected');
    } else if (results.faces.length > 1) {
      addViolation('MULTIPLE_FACES', 'Multiple faces detected');
    }

    if (results.lookingAway) {
      addViolation('LOOKING_AWAY', 'User is looking away from the screen');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="main-feed">
        <div className="status-bar">
          <div className="status-indicator">
            <div className={`pulse ${status === 'ALERT' ? 'pulse-alert' : ''}`}></div>
            <span style={{ fontWeight: 600 }}>
              {status === 'IDLE' ? 'System Ready' : status === 'ALERT' ? 'VIOLATION DETECTED' : 'Monitoring Active'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} /> Video ON
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mic size={18} /> Audio ON
            </span>
          </div>
        </div>

        <div className="video-container">
          {!isReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
              <button className="btn btn-primary" onClick={initSystems}>Start Proctoring Session</button>
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} />
        </div>

        <div className="panel">
          <div className="panel-title">Voice Analysis (Real-time)</div>
          <div className="audio-meter">
            {Array.from(audioData).slice(0, 40).map((value, i) => (
              <div 
                key={i} 
                className={`audio-bar ${value > 80 ? 'alert' : ''}`}
                style={{ height: `${(value / 255) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar">
        <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="var(--danger)" /> Violation Log
          </div>
          <div className="violation-list">
            {violations.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>
                No violations detected yet.
              </div>
            ) : (
              violations.map((v) => (
                <div key={v.id} className="violation-item">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--danger)' }}>{v.type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{v.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">System Health</div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>AI Engine</span>
              <span style={{ color: '#10b981' }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Low Light Detection</span>
              <span style={{ color: '#10b981' }}>Optimal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Network Latency</span>
              <span style={{ color: '#10b981' }}>12ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
