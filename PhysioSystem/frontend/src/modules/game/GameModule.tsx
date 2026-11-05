import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import { GameSession } from '../../types';

export const GameModule: React.FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    api.getGameSessions().then(res => {
      if (res && res.length > 0) setSessions(res);
      else {
        setSessions([
          { id: 1, patient_id: 1, game_type: 'Rhythm Knee Hold', duration_seconds: 120, score: 850, accuracy_percentage: 92.5 },
          { id: 2, patient_id: 1, game_type: 'Rhythm Knee Hold', duration_seconds: 120, score: 920, accuracy_percentage: 96.0 },
        ]);
      }
    });
  }, []);

  // Simple interactive HTML5 canvas loop demo
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background target ring
      ctx.beginPath();
      ctx.arc(150, 100, 50, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 10;
      ctx.stroke();

      // Draw active holding arc
      ctx.beginPath();
      ctx.arc(150, 100, 50, 0, angle);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 10;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Hold Progress: ${Math.round((angle / (2 * Math.PI)) * 100)}%`, 150, 105);

      angle += 0.03;
      if (angle >= 2 * Math.PI) {
        angle = 0;
        setCurrentScore(s => s + 50);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 4 • Assigned to Member 4</span>
        <h2>Gamified Rehabilitation Engine</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Interactive canvas game loop turning rehab movements into points, streaks, and feedback.
        </p>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3>Interactive Exercise Game Canvas</h3>
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <canvas ref={canvasRef} width={300} height={200} style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: isPlaying ? '#ef4444' : '#0284c7',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isPlaying ? 'Pause Session' : 'Start Hold Game'}
              </button>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Score: {currentScore}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3>Developer Checklist (Member 4)</h3>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Integrate full game mechanics (target cadence, hold timers, or webcam motion tracking)</li>
            <li>Send session results to <code>POST /api/game/sessions</code></li>
            <li>Maintain personal high score and accuracy leaderboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
