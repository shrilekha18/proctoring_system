import React, { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';

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
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  faceData?: unknown;
  multiViewData?: {
    center?: unknown;
    left?: unknown;
    right?: unknown;
  };
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  scheduledDate: string; 
  durationMinutes: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: number;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export type SessionStatus = 'LOGIN' | 'VERIFICATION' | 'EXAM' | 'COMPLETED' | 'ADMIN';

interface ProctoringContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  auditLogs: AuditLog[];
  addAuditLog: (action: string, actor: string, details: string, severity?: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  violations: Violation[];
  addViolation: (type: ViolationType, message: string) => void;
  trustScore: number;
  sessionStatus: SessionStatus;
  setSessionStatus: (status: SessionStatus) => void;
  startTime: number | null;
  endTime: number | null;
  startSession: () => void;
  resetSession: () => void;
  currentExam: Exam | null;
  setCurrentExam: (exam: Exam | null) => void;
}

const ProctoringContext = createContext<ProctoringContextType | undefined>(undefined);

const INITIAL_QUESTIONS: Question[] = [
  { id: 1, question: "Which of the following is a core principle of Biometric Security?", options: ["Something you know", "Something you have", "Something you are", "Something you do"], correct: 2 },
  { id: 2, question: "In computer vision, what does 'Yaw' represent in head pose estimation?", options: ["Up and down movement", "Side to side rotation", "Tilting left or right", "Forward and backward movement"], correct: 1 },
  { id: 3, question: "What is the primary purpose of an AnalyserNode in Web Audio API?", options: ["To play sound files", "To apply reverb effects", "To provide real-time frequency and time-domain analysis", "To record audio streams"], correct: 2 },
  { id: 4, question: "Which MediaPipe model is optimized for 468 3D face landmarks?", options: ["Hands", "Pose", "Face Mesh", "Holistic"], correct: 2 }
];

export const ProctoringProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('proctor_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('proctor_exams');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        title: 'Biometric Security 101',
        description: 'Advanced computer vision and audio analysis test.',
        questions: INITIAL_QUESTIONS,
        scheduledDate: new Date().toISOString(),
        durationMinutes: 60
      }
    ];
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('proctor_audit');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [trustScore, setTrustScore] = useState(100);
  const [sessionStatus, setSessionStatusInternal] = useState<SessionStatus>('LOGIN');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => { localStorage.setItem('proctor_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('proctor_exams', JSON.stringify(exams)); }, [exams]);
  useEffect(() => { localStorage.setItem('proctor_audit', JSON.stringify(auditLogs)); }, [auditLogs]);

  const addAuditLog = useCallback((action: string, actor: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    const log: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      action, actor, details, severity,
      timestamp: Date.now()
    };
    setAuditLogs(prev => [log, ...prev].slice(0, 1000)); // Keep last 1000
  }, []);

  const setSessionStatus = useCallback((status: SessionStatus) => {
    setSessionStatusInternal(status);
    if (status === 'COMPLETED') setEndTime(Date.now());
  }, []);

  useEffect(() => {
    if (user && sessionStatus !== 'ADMIN') {
      const channel = new BroadcastChannel('proctor_monitor');
      const syncData = () => {
        channel.postMessage({
          user, violations, trustScore, status: sessionStatus,
          timestamp: Date.now(), startTime, examTitle: currentExam?.title
        });
      };
      syncData();
      const interval = setInterval(syncData, 2000);
      return () => { clearInterval(interval); channel.close(); };
    }
  }, [user, violations, trustScore, sessionStatus, startTime, currentExam]);

  const addViolation = useCallback((type: ViolationType, message: string) => {
    if (sessionStatus === 'COMPLETED') return;
    setViolations((prev) => {
      const count = prev.filter(v => v.type === type).length + 1;
      const newViolation: Violation = {
        id: Math.random().toString(36).substr(2, 9),
        type, timestamp: Date.now(),
        message: count < 3 && (type === 'VOICE_DETECTED' || type === 'MOBILE_PHONE_DETECTED') 
          ? `${message} (Warning ${count}/2)` : message,
      };
      const updatedViolations = [newViolation, ...prev];
      setTrustScore((score) => Math.max(0, score - 5));
      if ((type === 'VOICE_DETECTED' || type === 'MOBILE_PHONE_DETECTED') && count >= 3) {
        setSessionStatus('COMPLETED');
        addAuditLog('SESSION_TERMINATED', 'AI_ENGINE', `Critical violation strike limit reached for ${user?.email}`, 'CRITICAL');
      }
      return updatedViolations;
    });
  }, [sessionStatus, setSessionStatus, addAuditLog, user?.email]);

  const startSession = () => {
    setStartTime(Date.now());
    setEndTime(null);
    setSessionStatus('EXAM');
    addAuditLog('EXAM_STARTED', user?.email || 'unknown', `Started exam: ${currentExam?.title}`, 'INFO');
  };

  const resetSession = () => {
    setUser(null);
    setViolations([]);
    setTrustScore(100);
    setSessionStatus('LOGIN');
    setStartTime(null);
    setEndTime(null);
    setCurrentExam(null);
  };

  return (
    <ProctoringContext.Provider value={{
      user, setUser, users, setUsers, exams, setExams, auditLogs, addAuditLog,
      violations, addViolation, trustScore, sessionStatus, setSessionStatus,
      startTime, endTime, startSession, resetSession, currentExam, setCurrentExam
    }}>
      {children}
    </ProctoringContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProctoringContext = () => {
  const context = useContext(ProctoringContext);
  if (context === undefined) throw new Error('useProctoringContext must be used within a ProctoringProvider');
  return context;
};
