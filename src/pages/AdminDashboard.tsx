import React, { useEffect, useState, useMemo } from 'react';
import { Shield, Activity, Clock, Mail, Users, BookOpen, Plus, Trash2, Edit2, Calendar, BarChart3, FileText, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProctoringContext, type User as ProctorUser, type Exam, type AuditLog } from '../context/ProctoringContext';

interface Violation {
  id: string;
  type: string;
  timestamp: number;
  message: string;
}

interface MonitorData {
  user: { 
    name: string; 
    email: string;
    multiViewData?: {
      center?: unknown;
      left?: unknown;
      right?: unknown;
    }
  };
  violations: Violation[];
  trustScore: number;
  status: string;
  timestamp: number;
  startTime: number | null;
  examTitle?: string;
}

export const AdminDashboard: React.FC = () => {
  const { users, setUsers, exams, setExams, auditLogs, addAuditLog } = useProctoringContext();
  const [activeSessions, setActiveSessions] = useState<Record<string, MonitorData>>({});
  const [selectedSessionEmail, setSelectedSessionEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'USERS' | 'EXAMS' | 'ANALYTICS' | 'AUDIT'>('MONITOR');

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProctorUser | null>(null);
  const [userForm, setUserForm] = useState<{ name: string; email: string; role: 'STUDENT' | 'ADMIN' }>({ name: '', email: '', role: 'STUDENT' });

  // Exam Management State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState({ title: '', description: '', scheduledDate: '', durationMinutes: 60 });

  useEffect(() => {
    const channel = new BroadcastChannel('proctor_monitor');
    channel.onmessage = (event) => {
      const data: MonitorData = event.data;
      setActiveSessions(prev => ({ ...prev, [data.user.email]: data }));
    };
    return () => channel.close();
  }, []);

  const sessionList = Object.values(activeSessions).sort((a, b) => b.timestamp - a.timestamp);
  const currentSession = selectedSessionEmail ? activeSessions[selectedSessionEmail] : null;

  const handleAddUser = () => {
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u));
      addAuditLog('USER_UPDATED', 'ADMIN', `Updated user: ${userForm.email}`, 'INFO');
    } else {
      const newUser: ProctorUser = {
        id: Math.random().toString(36).substr(2, 9),
        name: userForm.name,
        email: userForm.email,
        role: userForm.role
      };
      setUsers([...users, newUser]);
      addAuditLog('USER_CREATED', 'ADMIN', `Created new user: ${userForm.email}`, 'INFO');
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: 'STUDENT' });
  };

  const handleAddExam = () => {
    if (editingExam) {
      setExams(exams.map(e => e.id === editingExam.id ? { ...e, ...examForm, scheduledDate: new Date(examForm.scheduledDate).toISOString() } : e));
      addAuditLog('EXAM_UPDATED', 'ADMIN', `Updated exam: ${examForm.title}`, 'INFO');
    } else {
      const newExam: Exam = {
        id: Math.random().toString(36).substr(2, 9),
        title: examForm.title,
        description: examForm.description,
        scheduledDate: new Date(examForm.scheduledDate).toISOString(),
        durationMinutes: examForm.durationMinutes,
        questions: []
      };
      setExams([...exams, newExam]);
      addAuditLog('EXAM_CREATED', 'ADMIN', `Created new exam: ${examForm.title}`, 'INFO');
    }
    setIsExamModalOpen(false);
    setEditingExam(null);
    setExamForm({ title: '', description: '', scheduledDate: '', durationMinutes: 60 });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', display: 'flex', width: '100%' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#3b82f6', marginBottom: '2rem' }}>
            <Shield size={28} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: 'white' }}>SafeProctor</h2>
          </div>
          <nav style={{ display: 'grid', gap: '0.25rem' }}>
            <NavButton active={activeTab === 'MONITOR'} onClick={() => setActiveTab('MONITOR')} icon={<Activity size={18} />} label="Live Monitor" />
            <NavButton active={activeTab === 'ANALYTICS'} onClick={() => setActiveTab('ANALYTICS')} icon={<BarChart3 size={18} />} label="Analytics" />
            <NavButton active={activeTab === 'AUDIT'} onClick={() => setActiveTab('AUDIT')} icon={<FileText size={18} />} label="Audit Logs" />
            <div style={{ height: '1rem' }} />
            <NavButton active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<Users size={18} />} label="Users" />
            <NavButton active={activeTab === 'EXAMS'} onClick={() => setActiveTab('EXAMS')} icon={<BookOpen size={18} />} label="Exams" />
          </nav>
        </div>
        {activeTab === 'MONITOR' && (
          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '1rem' }}>Candidates</div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {sessionList.map(session => (
                <button
                  key={session.user.email}
                  onClick={() => setSelectedSessionEmail(session.user.email)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', textAlign: 'left', cursor: 'pointer', border: 'none',
                    background: selectedSessionEmail === session.user.email ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: 'inherit', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>{session.user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: session.trustScore < 70 ? '#ef4444' : '#10b981' }}>{session.trustScore}% Integrity</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2.5rem' }}>
        {activeTab === 'MONITOR' && (
          currentSession ? <MonitorView currentSession={currentSession} /> : <EmptyState icon={<Activity size={48} />} title="Monitoring Stream" description="Select a candidate to view real-time proctoring data." />
        )}
        {activeTab === 'ANALYTICS' && <AnalyticsView activeSessions={activeSessions} users={users} />}
        {activeTab === 'AUDIT' && <AuditLogsView logs={auditLogs} />}
        {activeTab === 'USERS' && (
          <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>User Management</h1>
              <button onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', role: 'STUDENT' }); setIsUserModalOpen(true); }} style={actionButtonStyle}><Plus size={18} /> Add User</button>
            </header>
            <div style={{ background: '#0f172a', borderRadius: '1rem', border: '1px solid #1e293b', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem' }}>Name</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Email</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Role</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid #1e293b' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>{u.name}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem 1.5rem' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: u.role === 'ADMIN' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: u.role === 'ADMIN' ? '#3b82f6' : '#10b981', fontSize: '0.7rem', fontWeight: 800 }}>{u.role}</span></td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setEditingUser(u); setUserForm({ name: u.name, email: u.email, role: u.role }); setIsUserModalOpen(true); }} style={iconButtonStyle}><Edit2 size={14} /></button>
                          <button onClick={() => { setUsers(users.filter(x => x.id !== u.id)); addAuditLog('USER_DELETED', 'ADMIN', `Deleted user: ${u.email}`, 'WARNING'); }} style={{ ...iconButtonStyle, color: '#ef4444' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'EXAMS' && (
          <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Exam Management</h1>
              <button onClick={() => { setEditingExam(null); setExamForm({ title: '', description: '', scheduledDate: '', durationMinutes: 60 }); setIsExamModalOpen(true); }} style={actionButtonStyle}><Plus size={18} /> Create Exam</button>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {exams.map(exam => (
                <div key={exam.id} style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{exam.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setEditingExam(exam); setExamForm({ title: exam.title, description: exam.description, scheduledDate: exam.scheduledDate.split('T')[0], durationMinutes: exam.durationMinutes }); setIsExamModalOpen(true); }} style={iconButtonStyle}><Edit2 size={14} /></button>
                      <button onClick={() => { setExams(exams.filter(x => x.id !== exam.id)); addAuditLog('EXAM_DELETED', 'ADMIN', `Deleted exam: ${exam.title}`, 'WARNING'); }} style={{ ...iconButtonStyle, color: '#ef4444' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '1.5rem', height: '3.2rem', overflow: 'hidden' }}>{exam.description}</p>
                  <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> {new Date(exam.scheduledDate).toLocaleDateString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={14} /> {exam.durationMinutes} Minutes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isUserModalOpen && (
        <Modal title={editingUser ? "Edit User" : "Add New User"} onClose={() => setIsUserModalOpen(false)}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Input label="Full Name" value={userForm.name} onChange={v => setUserForm({ ...userForm, name: v })} />
            <Input label="Email Address" value={userForm.email} onChange={v => setUserForm({ ...userForm, email: v })} />
            <label style={labelStyle}>Role</label>
            <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as 'STUDENT' | 'ADMIN' })} style={selectStyle}>
              <option value="STUDENT">Student</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button onClick={handleAddUser} style={{ ...submitButtonStyle, marginTop: '1rem' }}>{editingUser ? 'Update User' : 'Add User'}</button>
          </div>
        </Modal>
      )}

      {isExamModalOpen && (
        <Modal title={editingExam ? "Edit Exam" : "Create New Exam"} onClose={() => setIsExamModalOpen(false)}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Input label="Exam Title" value={examForm.title} onChange={v => setExamForm({ ...examForm, title: v })} />
            <Input label="Description" value={examForm.description} onChange={v => setExamForm({ ...examForm, description: v })} />
            <Input label="Scheduled Date" type="date" value={examForm.scheduledDate} onChange={v => setExamForm({ ...examForm, scheduledDate: v })} />
            <Input label="Duration (Minutes)" type="number" value={examForm.durationMinutes.toString()} onChange={v => setExamForm({ ...examForm, durationMinutes: parseInt(v) || 0 })} />
            <button onClick={handleAddExam} style={{ ...submitButtonStyle, marginTop: '1rem' }}>{editingExam ? 'Update Exam' : 'Create Exam'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- Views & Components ---

const AnalyticsView: React.FC<{ activeSessions: Record<string, MonitorData>, users: ProctorUser[] }> = ({ activeSessions, users }) => {
  const sessions = Object.values(activeSessions);
  const avgTrust = useMemo(() => sessions.length ? Math.round(sessions.reduce((a, b) => a + b.trustScore, 0) / sessions.length) : 100, [sessions]);
  const totalViolations = useMemo(() => sessions.reduce((a, b) => a + b.violations.length, 0), [sessions]);
  
  return (
    <div style={{ display: 'grid', gap: '2.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Integrity Analytics</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <MetricBox icon={<TrendingUp size={20} />} label="Avg. Trust Score" value={`${avgTrust}%`} sub="Across active sessions" />
        <MetricBox icon={<AlertTriangle size={20} />} label="Total Warnings" value={totalViolations} sub="Critical behavior alerts" color="#ef4444" />
        <MetricBox icon={<Users size={20} />} label="Registered Users" value={users.length} sub="Managed identities" />
        <MetricBox icon={<ShieldCheck size={20} />} label="Active Stream" value={sessions.length} sub="Synchronized candidates" color="#10b981" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Integrity Distribution</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '150px', padding: '0 1rem' }}>
            {[80, 95, 40, 60, 100, 90, 85].map((h, i) => (
              <div key={i} style={{ flex: 1, background: h < 70 ? '#ef4444' : '#3b82f6', height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
            ))}
          </div>
        </div>
        <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>System Performance</h3>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <ProgressRow label="Neural Engine Load" val={24} />
            <ProgressRow label="Sync Latency" val={12} />
          </div>
        </div>
      </div>
    </div>
  );
};

const AuditLogsView: React.FC<{ logs: AuditLog[] }> = ({ logs }) => (
  <div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>System Audit Logs</h1>
    <div style={{ background: '#0f172a', borderRadius: '1rem', border: '1px solid #1e293b', overflow: 'hidden' }}>
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#1e293b', fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem' }}>Timestamp</th>
              <th style={{ padding: '1rem 1.5rem' }}>Action</th>
              <th style={{ padding: '1rem 1.5rem' }}>Actor</th>
              <th style={{ padding: '1rem 1.5rem' }}>Details</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.8125rem' }}>
            {logs.map(log => (
              <tr key={log.id} style={{ borderTop: '1px solid #1e293b', background: log.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td style={{ padding: '1rem 1.5rem' }}><span style={{ color: log.severity === 'CRITICAL' ? '#ef4444' : log.severity === 'WARNING' ? '#f59e0b' : '#3b82f6', fontWeight: 800 }}>{log.action}</span></td>
                <td style={{ padding: '1rem 1.5rem' }}>{log.actor}</td>
                <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const MonitorView: React.FC<{ currentSession: MonitorData }> = ({ currentSession }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>{currentSession.user.name}</h1>
        <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
          <span><Mail size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {currentSession.user.email}</span>
          <span>•</span>
          <span>{currentSession.examTitle || 'General Assessment'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <StatCard label="Integrity" value={`${currentSession.trustScore}%`} color={currentSession.trustScore < 70 ? '#ef4444' : '#10b981'} />
        <StatCard label="Alerts" value={currentSession.violations.length} color={currentSession.violations.length > 0 ? '#ef4444' : '#10b981'} />
      </div>
    </header>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem' }}>
      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Activity Feed</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {currentSession.violations.map(v => (
            <div key={v.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1rem', borderLeft: `4px solid ${v.type.includes('VOICE') ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>{v.type.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '0.7rem', color: '#475569' }}>{new Date(v.timestamp).toLocaleTimeString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{v.message}</p>
            </div>
          ))}
        </div>
      </section>
      <aside>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #1e293b' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '1.25rem', textTransform: 'uppercase' }}>Session Stats</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <DataRow label="StartTime" value={currentSession.startTime ? new Date(currentSession.startTime).toLocaleTimeString() : 'N/A'} />
            <DataRow label="Verification" value="SUCCESS" color="#10b981" />
          </div>
        </div>
      </aside>
    </div>
  </motion.div>
);

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', border: 'none',
    background: active ? '#3b82f6' : 'transparent', color: active ? 'white' : '#64748b', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s'
  }}>
    {icon} {label}
  </button>
);

const MetricBox: React.FC<{ icon: React.ReactNode, label: string, value: string | number, sub: string, color?: string }> = ({ icon, label, value, sub, color = '#3b82f6' }) => (
  <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #1e293b' }}>
    <div style={{ color, marginBottom: '1rem' }}>{icon}</div>
    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>{value}</div>
    <div style={{ fontSize: '0.65rem', color: '#475569' }}>{sub}</div>
  </div>
);

const ProgressRow: React.FC<{ label: string, val: number }> = ({ label, val }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{val}%</span>
    </div>
    <div style={{ height: '6px', background: '#1e293b', borderRadius: '10px' }}>
      <div style={{ height: '100%', width: `${val}%`, background: '#3b82f6', borderRadius: '10px' }} />
    </div>
  </div>
);

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', width: '100%', maxWidth: '440px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>{title}</h2>
      {children}
      <button onClick={onClose} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
    </motion.div>
  </div>
);

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = 'text' }) => (
  <div style={{ marginBottom: '0.5rem' }}>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
  </div>
);

const StatCard: React.FC<{ label: string, value: string | number, color: string }> = ({ label, value, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid #1e293b', minWidth: '100px' }}>
    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
    <div style={{ fontSize: '1.25rem', fontWeight: 900, color }}>{value}</div>
  </div>
);

const DataRow: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
    <span style={{ color: '#64748b', fontWeight: 700 }}>{label}</span>
    <span style={{ color: color || 'white', fontWeight: 800 }}>{value}</span>
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
    <div style={{ color: '#3b82f6', marginBottom: '1.5rem' }}>{icon}</div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{title}</h2>
    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{description}</p>
  </div>
);

const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid #1e293b', borderRadius: '0.75rem', color: 'white', outline: 'none' };
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' };
const iconButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' };
const actionButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' };
const submitButtonStyle: React.CSSProperties = { width: '100%', padding: '0.875rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer' };
