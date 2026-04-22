# SafeProctor AI - Advanced AI Proctoring System

SafeProctor AI is a high-fidelity, real-time proctoring solution built with React, TypeScript, and MediaPipe. It leverages advanced computer vision and audio analysis to ensure examination integrity through multi-layered behavioral monitoring.

![SafeProctor AI Shield](https://img.shields.io/badge/Security-Strict-blue)
![AI Engine](https://img.shields.io/badge/AI_Engine-MediaPipe-green)
![Build](https://img.shields.io/badge/Build-Production_Ready-orange)

## 🚀 Key Features

### 🛡️ Intelligent AI Monitoring
- **Gaze Focus Lock**: High-precision iris tracking to ensure the candidate remains focused on the exam screen.
- **Face & Position Lock**: Real-time centering and distance monitoring (1-2 feet) using biometric scaling.
- **Voice Detection**: Advanced audio frequency analysis to detect suspicious speaking or background noise.
- **Object Detection**: TensorFlow COCO-SSD integration to identify unauthorized objects like mobile phones.

### 🔐 Secure Authentication
- **Dual Login Modes**: Dedicated entry points for Candidates and Administrators.
- **Multi-Factor Verification**: 6-digit OTP email verification and institutional domain validation (.edu, .gov).
- **Admin Access Control**: Password-protected dashboard for central monitoring.

### 📊 Admin Command Center
- **Live Intelligence Feed**: Real-time log stream of all candidate behaviors across active sessions.
- **Integrity Analytics**: Visualized distribution of trust scores and system performance metrics.
- **Audit Logs**: Comprehensive tracking of every administrative and security event.
- **Resource Management**: Complete CRUD operations for User management and Exam scheduling.

### 📝 Exam Integrity Suite
- **Restriction Protocol**: Strictly disables Right-click, Copy, Paste, and monitors Tab switching.
- **Three-Strike Logic**: Automated warning system for minor infractions before session termination.
- **Dynamic Shuffling**: Unique question randomization for every candidate.

## 🛠️ Technical Stack
- **Frontend**: React 19 (TypeScript), Vite
- **AI/ML**: MediaPipe (Face Mesh), TensorFlow.js (COCO-SSD)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Styling**: Modern CSS3 (Glassmorphism architecture)

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/shrilekha18/proctoring_system.git

# Navigate to the project folder
cd proctoring-app

# Install dependencies
npm install
```

### Development
```bash
# Start the development server
npm run dev
```

### Production Build
```bash
# Generate production-ready assets
npm run build
```

## 🔐 Administrative Credentials (Prototype)
- **Admin Email**: `admin@safeproctor.edu`
- **Security Key**: `admin123`
- **Student OTP (Prototype)**: `123456`

---
*SafeProctor AI is designed for modern educational institutions requiring high-integrity digital assessments.*
