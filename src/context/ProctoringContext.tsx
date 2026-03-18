import React, { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';

// ... (ViolationType and Violation interface remain same)
export type ViolationType = 
  | 'FACE_NOT_FOUND' 
  | 'MULTIPLE_FACES' 
  | 'LOOKING_AWAY' 
  | 'VOICE_DETECTED' 
  | 'MOBILE_PHONE_DETECTED' 
  | 'TAB_SWITCHED'
  | 'FULLSCREEN_EXIT'
  | 'FORBIDDEN_KEY'
  | 'LOW_LIGHT';

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: number;
  message: string;
}

export interface User {
  name: string;
  email: string;
  faceData?: any;
}

interface ProctoringContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  violations: Violation[];
  addViolation: (type: ViolationType, message: string) => void;
  trustScore: number;
  sessionStatus: 'LOGIN' | 'VERIFICATION' | 'EXAM' | 'COMPLETED' | 'ADMIN';
  setSessionStatus: (status: 'LOGIN' | 'VERIFICATION' | 'EXAM' | 'COMPLETED' | 'ADMIN') => void;
  startTime: number | null;
  startSession: () => void;
  resetSession: () => void;
}

const ProctoringContext = createContext<ProctoringContextType | undefined>(undefined);

export const ProctoringProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [trustScore, setTrustScore] = useState(100);
  const [sessionStatus, setSessionStatus] = useState<'LOGIN' | 'VERIFICATION' | 'EXAM' | 'COMPLETED' | 'ADMIN'>('LOGIN');
  const [startTime, setStartTime] = useState<number | null>(null);

  // Sync with Admin Dashboard
  useEffect(() => {
    if (user && sessionStatus !== 'ADMIN') {
      const channel = new BroadcastChannel('proctor_monitor');
      const syncData = () => {
        channel.postMessage({
          user,
          violations,
          trustScore,
          status: sessionStatus,
          timestamp: Date.now()
        });
      };
      
      syncData();
      const interval = setInterval(syncData, 2000); // Heartbeat
      
      return () => {
        clearInterval(interval);
        channel.close();
      };
    }
  }, [user, violations, trustScore, sessionStatus]);

  const addViolation = useCallback((type: ViolationType, message: string) => {
    const newViolation: Violation = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      message,
    };
    
    setViolations((prev) => [newViolation, ...prev]);
    setTrustScore((prev) => Math.max(0, prev - 5));
  }, []);

  const startSession = () => {
    setStartTime(Date.now());
    setSessionStatus('EXAM');
  };

  const resetSession = () => {
    setUser(null);
    setViolations([]);
    setTrustScore(100);
    setSessionStatus('LOGIN');
    setStartTime(null);
  };

  return (
    <ProctoringContext.Provider value={{
      user, setUser, violations, addViolation, trustScore, 
      sessionStatus, setSessionStatus, startTime, startSession, resetSession
    }}>
      {children}
    </ProctoringContext.Provider>
  );
};

export const useProctoringContext = () => {
  const context = useContext(ProctoringContext);
  if (context === undefined) {
    throw new Error('useProctoringContext must be used within a ProctoringProvider');
  }
  return context;
};
