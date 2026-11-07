import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Exercise } from '../../types';

export const LibraryModule: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    api.getExercises().then(res => {
      if (res && res.length > 0) setExercises(res);
      else {
        setExercises([
          { id: 1, name: 'Quadriceps Isometric Set', description: 'Tighten thigh muscles keeping leg straight.', target_body_part: 'Knee', difficulty: 'easy' },
          { id: 2, name: 'Heel Slides with Strap', description: 'Slide heel toward buttocks bending knee gently.', target_body_part: 'Knee', difficulty: 'medium' },
          { id: 3, name: 'Shoulder Pendulum Swing', description: 'Lean forward and let arm swing gently in circles.', target_body_part: 'Shoulder', difficulty: 'easy' },
        ]);
      }
    });
  }, []);

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 3 • Assigned to Member 3</span>
        <h2>Patient Guidance & Video Tutorial Library</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Browse rehabilitation movements with embedded media, instructions, and target muscle groups.
        </p>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>Physiotherapy Exercise Catalog</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Data source: SQLite <code>exercises</code> table
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {exercises.map(ex => (
              <div key={ex.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{ex.name}</strong>
                  <span className="tag">{ex.difficulty}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.35rem 0' }}>{ex.description}</p>
                <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>Target: {ex.target_body_part}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3>Developer Checklist (Member 3)</h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Build responsive video player and tutorial carousel</li>
            <li>Add category filters (Target body part: Knee, Shoulder, Back)</li>
            <li>Implement Daily Patient "What To Do Next" checklist UI</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
