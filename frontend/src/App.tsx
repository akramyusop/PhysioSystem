import React, { useState } from 'react';
import { AuthModule } from './modules/auth/AuthModule';
import { PrescriptionModule } from './modules/prescription/PrescriptionModule';
import { LibraryModule } from './modules/library/LibraryModule';
import { GameModule } from './modules/game/GameModule';
import { LoggerModule } from './modules/logger/LoggerModule';
import { AnalyticsModule } from './modules/analytics/AnalyticsModule';
import { AuthUser } from './types';

export const App: React.FC = () => {
  // Current logged in user (null = show Login Page)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>({
    id: 1,
    username: 'doctor_chen',
    full_name: 'Dr. Sarah Chen, MD',
    role: 'doctor',
    avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
  });

  const [activeTab, setActiveTab] = useState<'prescription' | 'library' | 'game' | 'logger' | 'analytics'>('game');

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'patient') {
      setActiveTab('game'); // Patients land directly on their Rehab Game or Video Library
    } else {
      setActiveTab('prescription'); // Doctors land on Prescriptions or Analytics
    }
  };

  // 1. If not logged in, render the clean Login Page (Module 1) with no menu tabs
  if (!currentUser) {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="nav-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>PhysioSystem</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            Secure Clinical Sign-In
          </span>
        </header>

        <main className="main-content">
          <AuthModule onLoginSuccess={handleLoginSuccess} />
        </main>
      </div>
    );
  }

  // 2. If logged in, render the Role-Adapted Navbar & Main Workspace
  const isDoctor = currentUser.role === 'doctor';
  const isPatient = currentUser.role === 'patient';

  return (
    <div className="app-container">
      <header className="navbar">
        {/* Brand */}
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>PhysioSystem</span>
        </div>

        {/* Dynamic Navigation Tabs (Module 1 is NOT here - it's the login screen!) */}
        <nav className="nav-tabs">
          {/* Only doctors can prescribe treatment plans */}
          {isDoctor && (
            <button
              className={`nav-tab-btn ${activeTab === 'prescription' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescription')}
            >
              📋 Prescriptions
            </button>
          )}

          <button
            className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            {isPatient ? '📹 My Exercise Guides' : '📚 Exercise Library'}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => setActiveTab('game')}
          >
            {isPatient ? '🎮 My Rehab Game' : '🎮 Rehab Game Engine'}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'logger' ? 'active' : ''}`}
            onClick={() => setActiveTab('logger')}
          >
            {isPatient ? '📝 Log My Pain & Sets' : '🩺 Activity & Vital Logs'}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            {isPatient ? '📈 My Recovery Progress' : '📊 Recovery Analytics'}
          </button>
        </nav>

        {/* User Profile & Logout Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser.avatar_url && (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid ' + (isDoctor ? '#0284c7' : '#16a34a'),
              }}
            />
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
              {currentUser.full_name}
            </div>
            <span
              className="tag"
              style={{
                fontSize: '0.68rem',
                background: isDoctor ? '#e0f2fe' : '#dcfce7',
                color: isDoctor ? '#0369a1' : '#166534',
                fontWeight: 700,
              }}
            >
              {isDoctor ? '🩺 DOCTOR' : '🏃 PATIENT'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of account"
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace content */}
      <main className="main-content">
        {activeTab === 'prescription' && isDoctor && <PrescriptionModule />}
        {activeTab === 'library' && <LibraryModule currentUser={currentUser} />}
        {activeTab === 'game' && <GameModule currentUser={currentUser} />}
        {activeTab === 'logger' && <LoggerModule />}
        {activeTab === 'analytics' && <AnalyticsModule />}
      </main>
    </div>
  );
};

export default App;