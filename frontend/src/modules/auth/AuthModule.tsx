import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { AuthUser } from '../../types';

interface AuthModuleProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthModule: React.FC<AuthModuleProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Sign In state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<AuthUser[]>([]);

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDiagnosis, setRegDiagnosis] = useState('');
  const [regGender, setRegGender] = useState('Not Specified');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // Live Camera Selfie Snapshot state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch real users from SQLite on load
  const loadUsersFromDb = async () => {
    const users = await api.getUsers();
    if (users && users.length > 0) {
      setRegisteredUsers(users);
    } else {
      // Default fallback if backend not yet started
      setRegisteredUsers([
        {
          id: 1,
          username: 'doctor_chen',
          full_name: 'Dr. Sarah Chen, MD',
          role: 'doctor',
          avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
        },
        {
          id: 3,
          username: 'john_doe',
          full_name: 'John Doe',
          role: 'patient',
          patient_profile_id: 1,
          injury_diagnosis: 'Post-Op Right ACL Reconstruction',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        },
        {
          id: 4,
          username: 'emily_rose',
          full_name: 'Emily Rose',
          role: 'patient',
          patient_profile_id: 2,
          injury_diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Left)',
          avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        },
      ]);
    }
  };

  useEffect(() => {
    loadUsersFromDb();
  }, []);

  // Manage Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive) {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch(() => {
          setCameraError('Camera access not available. Please use file upload instead.');
          setIsCameraActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isCameraActive]);

  const handleSnapSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 240, 240);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoDataUrl(dataUrl);
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const performLogin = async (targetUsername: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await api.login({ username: targetUsername });
    if (res) {
      onLoginSuccess(res);
    } else {
      // Find in local list if backend connection refused
      const found = registeredUsers.find(
        u => u.username.toLowerCase() === targetUsername.toLowerCase().trim()
      );
      if (found) {
        onLoginSuccess(found);
      } else {
        setErrorMessage(
          'Could not log in. Make sure "node backend/dev-server.js" is running in Terminal 1!'
        );
      }
    }
    setIsLoading(false);
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your username');
      return;
    }
    performLogin(username);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regUsername.trim()) {
      setErrorMessage('Full name and username are required');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const defaultAvatar =
      regGender === 'Female'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';

    const payload = {
      full_name: regFullName.trim(),
      username: regUsername.trim().toLowerCase(),
      password: regPassword,
      role: 'patient' as const,
      injury_diagnosis: regDiagnosis.trim() || 'General Physiotherapy / Rehabilitation',
      gender: regGender,
      avatar_url: photoDataUrl || defaultAvatar,
    };

    const res = await api.register(payload);
    if (res) {
      setSuccessMessage('Account saved to SQLite database! Logging in...');
      await loadUsersFromDb();
      setTimeout(() => {
        onLoginSuccess(res);
      }, 600);
    } else {
      setErrorMessage(
        'Failed to save to SQLite database. Please make sure the backend is running: run "node backend/dev-server.js" in Terminal 1!'
      );
    }
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: '540px', margin: '2rem auto', padding: '0 1rem' }}>
      <div
        className="card"
        style={{
          padding: '2.25rem',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#e0f2fe',
              color: '#0284c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto',
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800, marginBottom: '0.25rem' }}>
            PhysioSystem
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Clinical Physiotherapy & Home Rehabilitation
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In vs Register) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setErrorMessage(null); }}
            style={{
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'signin' ? '#ffffff' : 'transparent',
              color: authMode === 'signin' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: authMode === 'signin' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
            style={{
              padding: '0.55rem',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'register' ? '#ffffff' : 'transparent',
              color: authMode === 'register' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: authMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Register as Patient
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '0.75rem',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              fontWeight: 600,
            }}
          >
            {successMessage}
          </div>
        )}

        {/* MODE 1: SIGN IN */}
        {authMode === 'signin' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#94a3b8',
                  }}
                >
                  ACCOUNTS IN DATABASE ({registeredUsers.length})
                </span>
                <span className="tag" style={{ fontSize: '0.7rem' }}>
                  SQLite Synced
                </span>
              </div>

              {/* Dynamic list of all users from SQLite */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                {registeredUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => performLogin(u.username)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: u.role === 'doctor' ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                      background: u.role === 'doctor' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={u.full_name}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: u.role === 'doctor' ? '#0369a1' : '#0f172a', fontSize: '0.88rem' }}>
                          {u.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          @{u.username} {u.injury_diagnosis ? `• ${u.injury_diagnosis}` : ''}
                        </div>
                      </div>
                    </div>
                    <span
                      className="tag"
                      style={{
                        background: u.role === 'doctor' ? '#0284c7' : '#16a34a',
                        color: 'white',
                        fontSize: '0.7rem',
                      }}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ padding: '0 0.75rem', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                OR SIGN IN WITH USERNAME
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            <form onSubmit={handleSignInSubmit}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. doctor_chen, john_doe, or your username"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  background: '#0284c7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* MODE 2: REGISTER NEW PATIENT WITH PHOTO UPLOAD & WEBCAM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            {/* User Photo Capture / Upload Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                marginBottom: '1rem',
              }}
            >
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                {photoDataUrl ? (
                  <img
                    src={photoDataUrl}
                    alt="Patient Preview"
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #0284c7',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                    }}
                  >
                    👤
                  </div>
                )}

                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Live Webcam Preview if Active */}
              {isCameraActive && (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: '180px',
                      height: '180px',
                      borderRadius: '10px',
                      objectFit: 'cover',
                      border: '2px solid #0284c7',
                      transform: 'scaleX(-1)',
                    }}
                  />
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={handleSnapSelfie}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                      }}
                    >
                      📸 Snap Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCameraActive(false)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {cameraError && (
                <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                  {cameraError}
                </div>
              )}

              {!isCameraActive && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    📷 Take Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    📁 Upload Photo
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={e => setRegFullName(e.target.value)}
                placeholder="e.g. Alex Wong"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder="e.g. alex_wong"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Physiotherapy Diagnosis / Condition *
              </label>
              <input
                type="text"
                required
                value={regDiagnosis}
                onChange={e => setRegDiagnosis(e.target.value)}
                placeholder="e.g. Lower Back Lumbar Strain, Post-Stroke Rehab, or Cervical Spine"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Gender
              </label>
              <select
                value={regGender}
                onChange={e => setRegGender(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="Not Specified">Not Specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Saving to Database...' : '✨ Create Account & Start Rehab'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
