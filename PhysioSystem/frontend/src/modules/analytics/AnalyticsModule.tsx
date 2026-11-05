import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PatientRecoverySummary } from '../../types';

export const AnalyticsModule: React.FC = () => {
  const [summaries, setSummaries] = useState<PatientRecoverySummary[]>([]);

  useEffect(() => {
    api.getRecoverySummary().then(res => {
      if (res && res.length > 0) setSummaries(res);
      else {
        setSummaries([
          { patient_profile_id: 1, patient_name: 'John Doe', injury_diagnosis: 'Post-Op Right ACL Reconstruction', total_sessions_logged: 3, average_pain_score: 3.0, max_rom_achieved: 95.0, last_activity_date: '2026-11-01' },
          { patient_profile_id: 2, patient_name: 'Emily Rose', injury_diagnosis: 'Frozen Shoulder - Left', total_sessions_logged: 1, average_pain_score: 6.0, max_rom_achieved: 50.0, last_activity_date: '2026-11-02' },
        ]);
      }
    });
  }, []);

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 6 • Assigned to Member 6</span>
        <h2>Health Condition Analytics & Recovery Dashboard</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Visualize recovery trajectories, pain reduction curves, compliance rates, and clinical alerts.
        </p>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>Patient Recovery Aggregates</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Data source: SQLite <code>view_patient_recovery_summary</code>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summaries.map(s => (
              <div key={s.patient_profile_id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>{s.patient_name}</strong>
                  <span className="tag" style={{ background: '#dcfce7', color: '#166534' }}>{s.total_sessions_logged} Sessions</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{s.injury_diagnosis}</div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                  <span>Max ROM: <strong>{s.max_rom_achieved ?? 0}°</strong></span>
                  <span>Avg Pain: <strong>{s.average_pain_score ?? 0}/10</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3>Developer Checklist (Member 6)</h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Integrate chart visualizations (ROM angle over time, pain trends)</li>
            <li>Build automated clinical alert banner (High pain / nurse flags)</li>
            <li>Implement exportable patient recovery progress report PDF/CSV</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
