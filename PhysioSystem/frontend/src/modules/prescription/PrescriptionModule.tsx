import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { TreatmentPlan } from '../../types';

export const PrescriptionModule: React.FC = () => {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);

  useEffect(() => {
    api.getTreatmentPlans().then(res => {
      if (res && res.length > 0) setPlans(res);
      else {
        setPlans([
          { id: 1, patient_id: 1, doctor_id: 1, title: 'Phase 1 ACL Recovery Protocol', status: 'active', start_date: '2026-10-15' },
          { id: 2, patient_id: 2, doctor_id: 1, title: 'Shoulder Mobility & Pain Reduction', status: 'active', start_date: '2026-10-20' },
        ]);
      }
    });
  }, []);

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 2 • Assigned to Member 2</span>
        <h2>Doctor Prescription & Treatment Planner</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Create and tailor rehabilitation regimens (sets, reps, hold seconds, daily cadence).
        </p>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>Active Treatment Plans</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Data source: SQLite <code>treatment_plans</code> table
          </p>
          <ul style={{ listStyle: 'none' }}>
            {plans.map(p => (
              <li key={p.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{p.title}</strong>
                  <span className="tag">{p.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Patient ID: #{p.patient_id} • Started: {p.start_date}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3>Developer Checklist (Member 2)</h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Build treatment plan prescription builder (sets, reps, hold duration)</li>
            <li>Connect exercise selector dropdown (fetching from Module 3)</li>
            <li>Implement <code>POST /api/prescription/plans</code> and exercise assignment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
