import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../api/client';
import { GameSession, HighScore } from '../../types';

type GameMode = 'Upper-Limb Fruit Reach' | 'Sky Glider Trajectory' | 'Neural Hold Stabilizer';
type ControlType = 'mouse' | 'webcam';

interface PatientOption {
  id: number;
  name: string;
  diagnosis: string;
  prescribedBy: string;
  defaultGame: GameMode;
  dailyGoalReps: number;
}

const PATIENTS: PatientOption[] = [
  {
    id: 1,
    name: 'John Doe',
    diagnosis: 'Post-Stroke Upper-Limb Hemiparesis & Right ACL',
    prescribedBy: 'Dr. Sarah Chen, MD',
    defaultGame: 'Upper-Limb Fruit Reach',
    dailyGoalReps: 8,
  },
  {
    id: 2,
    name: 'Emily Rose',
    diagnosis: 'Motor Impairment / Frozen Shoulder (Left)',
    prescribedBy: 'Dr. Sarah Chen, MD',
    defaultGame: 'Sky Glider Trajectory',
    dailyGoalReps: 6,
  },
];

const GAME_CONFIGS: Record<
  GameMode,
  {
    exerciseId: number;
    exerciseName: string;
    targetBodyPart: string;
    targetReps: number;
    instructions: string;
    clinicalGoal: string;
  }
> = {
  'Upper-Limb Fruit Reach': {
    exerciseId: 3,
    exerciseName: 'Overhead & Lateral Reach-and-Grasp',
    targetBodyPart: 'Shoulder Abduction & Hand-Eye Motor Control',
    targetReps: 8,
    instructions:
      'Move your virtual hand (via Webcam Motion or Mouse) to grab the glowing fruit at different Range-of-Motion angles, then bring it down into the basket at the bottom!',
    clinicalGoal: 'Neuroplasticity reach-to-grasp training, shoulder ROM expansion & reaction coordination.',
  },
  'Sky Glider Trajectory': {
    exerciseId: 4,
    exerciseName: 'Smooth Motor Pathway Tracking',
    targetBodyPart: 'Upper Extremity & Trunk Stability',
    targetReps: 6,
    instructions:
      'Guide the rehabilitation glider vertically to fly cleanly through the incoming golden rings. Smooth, steady movements earn bonus accuracy!',
    clinicalGoal: 'Ataxia/tremor dampening, continuous motor trajectory control & postural endurance.',
  },
  'Neural Hold Stabilizer': {
    exerciseId: 1,
    exerciseName: 'Isometric Target Stabilization',
    targetBodyPart: 'Joint Proprioception & Isometric Control',
    targetReps: 5,
    instructions:
      'Move your virtual hand inside the glowing neural target ring and hold your limb steady inside it until the 100% charge ring completes!',
    clinicalGoal: 'Isometric muscle activation, fine motor steadiness & joint angle holding.',
  },
};

