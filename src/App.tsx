import { ProctoringProvider, useProctoringContext } from './context/ProctoringContext'
import { Login } from './pages/Login'
import { Verification } from './pages/Verification'
import { Dashboard as StudentDashboard } from './pages/StudentDashboard'
import { Report } from './pages/Report'
import { AdminDashboard } from './pages/AdminDashboard'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'

function AppContent() {
  const { sessionStatus } = useProctoringContext();

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {sessionStatus === 'LOGIN' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Login />
          </motion.div>
        )}
        {sessionStatus === 'VERIFICATION' && (
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Verification />
          </motion.div>
        )}
        {sessionStatus === 'EXAM' && (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StudentDashboard />
          </motion.div>
        )}
        {sessionStatus === 'COMPLETED' && (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Report />
          </motion.div>
        )}
        {sessionStatus === 'ADMIN' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function App() {
  return (
    <ProctoringProvider>
      <AppContent />
    </ProctoringProvider>
  )
}

export default App
