import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ActivityLog } from '../../types';

export const LoggerModule: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    api.getActivityLogs().then(res => {
      if (res && res.length > 0) setLogs(res);
      else {
        setLogs([
          { id: 1, patient_id: 1, logged_by_user_id: 3, completed_sets: 3, completed_reps: 10, achieved_rom_angle: 88, pain_scale: 3, rpe_scale: 4, logged_at: '2026-10-28 09:30' },
          { id: 2, patient_id: 1, logged_by_user_id: 3, completed_sets: 3, completed_reps: 12, achieved_rom_angle: 92, pain_scale: 4, rpe_scale: 5, logged_at: '2026-10-28 09:45' },
        ]);
      }
    });
  }, []);

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 5 • Assigned to Member 5</span>
        <h2>Nurse & Patient Activity Logger</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Record completed exercise reps, measured ROM angles, and subjective pain (0-10) / exertion scales.
        </p>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>Recent Activity Logs</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Data source: SQLite <code>activity_logs</code> table
          </p>
          <ul style={{ listStyle: 'none' }}>
            {logs.map(log => (
              <li key={log.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{log.completed_sets} sets × {log.completed_reps} reps</strong>
                  <span className="tag" style={{ background: (log.pain_scale || 0) >= 6 ? '#fee2e2' : '#f1f5f9', color: (log.pain_scale || 0) >= 6 ? '#b91c1c' : '#475569' }}>
                    Pain: {log.pain_scale}/10
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                  ROM Angle: {log.achieved_rom_angle}° • Logged: {log.logged_at}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3>Developer Checklist (Member 5)</h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Build Patient Quick-Log check-in interface with pain slider (0-10)</li>
            <li>Build Nurse clinical observation note modal with urgent flag toggle</li>
            <li>Connect to <code>POST /api/logger/logs</code> and <code>vital_notes</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