export const GameModule: React.FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [gameMode, setGameMode] = useState<GameMode>('Upper-Limb Fruit Reach');
  const [controlType, setControlType] = useState<ControlType>('mouse');
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [completedReps, setCompletedReps] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [romAngle, setRomAngle] = useState(95);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusFeedback, setStatusFeedback] = useState<string>('Ready to start home rehabilitation session');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  // Virtual Hand Cursor Position (controlled by Mouse OR Webcam Motion)
  const handPosRef = useRef<{ x: number; y: number }>({ x: 260, y: 150 });

  // Internal mutable state for the 3 neuro-rehab games
  const gameStateRef = useRef({
    // Game 1: Fruit Reach & Basket
    fruitX: 140,
    fruitY: 70,
    fruitAngleLabel: '115° Overhead',
    hasFruit: false,
    // Game 2: Sky Glider Rings
    gliderY: 140,
    ringX: 500,
    ringY: 120,
    ringPassed: false,
    // Game 3: Neural Hold Stabilizer
    nodeX: 260,
    nodeY: 110,
    nodeHoldProgress: 0,
    // Shared telemetry
    goodFrames: 1,
    totalFrames: 1,
    score: 0,
    combo: 1,
    reps: 0,
    maxRom: 90,
  });

  const loadData = useCallback(async () => {
    const [fetchedSessions, fetchedHighScores] = await Promise.all([
      api.getGameSessions(),
      api.getHighScores(),
    ]);
    if (fetchedSessions && fetchedSessions.length > 0) setSessions(fetchedSessions);
    else {
      setSessions([
        { id: 1, patient_id: 1, exercise_id: 3, game_type: 'Upper-Limb Fruit Reach', duration_seconds: 120, score: 920, accuracy_percentage: 94.0 },
        { id: 2, patient_id: 2, exercise_id: 4, game_type: 'Sky Glider Trajectory', duration_seconds: 95, score: 780, accuracy_percentage: 91.5 },
      ]);
    }
    if (fetchedHighScores && fetchedHighScores.length > 0) setHighScores(fetchedHighScores);
    else {
      setHighScores([
        { id: 1, patient_id: 1, game_type: 'Upper-Limb Fruit Reach', highest_score: 920 },
        { id: 2, patient_id: 2, game_type: 'Sky Glider Trajectory', highest_score: 780 },
      ]);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Webcam Setup & Cleanup for Home Motion Tracking
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (controlType === 'webcam') {
      setWebcamError(null);
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 320, height: 240 } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
          setStatusFeedback('Webcam active! Wave your hand in front of the camera to move the virtual hand.');
        })
        .catch(() => {
          setWebcamError('Webcam not detected or permission denied. Switched back to Mouse/Touch mode.');
          setControlType('mouse');
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
  }, [controlType]);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isPlaying]);
  const spawnNextFruit = () => {
    const spots = [
      { x: 90, y: 55, label: '135° Left Overhead Reach', rom: 135 },
      { x: 410, y: 55, label: '135° Right Overhead Reach', rom: 135 },
      { x: 250, y: 45, label: '150° Full Vertical Reach', rom: 150 },
      { x: 75, y: 125, label: '95° Lateral Abduction', rom: 95 },
      { x: 425, y: 125, label: '95° Lateral Abduction', rom: 95 },
    ];
    const pick = spots[Math.floor(Math.random() * spots.length)];
    gameStateRef.current.fruitX = pick.x;
    gameStateRef.current.fruitY = pick.y;
    gameStateRef.current.fruitAngleLabel = pick.label;
    gameStateRef.current.maxRom = Math.max(gameStateRef.current.maxRom, pick.rom);
    setRomAngle(pick.rom);
  };

  const resetGameState = (mode: GameMode = gameMode) => {
    setIsPlaying(false);
    setSessionFinished(false);
    setScore(0);
    setCombo(1);
    setCompletedReps(0);
    setAccuracy(100);
    setElapsedSeconds(0);
    setSaveMessage(null);
    setStatusFeedback(`Ready: ${GAME_CONFIGS[mode].exerciseName}`);
    gameStateRef.current = {
      fruitX: 110,
      fruitY: 60,
      fruitAngleLabel: '130° Overhead Reach',
      hasFruit: false,
      gliderY: 135,
      ringX: 480,
      ringY: 110,
      ringPassed: false,
      nodeX: 250,
      nodeY: 100,
      nodeHoldProgress: 0,
      goodFrames: 1,
      totalFrames: 1,
      score: 0,
      combo: 1,
      reps: 0,
      maxRom: 95,
    };
  };

  const handleStartGame = () => {
    if (sessionFinished) resetGameState(gameMode);
    setIsPlaying(true);
    setSessionFinished(false);
    setSaveMessage(null);
    setStatusFeedback('Session active! Move your hand/cursor to complete your prescribed reps.');
  };

  const handleSaveSession = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    const cfg = GAME_CONFIGS[gameMode];
    const payload = {
      patient_id: selectedPatientId,
      exercise_id: cfg.exerciseId,
      game_type: gameMode,
      duration_seconds: Math.max(elapsedSeconds, 12),
      score,
      accuracy_percentage: Number(accuracy.toFixed(1)),
    };
    const saved = await api.createGameSession(payload);
    if (saved) {
      setSaveMessage('Home Rehab Session & High Score synced to Clinic SQLite Database!');
      await loadData();
    } else {
      setSessions(prev => [{ id: Date.now(), ...payload }, ...prev]);
      setSaveMessage('Session saved in UI! (Run node backend/dev-server.js to sync to SQLite)');
    }
    setIsSaving(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const targetReps = GAME_CONFIGS[gameMode].targetReps;

    const renderLoop = () => {
      const gs = gameStateRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // 1. If Webcam Motion Tracking is active, compute motion centroid from video frame
      if (controlType === 'webcam' && videoRef.current && motionCanvasRef.current) {
        const mCanvas = motionCanvasRef.current;
        const mCtx = mCanvas.getContext('2d');
        if (mCtx && videoRef.current.readyState === 4) {
          const mw = mCanvas.width;
          const mh = mCanvas.height;
          // Mirror video horizontally so moving right moves cursor right
          mCtx.save();
          mCtx.scale(-1, 1);
          mCtx.drawImage(videoRef.current, -mw, 0, mw, mh);
          mCtx.restore();

          const frame = mCtx.getImageData(0, 0, mw, mh).data;
          if (prevFrameRef.current) {
            let sumX = 0, sumY = 0, count = 0;
            const prev = prevFrameRef.current;
            for (let y = 0; y < mh; y += 2) {
              for (let x = 0; x < mw; x += 2) {
                const i = (y * mw + x) * 4;
                const diff =
                  Math.abs(frame[i] - prev[i]) +
                  Math.abs(frame[i + 1] - prev[i + 1]) +
                  Math.abs(frame[i + 2] - prev[i + 2]);
                if (diff > 75) {
                  sumX += x;
                  sumY += y;
                  count++;
                }
              }
            }
            if (count > 12) {
              const targetX = (sumX / count / mw) * w;
              const targetY = (sumY / count / mh) * h;
              // Smoothly interpolate hand position
              handPosRef.current.x += (targetX - handPosRef.current.x) * 0.25;
              handPosRef.current.y += (targetY - handPosRef.current.y) * 0.25;
            }
          }
          prevFrameRef.current = new Uint8ClampedArray(frame);
        }
      }

      // Draw Sky/Clinic Background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f0f9ff');
      grad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const hx = handPosRef.current.x;
      const hy = handPosRef.current.y;

      if (gameMode === 'Upper-Limb Fruit Reach') {
        // --- NEURO GAME 1: FRUIT REACH & BASKET DROP ---
        // Draw Anatomical Reach Arcs
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(w / 2, h - 25, 190, Math.PI, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Patient Recovery Basket at Bottom Center
        const basketX = w / 2 - 45;
        const basketY = h - 48;
        ctx.fillStyle = '#d97706';
        ctx.fillRect(basketX, basketY, 90, 36);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 3;
        ctx.strokeRect(basketX, basketY, 90, 36);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DROP BASKET', w / 2, basketY + 22);

        // Draw Target Fruit (or attach to hand if grabbed)
        const fx = gs.hasFruit ? hx : gs.fruitX;
        const fy = gs.hasFruit ? hy : gs.fruitY;

        ctx.beginPath();
        ctx.arc(fx, fy, 18, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Leaf on apple
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(fx + 4, fy - 18, 6, 0, Math.PI);
        ctx.fill();

        if (!gs.hasFruit) {
          ctx.fillStyle = '#0369a1';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(gs.fruitAngleLabel, fx, fy - 26);
        }

        if (isPlaying) {
          gs.totalFrames += 1;
          if (!gs.hasFruit) {
            const distToFruit = Math.hypot(hx - gs.fruitX, hy - gs.fruitY);
            if (distToFruit < 30) {
              gs.hasFruit = true;
              gs.score += 50;
              setStatusFeedback('🍎 Fruit Grabbed! Now guide your arm down to the Drop Basket!');
            }
          } else {
            gs.goodFrames += 1;
            const distToBasket = Math.hypot(hx - w / 2, hy - (basketY + 18));
            if (distToBasket < 42) {
              gs.hasFruit = false;
              gs.reps += 1;
              gs.combo = Math.min(5, gs.combo + 1);
              gs.score += 120 * gs.combo;
              setCompletedReps(gs.reps);
              setCombo(gs.combo);
              setScore(gs.score);
              spawnNextFruit();
              setStatusFeedback(`🎉 Reach-to-Grasp Rep ${gs.reps}/${targetReps} Complete!`);

              if (gs.reps >= targetReps) {
                setIsPlaying(false);
                setSessionFinished(true);
                setStatusFeedback('🏆 Daily Reach-and-Grasp Routine Finished! Click Save Session.');
              }
            }
          }
          setScore(gs.score);
        }
      } else if (gameMode === 'Sky Glider Trajectory') {
        // --- NEURO GAME 2: SKY GLIDER TRAJECTORY ---
        if (isPlaying) {
          gs.totalFrames += 1;
          gs.gliderY += (hy - gs.gliderY) * 0.18;
          gs.ringX -= 3.2;

          if (Math.abs(gs.gliderY - gs.ringY) < 42) {
            gs.goodFrames += 1;
          }

          // Check ring pass
          if (!gs.ringPassed && Math.abs(gs.ringX - 110) < 18) {
            if (Math.abs(gs.gliderY - gs.ringY) < 38) {
              gs.ringPassed = true;
              gs.reps += 1;
              gs.combo = Math.min(5, gs.combo + 1);
              gs.score += 140 * gs.combo;
              setCompletedReps(gs.reps);
              setCombo(gs.combo);
              setStatusFeedback(`✈️ Smooth Ring Pass ${gs.reps}/${targetReps}! Great motor control!`);
              if (gs.reps >= targetReps) {
                setIsPlaying(false);
                setSessionFinished(true);
                setStatusFeedback('🏆 Glider Motor Control Session Complete! Click Save Session.');
              }
            } else {
              gs.combo = 1;
              setCombo(1);
              setStatusFeedback('↕️ Raise/lower your arm earlier to align with the golden ring!');
            }
          }

          if (gs.ringX < -20) {
            gs.ringX = w + 20;
            gs.ringY = 55 + Math.random() * (h - 110);
            gs.ringPassed = false;
            const newRom = Math.round(70 + ((h - gs.ringY) / h) * 80);
            setRomAngle(newRom);
          }

          setScore(gs.score);
          setAccuracy(Math.min(100, Math.max(55, (gs.goodFrames / gs.totalFrames) * 100)));
        }

        // Draw Ideal Trajectory Guideline
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(110, gs.gliderY);
        ctx.lineTo(gs.ringX, gs.ringY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Golden Target Ring
        ctx.beginPath();
        ctx.ellipse(gs.ringX, gs.ringY, 12, 34, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = gs.ringPassed ? '#22c55e' : '#eab308';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Draw Rehab Glider at x = 110
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(130, gs.gliderY);
        ctx.lineTo(90, gs.gliderY - 14);
        ctx.lineTo(98, gs.gliderY);
        ctx.lineTo(90, gs.gliderY + 14);
        ctx.closePath();
        ctx.fill();
      } else {
        // --- NEURO GAME 3: NEURAL HOLD STABILIZER ---
        const nx = gs.nodeX;
        const ny = gs.nodeY;
        const radius = 44;

        // Outer target ring
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Hold Progress Arc
        const endAngle = (gs.nodeHoldProgress / 100) * 2 * Math.PI - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 6, -Math.PI / 2, endAngle);
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 7;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`HOLD ${Math.round(gs.nodeHoldProgress)}%`, nx, ny + 4);

        if (isPlaying) {
          gs.totalFrames += 1;
          const dist = Math.hypot(hx - nx, hy - ny);
          if (dist <= radius) {
            gs.goodFrames += 1;
            gs.nodeHoldProgress += 0.65;
            gs.score += gs.combo;
            setStatusFeedback('⚡ Holding steady inside Neural Target...');
            if (gs.nodeHoldProgress >= 100) {
              gs.nodeHoldProgress = 0;
              gs.reps += 1;
              gs.combo = Math.min(5, gs.combo + 1);
              gs.score += 150 * gs.combo;
              setCompletedReps(gs.reps);
              setCombo(gs.combo);
              gs.nodeX = 90 + Math.random() * (w - 180);
              gs.nodeY = 65 + Math.random() * (h - 130);
              setRomAngle(Math.round(80 + ((h - gs.nodeY) / h) * 70));
              setStatusFeedback(`🌟 Neural Node ${gs.reps}/${targetReps} Stabilized!`);
              if (gs.reps >= targetReps) {
                setIsPlaying(false);
                setSessionFinished(true);
                setStatusFeedback('🏆 Neural Stabilization Routine Complete! Save your session.');
              }
            }
          } else {
            gs.nodeHoldProgress = Math.max(0, gs.nodeHoldProgress - 0.35);
          }
          setScore(gs.score);
          setAccuracy(Math.min(100, Math.max(50, (gs.goodFrames / gs.totalFrames) * 100)));
        }
      }

      // Draw Patient Virtual Hand Avatar at (hx, hy)
      ctx.beginPath();
      ctx.arc(hx, hy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✋', hx, hy + 4);

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, gameMode, controlType]);
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (controlType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    handPosRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  };

  const currentConfig = GAME_CONFIGS[gameMode];
  const selectedPatient = PATIENTS.find(p => p.id === selectedPatientId) || PATIENTS[0];
  const getPatientName = (id: number) => PATIENTS.find(p => p.id === id)?.name || `Patient #${id}`;

  return (
    <div>
      <div className="module-header">
        <span className="module-badge">Module 4 • Neurological & Motor-Impaired Home Rehab Engine</span>
        <h2>Game-Based Motor & Neurological Rehabilitation</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Patients log in from home to complete doctor-prescribed reach, trajectory, and stabilization exercises using Webcam Motion Tracking or Mouse/Touch control.
        </p>
      </div>

      {/* Patient Home Account Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38bdf8', fontWeight: 700 }}>
              PATIENT HOME REHAB PORTAL (LOGGED IN)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem' }}>
              <select
                value={selectedPatientId}
                onChange={e => {
                  const pid = Number(e.target.value);
                  setSelectedPatientId(pid);
                  const pat = PATIENTS.find(p => p.id === pid);
                  if (pat) { setGameMode(pat.defaultGame); resetGameState(pat.defaultGame); }
                }}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #475569', background: '#1e293b', color: 'white', fontWeight: 700, fontSize: '0.95rem' }}
              >
                {PATIENTS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.diagnosis}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              Prescribed by: <strong>{selectedPatient.prescribedBy}</strong> • Home Goal: <strong>{currentConfig.targetReps} Reps/Session</strong>
            </div>
          </div>

          {/* Input Control Switcher: Mouse vs Webcam Motion */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>MOTION TRACKING INPUT</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setControlType('mouse')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: controlType === 'mouse' ? '2px solid #38bdf8' : '1px solid #475569',
                  background: controlType === 'mouse' ? '#0284c7' : '#334155',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                🖱️ Mouse / Touch Hand
              </button>
              <button
                onClick={() => setControlType('webcam')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: controlType === 'webcam' ? '2px solid #38bdf8' : '1px solid #475569',
                  background: controlType === 'webcam' ? '#0284c7' : '#334155',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                📷 Live Webcam Motion
              </button>
            </div>
          </div>
        </div>

        {webcamError && (
          <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.75rem', background: '#7f1d1d', color: '#fecaca', borderRadius: '6px', fontSize: '0.8rem' }}>
            {webcamError}
          </div>
        )}
      </div>

      {/* Rehab Game Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['Upper-Limb Fruit Reach', 'Sky Glider Trajectory', 'Neural Hold Stabilizer'] as GameMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => { setGameMode(mode); resetGameState(mode); }}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: gameMode === mode ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: gameMode === mode ? '#e0f2fe' : '#ffffff',
              color: gameMode === mode ? '#0369a1' : '#475569',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            {mode === 'Upper-Limb Fruit Reach' && '🍎 '}
            {mode === 'Sky Glider Trajectory' && '✈️ '}
            {mode === 'Neural Hold Stabilizer' && '⚡ '}
            {mode}
          </button>
        ))}
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: '1.35fr 0.85fr', alignItems: 'start' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>{gameMode}</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{currentConfig.clinicalGoal}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => (isPlaying ? setIsPlaying(false) : handleStartGame())}
                style={{
                  background: isPlaying ? '#f59e0b' : '#0284c7',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {isPlaying ? '⏸ Pause' : sessionFinished ? '🔄 Play Again' : '▶ Start Home Rehab'}
              </button>
              <button
                onClick={() => resetGameState(gameMode)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Telemetry HUD */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.5rem',
              background: '#0f172a',
              color: 'white',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>SCORE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{score} <span style={{ fontSize: '0.75rem', color: '#facc15' }}>x{combo}</span></div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>REPS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>
                {completedReps} / {currentConfig.targetReps}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROM ANGLE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#facc15' }}>{romAngle}°</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>MOTOR ACC</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{accuracy.toFixed(0)}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TIME</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{elapsedSeconds}s</div>
            </div>
          </div>

          {/* Game Canvas + Optional Webcam PiP Preview */}
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={280}
              onMouseMove={handleCanvasMouseMove}
              style={{
                width: '100%',
                maxWidth: '500px',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                cursor: 'none',
              }}
            />

            {/* Hidden/PiP webcam elements for motion detection */}
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                display: controlType === 'webcam' ? 'block' : 'none',
                position: 'absolute',
                bottom: '12px',
                right: '16px',
                width: '110px',
                height: '82px',
                borderRadius: '6px',
                border: '2px solid #0284c7',
                background: '#000',
                transform: 'scaleX(-1)',
              }}
            />
            <canvas ref={motionCanvasRef} width={80} height={60} style={{ display: 'none' }} />
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.65rem 0.9rem',
              background: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>{statusFeedback}</span>
            <button
              onClick={handleSaveSession}
              disabled={score === 0 || isSaving}
              style={{
                background: score > 0 ? '#16a34a' : '#94a3b8',
                color: 'white',
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: '6px',
                cursor: score > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {isSaving ? 'Syncing...' : '💾 Save & Send to Doctor'}
            </button>
          </div>

          {saveMessage && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
              {saveMessage}
            </div>
          )}

          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem', lineHeight: 1.5 }}>
            <strong>Patient Instructions:</strong> {currentConfig.instructions}
          </p>
        </div>

        {/* Right Column: High Score Leaderboard & Clinic Synced Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>🏆 Patient Personal Bests</h3>
              <span className="tag">SQLite: high_scores</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {highScores.map((hs, idx) => (
                <div
                  key={hs.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: hs.patient_id === selectedPatient.id ? '#f0f9ff' : '#f8fafc',
                    border: hs.patient_id === selectedPatient.id ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>#{idx + 1} • {getPatientName(hs.patient_id)}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{hs.game_type}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0284c7' }}>{hs.highest_score} pts</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>📋 Doctor-Monitored Sessions</h3>
              <span className="tag">SQLite: game_sessions</span>
            </div>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sessions.map(sess => (
                <div
                  key={sess.id}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{sess.game_type}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {getPatientName(sess.patient_id)} • {sess.duration_seconds}s • Accuracy: {sess.accuracy_percentage ?? 90}%
                    </div>
                  </div>
                  <span className="tag" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.85rem' }}>
                    {sess.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};