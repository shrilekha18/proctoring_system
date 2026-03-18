import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MonitorData {
  user: { name: string; email: string };
  violations: any[];
  trustScore: number;
  status: string;
  timestamp: number;
}

export const AdminDashboard: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<Record<string, MonitorData>>({});
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('proctor_monitor');
    
    channel.onmessage = (event) => {
      const data: MonitorData = event.data;
      setActiveSessions(prev => ({
        ...prev,
        [data.user.email]: data
      }));
    };

    return () => channel.close();
  }, []);

  const sessionList = Object.values(activeSessions).sort((a, b) => b.timestamp - a.timestamp);
  const currentSession = selectedSession ? activeSessions[selectedSession] : null;

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh' }}>
        <aside style={{ background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#3b82f6', padding: '0.5rem', borderRadius: '0.5rem' }}>
              <Shield size={20} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Admin Command</h2>
          </div>

          <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              Live Sessions ({sessionList.length})
            </div>
            
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {sessionList.map(session => (
                <button
                  key={session.user.email}
                  onClick={() => setSelectedSession(session.user.email)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: selectedSession === session.user.email ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    border: `1px solid ${selectedSession === session.user.email ? '#3b82f6' : 'transparent'}`,
                    borderRadius: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>{session.user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{session.status}</span>
                    <span style={{ color: session.trustScore < 70 ? '#ef4444' : '#10b981' }}>{session.trustScore}% Trust</span>
                  </div>
                </button>
              ))}
              {sessionList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: '0.875rem' }}>
                  Waiting for active sessions...
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ overflowY: 'auto' }}>
          {currentSession ? (
            <div style={{ padding: '2rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>{currentSession.user.name}</h1>
                  <p style={{ color: '#94a3b8' }}>{currentSession.user.email} • ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '1rem', textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Trust Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: currentSession.trustScore < 70 ? '#ef4444' : '#10b981' }}>{currentSession.trustScore}%</div>
                  </div>
                </div>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
                <section>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} color="#3b82f6" /> Live Intelligence Feed
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <AnimatePresence initial={false}>
                      {currentSession.violations.map(v => (
                        <motion.div
                          key={v.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            padding: '1.25rem',
                            background: '#0f172a',
                            borderLeft: '4px solid #ef4444',
                            borderRadius: '0.75rem',
                            borderTop: '1px solid #1e293b',
                            borderRight: '1px solid #1e293b',
                            borderBottom: '1px solid #1e293b',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', fontSize: '0.75rem' }}>{v.type.replace(/_/g, ' ')}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(v.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9375rem', color: '#cbd5e1' }}>{v.message}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {currentSession.violations.length === 0 && (
                      <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px dashed #1e293b' }}>
                        <Shield size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ color: '#64748b' }}>No behavioral anomalies detected yet.</p>
                      </div>
                    )}
                  </div>
                </section>

                <aside>
                  <div style={{ background: '#0f172a', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #1e293b' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Session Details</h3>
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                      <DetailRow icon={<Clock size={16} />} label="Start Time" value={new Date(currentSession.timestamp).toLocaleTimeString()} />
                      <DetailRow icon={<Activity size={16} />} label="AI Status" value="Monitoring Active" color="#10b981" />
                      <DetailRow icon={<AlertTriangle size={16} />} label="Critical Alerts" value={currentSession.violations.filter(v => v.trustScore < 5).length.toString()} />
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <Shield size={64} style={{ marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select a candidate to monitor</h2>
              <p>Real-time surveillance data will appear here.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ icon: any, label: string, value: string, color?: string }> = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', fontSize: '0.875rem' }}>
      {icon} <span>{label}</span>
    </div>
    <span style={{ fontWeight: 600, color: color || 'white', fontSize: '0.875rem' }}>{value}</span>
  </div>
);
