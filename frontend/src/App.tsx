import React, { useState } from 'react';
import { AuthModule } from './modules/auth/AuthModule';
import { PrescriptionModule } from './modules/prescription/PrescriptionModule';
import { LibraryModule } from './modules/library/LibraryModule';
import { GameModule } from './modules/game/GameModule';
import { LoggerModule } from './modules/logger/LoggerModule';
import { AnalyticsModule } from './modules/analytics/AnalyticsModule';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auth' | 'prescription' | 'library' | 'game' | 'logger' | 'analytics'>('auth');

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span>PhysioSystem</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', color: '#475569' }}>
            6-Module Workspace
          </span>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => setActiveTab('auth')}
          >
            1. Auth & Intake
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'prescription' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescription')}
          >
            2. Prescriptions
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            3. Video Library
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => setActiveTab('game')}
          >
            4. Rehab Game
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'logger' ? 'active' : ''}`}
            onClick={() => setActiveTab('logger')}
          >
            5. Activity Logger
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            6. Analytics
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'auth' && <AuthModule />}
        {activeTab === 'prescription' && <PrescriptionModule />}
        {activeTab === 'library' && <LibraryModule />}
        {activeTab === 'game' && <GameModule />}
        {activeTab === 'logger' && <LoggerModule />}
        {activeTab === 'analytics' && <AnalyticsModule />}
      </main>
    </div>
  );
};

export default App;
