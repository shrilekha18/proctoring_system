import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProctoringContext } from '../context/ProctoringContext';
import { Trophy, AlertTriangle, Clock, RefreshCcw, FileText, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Report: React.FC = () => {
  const { user, violations, trustScore, startTime, endTime, resetSession } = useProctoringContext();
  
  const { minutes, seconds } = useMemo(() => {
    const duration = (startTime && endTime) ? Math.floor((endTime - startTime) / 1000) : 0;
    return {
      minutes: Math.floor(duration / 60),
      seconds: duration % 60
    };
  }, [startTime, endTime]);

  useEffect(() => {
    if (trustScore > 80) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#ffffff']
      });
    }
  }, [trustScore]);

  const verdict = useMemo(() => {
    if (trustScore >= 90) return { label: 'Excellent Integrity', color: '#10b981', desc: 'No significant suspicious behavior detected.' };
    if (trustScore >= 70) return { label: 'Good Integrity', color: '#3b82f6', desc: 'Minor warnings issued but overall compliant.' };
    if (trustScore >= 50) return { label: 'Needs Review', color: '#f59e0b', desc: 'Multiple violations detected. Subject to manual review.' };
    return { label: 'Integrity Failed', color: '#ef4444', desc: 'Serious proctoring violations detected. Action required.' };
  }, [trustScore]);

  return (
    <div className="report-screen" style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      padding: '3rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ maxWidth: '800px', width: '100%' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            marginBottom: '1.5rem',
            color: verdict.color,
            boxShadow: `0 0 30px ${verdict.color}33`
          }}>
            <Trophy size={48} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Exam Completed</h1>
          <p style={{ color: '#94a3b8' }}>Proctoring session for <strong>{user?.email}</strong> ended.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Final Trust Score</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: verdict.color }}>{trustScore}%</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: verdict.color, marginTop: '0.5rem' }}>{verdict.label}</div>
          </div>

          <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <StatItem icon={<Clock size={18} />} label="Session Duration" value={`${minutes}m ${seconds}s`} />
              <StatItem icon={<AlertTriangle size={18} />} label="Total Violations" value={violations.length.toString()} />
              <StatItem icon={<CheckCircle size={18} />} label="Verification" value="PASSED" color="#10b981" />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} color="#3b82f6" /> Behavioral Analysis Summary
          </h3>
          
          <div className="violation-timeline" style={{ display: 'grid', gap: '1rem' }}>
            {violations.length === 0 ? (
              <div style={{ color: '#10b981', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '1rem', textAlign: 'center' }}>
                Perfect session! No violations were recorded.
              </div>
            ) : (
              violations.slice(0, 5).map((v) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '0.75rem', borderLeft: '4px solid #ef4444' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v.type.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{v.message}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            {violations.length > 5 && (
              <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#64748b' }}>
                + {violations.length - 5} more records in detailed log
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => window.print()}
            style={{
              flex: 1,
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            Download Report
          </button>
          <button
            onClick={resetSession}
            style={{
              flex: 1,
              padding: '1rem',
              background: '#3b82f6',
              borderRadius: '1rem',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCcw size={18} /> New Session
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode, label: string, value: string, color?: string }> = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
      {icon}
      <span style={{ fontSize: '0.9375rem' }}>{label}</span>
    </div>
    <span style={{ fontWeight: 600, color: color || 'white' }}>{value}</span>
  </div>
);
