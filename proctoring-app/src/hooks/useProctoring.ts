import { useState, useCallback } from 'react';

export type ViolationType = 
  | 'FACE_NOT_FOUND' 
  | 'MULTIPLE_FACES' 
  | 'LOOKING_AWAY' 
  | 'VOICE_DETECTED' 
  | 'MOBILE_PHONE_DETECTED' 
  | 'TAB_SWITCHED'
  | 'HEAD_POSE_VIOLATION';

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: number;
  message: string;
}

export const useProctoring = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'MONITORING' | 'ALERT'>('IDLE');

  const addViolation = useCallback((type: ViolationType, message: string) => {
    const newViolation: Violation = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      message,
    };
    setViolations((prev) => [newViolation, ...prev]);
    setStatus('ALERT');
    
    // Auto reset alert status after 3 seconds
    setTimeout(() => setStatus('MONITORING'), 3000);
  }, []);

  const clearViolations = useCallback(() => {
    setViolations([]);
    setStatus('IDLE');
  }, []);

  const startMonitoring = useCallback(() => {
    setStatus('MONITORING');
  }, []);

  return {
    violations,
    status,
    addViolation,
    clearViolations,
    startMonitoring,
  };
};
