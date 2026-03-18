import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useProctoringContext } from '../context/ProctoringContext';
import { ShieldCheck, User, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { setUser, setSessionStatus } = useProctoringContext();
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      setUser({ name: formData.name, email: formData.email });
      setSessionStatus('VERIFICATION');
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem',
          borderRadius: '1.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div 
            onDoubleClick={() => setSessionStatus('ADMIN')}
            style={{
              display: 'inline-flex',
              padding: '1rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '1rem',
              marginBottom: '1rem',
              color: '#60a5fa',
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={40} />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>SafeProctor AI</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Secure Intelligent Proctoring System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                required
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 2.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  color: 'white',
                  outline: 'none',
                  fontSize: '0.9375rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Institutional Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                required
                type="email"
                placeholder="john@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 2.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  color: 'white',
                  outline: 'none',
                  fontSize: '0.9375rem'
                }}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(to right, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: '0.75rem',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
            }}
          >
            Enter Safe Zone <ArrowRight size={20} />
          </motion.button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
            By continuing, you agree to our <span style={{ color: '#60a5fa' }}>Ethics Policy</span> and consent to <span style={{ color: '#60a5fa' }}>AI Monitoring</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
