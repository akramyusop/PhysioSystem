import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { User } from '../../types';

export const AuthModule: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.getUsers().then(res => {
      if (res && res.length > 0) setUsers(res);
      else {
        // Fallback seed mock
        setUsers([
          { id: 1, username: 'doctor_chen', full_name: 'Dr. Sarah Chen, MD', role: 'doctor' },
          { id: 2, username: 'nurse_mark', full_name: 'Mark Davis, RN', role: 'nurse' },
          { id: 3, username: 'john_doe', full_name: 'John Doe', role: 'patient' },
        ]);
      }
    });
  }, []);

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 1 • Assigned to Member 1</span>
        <h2>Identity, Auth & Patient Onboarding</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage user authentication, roles (Doctor, Nurse, Patient), and new patient clinical intake.
        </p>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>Registered System Users</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Data source: SQLite <code>users</code> table
          </p>
          <ul style={{ listStyle: 'none' }}>
            {users.map(u => (
              <li key={u.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{u.full_name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{u.username}</div>
                </div>
                <span className="tag">{u.role.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3>Developer Checklist (Member 1)</h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Build Doctor/Nurse login form with JWT/token session</li>
            <li>Build Patient Onboarding intake form (injury diagnosis, baseline ROM)</li>
            <li>Connect backend endpoint <code>POST /api/auth/register-patient</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
