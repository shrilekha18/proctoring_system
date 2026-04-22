import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProctoringContext } from '../context/ProctoringContext';
import { ShieldCheck, User, Mail, ArrowRight, Key, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

type LoginMode = 'CANDIDATE' | 'ADMIN';
type LoginStep = 'CREDENTIALS' | 'OTP';

export const Login: React.FC = () => {
  const { setUser, setSessionStatus, users } = useProctoringContext();
  const [mode, setMode] = useState<LoginMode>('CANDIDATE');
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const INSTITUTIONAL_DOMAINS = ['.edu', '.ac.in', '.gov', '.org', '.univ'];

  const validateEmail = (email: string) => {
    return INSTITUTIONAL_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
  };

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'ADMIN') {
      if (formData.email === 'admin@safeproctor.edu' && formData.password === 'admin123') {
        setSessionStatus('ADMIN');
      } else {
        setError('Invalid administrator credentials');
      }
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please use a valid institutional email (.edu, .ac.in, etc.)');
      return;
    }

    // Check if user exists in the managed user list (optional, can be more strict)
    // For this prototype, we'll allow new registrations if they have the right domain
    setStep('OTP');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyOtp = async () => {
    setIsVerifying(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const enteredOtp = otp.join('');
    if (enteredOtp === '123456') {
      // Find user or create temporary one
      const existingUser = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase());
      
      setUser({ 
        id: existingUser?.id || Math.random().toString(36).substr(2, 9),
        name: existingUser?.name || formData.name, 
        email: formData.email,
        role: 'STUDENT'
      });
      setSessionStatus('VERIFICATION');
    } else {
      setError('Invalid verification code. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="login-screen" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '1.5rem'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 3rem',
          borderRadius: '2rem',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '1.25rem',
            marginBottom: '1rem',
            color: '#3b82f6'
          }}>
            <ShieldCheck size={44} />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>SafeProctor AI</h1>
          
          {/* Mode Selector */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0,0,0,0.2)', 
            padding: '4px', 
            borderRadius: '0.75rem', 
            marginTop: '1.5rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <button 
              onClick={() => { setMode('CANDIDATE'); setStep('CREDENTIALS'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: mode === 'CANDIDATE' ? '#3b82f6' : 'transparent',
                color: mode === 'CANDIDATE' ? 'white' : '#64748b',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              CANDIDATE
            </button>
            <button 
              onClick={() => { setMode('ADMIN'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: mode === 'ADMIN' ? '#3b82f6' : 'transparent',
                color: mode === 'ADMIN' ? 'white' : '#64748b',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ADMINISTRATOR
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'CREDENTIALS' ? (
            <motion.form 
              key={`${mode}-form`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleCredentialSubmit}
            >
              {mode === 'CANDIDATE' ? (
                <>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Institutional Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@university.edu"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Admin Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="admin@safeproctor.edu"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Security Key</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input
                        required
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button type="submit" style={submitButtonStyle}>
                {mode === 'CANDIDATE' ? 'Begin Verification' : 'Access Dashboard'} <ArrowRight size={18} />
              </button>
            </motion.form>
          ) : (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981', marginBottom: '1rem' }}>
                  <CheckCircle2 size={24} />
                </div>
                <h3 style={{ color: 'white', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Verify Email</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Sent code to <strong>{formData.email}</strong></p>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '2rem' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    style={{
                      width: '3rem',
                      height: '3.5rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      color: 'white',
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ color: '#475569', fontSize: '0.75rem' }}>Prototype Key: <strong style={{ color: '#3b82f6' }}>123456</strong></p>
              </div>

              <button disabled={isVerifying || otp.some(d => !d)} onClick={verifyOtp} style={submitButtonStyle}>
                {isVerifying ? 'Authenticating...' : <>Complete Sign In <Key size={18} /></>}
              </button>

              <button onClick={() => setStep('CREDENTIALS')} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                Change Details
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 1rem 0.875rem 3rem',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '0.875rem',
  color: 'white',
  outline: 'none',
  fontSize: '0.9375rem',
  transition: 'all 0.2s'
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '1rem',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '0.875rem',
  color: 'white',
  fontWeight: 700,
  fontSize: '0.9375rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.6rem',
  boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
};
