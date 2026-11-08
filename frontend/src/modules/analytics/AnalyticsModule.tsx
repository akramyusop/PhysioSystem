import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { AuthUser, PatientRecoverySummary, PatientTrendData } from '../../types';

interface AnalyticsModuleProps {
  currentUser?: AuthUser | null;
  onNavigateToPrescription?: () => void;
  onNavigateToGame?: () => void;
}

export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({
  currentUser,
  onNavigateToPrescription,
  onNavigateToGame,
}) => {
  const isPatient = currentUser?.role === 'patient';

  const [summaries, setSummaries] = useState<PatientRecoverySummary[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [trendData, setTrendData] = useState<PatientTrendData | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [hoveredRomPoint, setHoveredRomPoint] = useState<{ x: number; y: number; data: any } | null>(null);
  const [hoveredPainPoint, setHoveredPainPoint] = useState<{ x: number; y: number; data: any } | null>(null);

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
    try {
      const res = await api.getRecoverySummary();
      if (res && res.length > 0) {
        setSummaries(res);
        if (isPatient) {
          const matched = res.find(s => s.patient_name.toLowerCase().includes(currentUser?.full_name?.toLowerCase() || ''));
          setSelectedPatientId(matched ? matched.patient_profile_id : res[0].patient_profile_id);
        } else {
          setSelectedPatientId(res[0].patient_profile_id);
        }
      } else {
        const fallback: PatientRecoverySummary[] = [
          {
            patient_profile_id: 1,
            patient_name: 'John Doe',
            injury_diagnosis: 'Post-Op Right ACL Reconstruction',
            baseline_rom_score: 85,
            total_sessions_logged: 6,
            average_pain_score: 2.8,
            latest_pain_score: 2,
            max_rom_achieved: 98,
            adherence_rate_pct: 88,
            clinical_alert_count: 0,
            last_activity_date: '2026-11-06',
          },
          {
            patient_profile_id: 2,
            patient_name: 'Emily Rose',
            injury_diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Left)',
            baseline_rom_score: 45,
            total_sessions_logged: 4,
            average_pain_score: 5.4,
            latest_pain_score: 5,
            max_rom_achieved: 55,
            adherence_rate_pct: 75,
            clinical_alert_count: 1,
            last_activity_date: '2026-11-03',
          },
          {
            patient_profile_id: 3,
            patient_name: 'Alex San',
            injury_diagnosis: 'lower back lumbar strain',
            baseline_rom_score: 60,
            total_sessions_logged: 2,
            average_pain_score: 4.0,
            latest_pain_score: 4,
            max_rom_achieved: 68,
            adherence_rate_pct: 60,
            clinical_alert_count: 0,
            last_activity_date: '2026-11-04',
          },
          {
            patient_profile_id: 4,
            patient_name: 'Test Patient',
            injury_diagnosis: 'Lumbar Disc Herniation',
            baseline_rom_score: 65,
            total_sessions_logged: 1,
            average_pain_score: 3.0,
            latest_pain_score: 3,
            max_rom_achieved: 70,
            adherence_rate_pct: 50,
            clinical_alert_count: 0,
            last_activity_date: '2026-11-05',
          },
        ];
        setSummaries(fallback);
        setSelectedPatientId(isPatient ? 1 : fallback[0].patient_profile_id);
      }
    } catch (err) {
      console.error('Failed to load recovery summaries:', err);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      loadTrends(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadTrends = async (patientId: number) => {
    try {
      const data = await api.getPatientTrends(patientId);
      if (data) setTrendData(data);
    } catch (err) {
      console.warn('Fallback trend data:', err);
      const currentSum = summaries.find(s => s.patient_profile_id === patientId);
      const isJohn = patientId === 1;
      const isEmily = patientId === 2;
      setTrendData({
        patient_info: {
          id: patientId,
          name: currentSum?.patient_name || (isJohn ? 'John Doe' : isEmily ? 'Emily Rose' : 'Patient #' + patientId),
          diagnosis: currentSum?.injury_diagnosis || 'Post-Op Rehabilitation',
          baseline_rom: currentSum?.baseline_rom_score || (isJohn ? 85 : isEmily ? 45 : 60),
          doctor_name: 'Dr. Sarah Chen, MD',
          start_date: '2026-10-15',
        },
        rom_progression: isJohn
          ? [
              { date: '2026-10-15', rom_angle: 85, target_angle: 110, exercise_name: 'Intake Evaluation', source: 'nurse' },
              { date: '2026-10-20', rom_angle: 87, target_angle: 110, exercise_name: 'Quad Set Isometric', source: 'self' },
              { date: '2026-10-25', rom_angle: 90, target_angle: 110, exercise_name: 'Heel Slides with Strap', source: 'nurse' },
              { date: '2026-10-30', rom_angle: 92, target_angle: 110, exercise_name: 'Fruit Reach Rehab Game', source: 'game' },
              { date: '2026-11-02', rom_angle: 95, target_angle: 110, exercise_name: 'Quad Set Isometric', source: 'nurse' },
              { date: '2026-11-06', rom_angle: 98, target_angle: 110, exercise_name: 'Neural Hold Stabilizer', source: 'game' },
            ]
          : isEmily
          ? [
              { date: '2026-10-20', rom_angle: 45, target_angle: 140, exercise_name: 'Intake Mobility Exam', source: 'nurse' },
              { date: '2026-10-26', rom_angle: 48, target_angle: 140, exercise_name: 'Shoulder Pendulum', source: 'self' },
              { date: '2026-11-01', rom_angle: 52, target_angle: 140, exercise_name: 'Pendulum Orbit Catcher', source: 'game' },
              { date: '2026-11-03', rom_angle: 55, target_angle: 140, exercise_name: 'Wall Angels Guided', source: 'nurse' },
            ]
          : [
              { date: '2026-10-28', rom_angle: 60, target_angle: 90, exercise_name: 'Initial Lumbar Baseline', source: 'nurse' },
              { date: '2026-11-04', rom_angle: 68, target_angle: 90, exercise_name: 'Pelvic Tilt & Core Hold', source: 'self' },
            ],
        pain_trend: isJohn
          ? [
              { date: '2026-10-15', pain_score: 6, source: 'Intake Assessment', notes: 'Post-op surgical soreness' },
              { date: '2026-10-22', pain_score: 4, source: 'Nurse Jenkins', notes: 'Swelling subsiding' },
              { date: '2026-10-29', pain_score: 3, source: 'Nurse Davis', notes: 'Tolerating flexion smoothly' },
              { date: '2026-11-06', pain_score: 2, source: 'Nurse Davis', notes: 'Mild soreness only after sets' },
            ]
          : isEmily
          ? [
              { date: '2026-10-20', pain_score: 7, source: 'Intake Assessment', notes: 'Capsular stiffness' },
              { date: '2026-10-28', pain_score: 6, source: 'Nurse Jenkins', notes: 'Pendulum tolerated' },
              { date: '2026-11-03', pain_score: 5, source: 'Nurse Jenkins', notes: 'Abduction triggers pinching' },
            ]
          : [
              { date: '2026-10-28', pain_score: 5, source: 'Intake Assessment', notes: 'Lower back stiffness' },
              { date: '2026-11-04', pain_score: 4, source: 'Nurse Davis', notes: 'Core engagement tolerated' },
            ],
        adherence: {
          prescribed_sessions: isJohn ? 21 : isEmily ? 14 : 10,
          completed_sessions: isJohn ? 18 : isEmily ? 10 : 6,
          compliance_pct: isJohn ? 86 : isEmily ? 71 : 60,
          streak_days: isJohn ? 5 : isEmily ? 2 : 1,
        },
        clinical_alerts: isEmily
          ? [
              {
                id: 'alt-2-1',
                date: '2026-11-03',
                patient_name: 'Emily Rose',
                severity: 'moderate',
                alert_type: 'Pain Spike',
                message: 'Patient Emily Rose reported elevated pain (5/10) during shoulder abduction at 55 deg. Cold therapy administered.',
              },
            ]
          : isJohn
          ? [
              {
                id: 'alt-1-1',
                date: '2026-11-06',
                patient_name: 'John Doe',
                severity: 'low',
                alert_type: 'Milestone Achieved',
                message: 'ROM reached 98 deg (+13 deg over baseline). Approved to advance to Phase 2 strengthening.',
              },
            ]
          : [],
      });
    }
  };

  const selectedSummary = useMemo(() => {
    return summaries.find(s => s.patient_profile_id === selectedPatientId) || summaries[0];
  }, [summaries, selectedPatientId]);

  const clinicKpis = useMemo(() => {
    if (summaries.length === 0) return { totalPatients: 4, avgPain: '3.8', avgAdherence: 68, alertCount: 1 };
    const totalPatients = summaries.length;
    const painSum = summaries.reduce((acc, s) => acc + (s.average_pain_score || 0), 0);
    const avgPain = (painSum / totalPatients).toFixed(1);
    const adhSum = summaries.reduce((acc, s) => acc + (s.adherence_rate_pct || 0), 0);
    const avgAdherence = Math.round(adhSum / totalPatients);
    const alertCount = summaries.reduce((acc, s) => acc + (s.clinical_alert_count || 0), 0);
    return { totalPatients, avgPain, avgAdherence, alertCount };
  }, [summaries]);

  const activeAlerts = useMemo(() => {
    if (!trendData?.clinical_alerts) return [];
    return trendData.clinical_alerts.filter(a => !dismissedAlerts.includes(String(a.id)));
  }, [trendData, dismissedAlerts]);

  const handleDismissAlert = (alertId: string | number) => {
    setDismissedAlerts(prev => [...prev, String(alertId)]);
  };

  const handleExportCSV = () => {
    if (!trendData) return;
    const p = trendData.patient_info;
    const rows: string[][] = [
      ['PHYSIOSYSTEM - PATIENT RECOVERY & BIOMETRIC ANALYTICS REPORT'],
      ['Generated On', new Date().toISOString()],
      ['Patient Name', p.name],
      ['Patient ID', String(p.id)],
      ['Diagnosis', p.diagnosis],
      ['Attending Clinician', p.doctor_name],
      ['Baseline ROM', `${p.baseline_rom} deg`],
      ['Compliance Rate', `${trendData.adherence.compliance_pct}%`],
      ['Completed Sessions', `${trendData.adherence.completed_sessions} of ${trendData.adherence.prescribed_sessions}`],
      ['Active Streak', `${trendData.adherence.streak_days} days`],
      [],
      ['RANGE OF MOTION (ROM) PROGRESSION TIMELINE'],
      ['Date', 'ROM Angle (deg)', 'Target Angle (deg)', 'Exercise Evaluated', 'Data Source'],
    ];

    trendData.rom_progression.forEach(r => {
      rows.push([r.date, String(r.rom_angle), String(r.target_angle), r.exercise_name, r.source]);
    });

    rows.push([]);
    rows.push(['PAIN REDUCTION SCORE TIMELINE (0-10)']);
    rows.push(['Date', 'Pain Score', 'Recorded By / Assessment', 'Clinical Notes']);

    trendData.pain_trend.forEach(pt => {
      rows.push([pt.date, String(pt.pain_score), pt.source, pt.notes || '']);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recovery_analytics_${p.name.replace(/\s+/g, '_').toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const romSvgData = useMemo(() => {
    if (!trendData || !trendData.rom_progression.length) return null;
    const width = 580;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 40, left: 45 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const angles = trendData.rom_progression.map(d => d.rom_angle);
    const targets = trendData.rom_progression.map(d => d.target_angle);
    const minVal = Math.min(...angles, trendData.patient_info.baseline_rom) - 10;
    const maxVal = Math.max(...angles, ...targets) + 10;

    const points = trendData.rom_progression.map((d, i) => {
      const x = padding.left + (i / (trendData.rom_progression.length - 1 || 1)) * innerWidth;
      const y = padding.top + innerHeight - ((d.rom_angle - minVal) / (maxVal - minVal || 1)) * innerHeight;
      return { x, y, data: d };
    });

    const baselineY = padding.top + innerHeight - ((trendData.patient_info.baseline_rom - minVal) / (maxVal - minVal || 1)) * innerHeight;
    const targetY = padding.top + innerHeight - ((trendData.rom_progression[0]?.target_angle - minVal) / (maxVal - minVal || 1)) * innerHeight;

    const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaStr = `${points[0]?.x},${padding.top + innerHeight} ${polylineStr} ${points[points.length - 1]?.x},${padding.top + innerHeight}`;

    return { width, height, padding, innerWidth, innerHeight, points, baselineY, targetY, polylineStr, areaStr, minVal, maxVal };
  }, [trendData]);

  const painSvgData = useMemo(() => {
    if (!trendData || !trendData.pain_trend.length) return null;
    const width = 580;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 40, left: 45 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const count = trendData.pain_trend.length;
    const barWidth = Math.min(48, (innerWidth / count) * 0.6);

    const bars = trendData.pain_trend.map((pt, i) => {
      const x = padding.left + (i + 0.5) * (innerWidth / count) - barWidth / 2;
      const barHeight = (pt.pain_score / 10) * innerHeight;
      const y = padding.top + innerHeight - barHeight;
      const color = pt.pain_score <= 3 ? '#10b981' : pt.pain_score <= 6 ? '#f59e0b' : '#ef4444';
      return { x, y, barWidth, barHeight, color, data: pt };
    });

    return { width, height, padding, innerWidth, innerHeight, bars };
  }, [trendData]);

  const romGain = useMemo(() => {
    if (!trendData || !trendData.rom_progression.length) return 0;
    const lastAngle = trendData.rom_progression[trendData.rom_progression.length - 1].rom_angle;
    return lastAngle - trendData.patient_info.baseline_rom;
  }, [trendData]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              MODULE 6 &bull; ANALYTICS & RECOVERY
            </span>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              {isPatient ? 'Personal Patient Portal' : 'Clinician Telemetry & Population Overview'}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            {isPatient ? 'My Health & Recovery Trajectory' : 'Health Condition Analytics & Recovery Dashboard'}
          </h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.92rem', maxWidth: '640px' }}>
            {isPatient
              ? 'View your joint Range of Motion progress, pain reduction trajectory, and home exercise adherence.'
              : 'Monitor cohort recovery trends, joint mobility curves, and safety flags across all patients.'}
          </p>
        </div>

        {!isPatient && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCSV}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: '#ffffff',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              title="Download telemetry data in CSV format"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              style={{
                background: '#ffffff',
                color: '#0369a1',
                border: 'none',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
              title="Open printable medical summary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Clinical Summary
            </button>
          </div>
        )}
      </div>

      {/* Top KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPatient ? 'My ROM Improvement' : 'Active Patients Monitored'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
            {isPatient ? `+${romGain} deg` : `${clinicKpis.totalPatients} Patients`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 500 }}>
            {isPatient ? 'Gained over intake baseline' : 'Active in SQLite database'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPatient ? 'Current Pain Level' : 'Clinic Avg Pain Score'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
            {isPatient ? `${selectedSummary?.latest_pain_score ?? 2}/10` : `${clinicKpis.avgPain}/10`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 500 }}>
            {isPatient ? 'Down from 6/10 at intake (-66%)' : 'Across all monitored patients'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPatient ? 'Session Adherence Streak' : 'Rehab Compliance Rate'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
            {isPatient ? `${trendData?.adherence.streak_days || 5} Days Active` : `${clinicKpis.avgAdherence}%`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 500 }}>
            {isPatient
              ? `${trendData?.adherence.completed_sessions || 18} of ${trendData?.adherence.prescribed_sessions || 21} sessions completed`
              : 'Target benchmark >= 80%'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPatient ? 'Recovery Status' : 'Clinical Safety Flags'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: !isPatient && activeAlerts.length > 0 ? '#b45309' : '#0f172a', margin: '0.25rem 0' }}>
            {isPatient ? 'On Track' : `${activeAlerts.length} Active`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 500 }}>
            {isPatient ? 'Phase 2 strengthening active' : 'High pain or vitals elevation'}
          </div>
        </div>
      </div>

      {/* Automated Clinical Alert Notification Banner (Doctor View Only) */}
      {!isPatient && activeAlerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {activeAlerts.map(alert => (
            <div
              key={alert.id}
              style={{
                background: alert.severity === 'high' ? '#fef2f2' : alert.severity === 'moderate' ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${alert.severity === 'high' ? '#fecaca' : alert.severity === 'moderate' ? '#fde68a' : '#bbf7d0'}`,
                borderLeft: `5px solid ${alert.severity === 'high' ? '#ef4444' : alert.severity === 'moderate' ? '#f59e0b' : '#10b981'}`,
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {alert.severity === 'high' || alert.severity === 'moderate' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={alert.severity === 'high' ? '#dc2626' : '#d97706'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="9 12 12 15 16 10" />
                    </svg>
                  )}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: alert.severity === 'high' ? '#fee2e2' : alert.severity === 'moderate' ? '#fef3c7' : '#dcfce7',
                        color: alert.severity === 'high' ? '#991b1b' : alert.severity === 'moderate' ? '#92400e' : '#166534',
                      }}
                    >
                      {alert.alert_type}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{alert.patient_name}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>&bull; {alert.date}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>{alert.message}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {onNavigateToPrescription && (
                  <button
                    onClick={onNavigateToPrescription}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#0284c7',
                    }}
                  >
                    Adjust Plan
                  </button>
                )}
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0.2rem 0.4rem',
                  }}
                  title="Acknowledge alert"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Selection Dropdown (Doctor View Only) */}
      {!isPatient && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Focus Patient:</span>
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(Number(e.target.value))}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {summaries.map(s => (
                <option key={s.patient_profile_id} value={s.patient_profile_id}>
                  {s.patient_name} &mdash; {s.injury_diagnosis}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>
              Baseline ROM: <strong>{selectedSummary?.baseline_rom_score ?? 60}&deg;</strong>
            </span>
            <span style={{ color: '#64748b' }}>
              Max Achieved: <strong style={{ color: '#16a34a' }}>{selectedSummary?.max_rom_achieved ?? 60}&deg;</strong>
            </span>
            <span style={{ color: '#64748b' }}>
              Adherence: <strong>{selectedSummary?.adherence_rate_pct ?? 70}%</strong>
            </span>
          </div>
        </div>
      )}

      {/* Two Column Visual Analytics Graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* CHART 1: ROM Progression Curve */}
        <div className="card" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Range of Motion (ROM) Trajectory</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Intake baseline vs measured joint flexion angle (Degrees &deg;)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }}></span> Measured ROM
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '14px', height: '2px', background: '#94a3b8', borderTop: '2px dashed #94a3b8' }}></span> Baseline
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '14px', height: '2px', background: '#10b981' }}></span> Target
              </span>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            {romSvgData ? (
              <svg viewBox={`0 0 ${romSvgData.width} ${romSvgData.height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="romGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1={romSvgData.padding.left} y1={romSvgData.padding.top} x2={romSvgData.width - romSvgData.padding.right} y2={romSvgData.padding.top} stroke="#f1f5f9" strokeWidth="1" />
                <line x1={romSvgData.padding.left} y1={romSvgData.padding.top + romSvgData.innerHeight / 2} x2={romSvgData.width - romSvgData.padding.right} y2={romSvgData.padding.top + romSvgData.innerHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
                <line x1={romSvgData.padding.left} y1={romSvgData.height - romSvgData.padding.bottom} x2={romSvgData.width - romSvgData.padding.right} y2={romSvgData.height - romSvgData.padding.bottom} stroke="#cbd5e1" strokeWidth="1" />

                <line
                  x1={romSvgData.padding.left}
                  y1={romSvgData.targetY}
                  x2={romSvgData.width - romSvgData.padding.right}
                  y2={romSvgData.targetY}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={romSvgData.width - romSvgData.padding.right - 4} y={romSvgData.targetY - 5} fill="#10b981" fontSize="10" textAnchor="end" fontWeight="600">
                  Target {trendData?.rom_progression[0]?.target_angle}&deg;
                </text>

                <line
                  x1={romSvgData.padding.left}
                  y1={romSvgData.baselineY}
                  x2={romSvgData.width - romSvgData.padding.right}
                  y2={romSvgData.baselineY}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={romSvgData.padding.left + 5} y={romSvgData.baselineY - 5} fill="#64748b" fontSize="10" fontWeight="600">
                  Baseline {trendData?.patient_info.baseline_rom}&deg;
                </text>

                <polygon points={romSvgData.areaStr} fill="url(#romGradient)" />
                <polyline fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={romSvgData.polylineStr} />

                {romSvgData.points.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="3"
                      style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                      onMouseEnter={() => setHoveredRomPoint(pt)}
                      onMouseLeave={() => setHoveredRomPoint(null)}
                    />
                    <text
                      x={pt.x}
                      y={romSvgData.height - romSvgData.padding.bottom + 16}
                      fill="#64748b"
                      fontSize="9.5"
                      textAnchor="middle"
                    >
                      {pt.data.date.slice(5)}
                    </text>
                  </g>
                ))}

                <text x={romSvgData.padding.left - 8} y={romSvgData.padding.top + 4} fill="#94a3b8" fontSize="10" textAnchor="end">
                  {Math.round(romSvgData.maxVal)}&deg;
                </text>
                <text x={romSvgData.padding.left - 8} y={romSvgData.height - romSvgData.padding.bottom} fill="#94a3b8" fontSize="10" textAnchor="end">
                  {Math.round(romSvgData.minVal)}&deg;
                </text>
              </svg>
            ) : (
              <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                No ROM telemetry logged yet for this patient.
              </div>
            )}
          </div>

          {hoveredRomPoint && (
            <div
              style={{
                position: 'absolute',
                top: Math.max(10, hoveredRomPoint.y - 65),
                left: Math.min(420, hoveredRomPoint.x - 70),
                background: '#0f172a',
                color: '#ffffff',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                zIndex: 10,
              }}
            >
              <div><strong>{hoveredRomPoint.data.exercise_name}</strong></div>
              <div>ROM: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{hoveredRomPoint.data.rom_angle}&deg;</span> (Target: {hoveredRomPoint.data.target_angle}&deg;)</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Source: {hoveredRomPoint.data.source.toUpperCase()} &bull; {hoveredRomPoint.data.date}</div>
            </div>
          )}

          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Telemetry: Computer Vision & Goniometer</span>
            <span style={{ fontWeight: 600, color: '#0284c7' }}>
              Progress: +{romGain}&deg; gained
            </span>
          </div>
        </div>

        {/* CHART 2: Pain Reduction Timeline */}
        <div className="card" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Pain Level Trend & Mitigation</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Numeric Pain Rating Scale (0 to 10) monitored across treatment timeline
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }}></span> 0-3 Mild
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }}></span> 4-6 Mod
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }}></span> 7-10 Severe
              </span>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            {painSvgData ? (
              <svg viewBox={`0 0 ${painSvgData.width} ${painSvgData.height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1={painSvgData.padding.left} y1={painSvgData.padding.top} x2={painSvgData.width - painSvgData.padding.right} y2={painSvgData.padding.top} stroke="#f1f5f9" strokeWidth="1" />
                <line x1={painSvgData.padding.left} y1={painSvgData.padding.top + painSvgData.innerHeight * 0.4} x2={painSvgData.width - painSvgData.padding.right} y2={painSvgData.padding.top + painSvgData.innerHeight * 0.4} stroke="#fef2f2" strokeWidth="1" strokeDasharray="3 3" />
                <line x1={painSvgData.padding.left} y1={painSvgData.padding.top + painSvgData.innerHeight * 0.7} x2={painSvgData.width - painSvgData.padding.right} y2={painSvgData.padding.top + painSvgData.innerHeight * 0.7} stroke="#ecfdf5" strokeWidth="1" strokeDasharray="3 3" />
                <line x1={painSvgData.padding.left} y1={painSvgData.height - painSvgData.padding.bottom} x2={painSvgData.width - painSvgData.padding.right} y2={painSvgData.height - painSvgData.padding.bottom} stroke="#cbd5e1" strokeWidth="1" />

                <text x={painSvgData.padding.left - 8} y={painSvgData.padding.top + 4} fill="#94a3b8" fontSize="10" textAnchor="end">10</text>
                <text x={painSvgData.padding.left - 8} y={painSvgData.padding.top + painSvgData.innerHeight * 0.5} fill="#94a3b8" fontSize="10" textAnchor="end">5</text>
                <text x={painSvgData.padding.left - 8} y={painSvgData.height - painSvgData.padding.bottom} fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

                {painSvgData.bars.map((bar, i) => (
                  <g key={i}>
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.barWidth}
                      height={bar.barHeight}
                      rx="4"
                      fill={bar.color}
                      style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                      onMouseEnter={() => setHoveredPainPoint({ x: bar.x, y: bar.y, data: bar.data })}
                      onMouseLeave={() => setHoveredPainPoint(null)}
                    />
                    <text
                      x={bar.x + bar.barWidth / 2}
                      y={bar.y - 5}
                      fill={bar.color}
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {bar.data.pain_score}
                    </text>
                    <text
                      x={bar.x + bar.barWidth / 2}
                      y={painSvgData.height - painSvgData.padding.bottom + 16}
                      fill="#64748b"
                      fontSize="9.5"
                      textAnchor="middle"
                    >
                      {bar.data.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                No pain scores recorded.
              </div>
            )}
          </div>

          {hoveredPainPoint && (
            <div
              style={{
                position: 'absolute',
                top: Math.max(10, hoveredPainPoint.y - 65),
                left: Math.min(420, hoveredPainPoint.x - 70),
                background: '#0f172a',
                color: '#ffffff',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                zIndex: 10,
              }}
            >
              <div>Score: <strong style={{ color: hoveredPainPoint.data.pain_score > 5 ? '#f87171' : '#4ade80' }}>{hoveredPainPoint.data.pain_score}/10</strong></div>
              <div>Source: {hoveredPainPoint.data.source}</div>
              {hoveredPainPoint.data.notes && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>{hoveredPainPoint.data.notes}</div>}
            </div>
          )}

          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Source: Clinical Vitals & Patient Self-Reporting</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>Status: Significant Pain Mitigation</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Bottom Section */}
      {!isPatient ? (
        /* Doctor View: Complete 4-Patient Cohort Triage Table */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Cohort Triage & Patient Matrix</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Live patient registry from SQLite database (Click any row to inspect telemetry)
              </p>
            </div>
            <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
              {summaries.length} Patients Total
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem' }}>Patient Name</th>
                  <th style={{ padding: '0.75rem' }}>Diagnosis</th>
                  <th style={{ padding: '0.75rem' }}>Baseline ROM</th>
                  <th style={{ padding: '0.75rem' }}>Max ROM</th>
                  <th style={{ padding: '0.75rem' }}>Avg Pain</th>
                  <th style={{ padding: '0.75rem' }}>Adherence</th>
                  <th style={{ padding: '0.75rem' }}>Sessions</th>
                  <th style={{ padding: '0.75rem' }}>Safety Flags</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(s => {
                  const isSelected = s.patient_profile_id === selectedPatientId;
                  return (
                    <tr
                      key={s.patient_profile_id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f0f9ff' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedPatientId(s.patient_profile_id)}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                        {s.patient_name}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>
                        {s.injury_diagnosis}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {s.baseline_rom_score ?? 60}&deg;
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#16a34a' }}>
                        {s.max_rom_achieved ?? 60}&deg;
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            background: (s.average_pain_score || 0) <= 3 ? '#dcfce7' : (s.average_pain_score || 0) <= 6 ? '#fef3c7' : '#fee2e2',
                            color: (s.average_pain_score || 0) <= 3 ? '#166534' : (s.average_pain_score || 0) <= 6 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {s.average_pain_score ?? 3}/10
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${s.adherence_rate_pct ?? 70}%`,
                                height: '100%',
                                background: (s.adherence_rate_pct || 0) >= 80 ? '#10b981' : '#f59e0b',
                              }}
                            />
                          </div>
                          <span>{s.adherence_rate_pct ?? 70}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {s.total_sessions_logged}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {(s.clinical_alert_count || 0) > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>Alert: {s.clinical_alert_count}</span>
                        ) : (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Normal</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedPatientId(s.patient_profile_id);
                          }}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: isSelected ? '#0284c7' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? 'Viewing' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Patient View: Personal Milestones & Game Action */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>My Recovery Milestones</h3>
            <p style={{ margin: '0.2rem 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Your rehabilitation progress tracked against your doctor treatment plan
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', background: '#f0fdf4', borderRadius: '6px' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>&check;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Intake Mobility Exam Complete</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Baseline angle recorded at {trendData?.patient_info.baseline_rom || 85}&deg;</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', background: '#f0fdf4', borderRadius: '6px' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>&check;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Pain Down to Mild (2/10)</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Swelling controlled, significant relief achieved</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', background: '#f0fdf4', borderRadius: '6px' }}>
                <span style={{ color: '#0284c7', fontWeight: 800 }}>&bull;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Pass 95&deg; Range of Motion</div>
                  <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>Achieved! Max recorded at {selectedSummary?.max_rom_achieved || 98}&deg; (+{romGain}&deg;)</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#94a3b8' }}>&bull;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#64748b' }}>Target 110&deg; Full Flexion</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>12&deg; remaining to complete recovery</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Next Recommended Exercise</h3>
            <p style={{ margin: '0.2rem 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Maintain your daily streak to keep joint mobility flexible
            </p>

            <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: '0.3rem' }}>
                Fruit Reach & Balance Rehab Game
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                Your webcam will track joint angles in real time. Complete 3 sets today to maintain your streak.
              </div>
            </div>

            {onNavigateToGame && (
              <button
                onClick={onNavigateToGame}
                style={{
                  width: '100%',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Start Today&apos;s Rehab Session
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Clinical Summary Modal */}
      {showPrintModal && trendData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setShowPrintModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0284c7', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20" />
                </svg>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>PhysioSystem Clinical Recovery Report</h2>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Department of Physical Therapy & Rehabilitation</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Document
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#64748b',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Patient Name</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{trendData.patient_info.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>Diagnosis: {trendData.patient_info.diagnosis}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Attending Physician</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{trendData.patient_info.doctor_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>Start Date: {trendData.patient_info.start_date}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Baseline ROM</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{trendData.patient_info.baseline_rom}&deg;</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Max Achieved</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                  {trendData.rom_progression[trendData.rom_progression.length - 1]?.rom_angle || 98}&deg;
                </div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Pain</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>
                  {trendData.pain_trend[trendData.pain_trend.length - 1]?.pain_score || 2}/10
                </div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adherence</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#8b5cf6' }}>
                  {trendData.adherence.compliance_pct}%
                </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#0f172a' }}>Range of Motion Progression Record</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Exercise / Assessment</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Angle (&deg;)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Target (&deg;)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {trendData.rom_progression.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem' }}>{d.date}</td>
                    <td style={{ padding: '0.5rem' }}>{d.exercise_name}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>{d.rom_angle}&deg;</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>{d.target_angle}&deg;</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.75rem' }}>{d.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#0f172a' }}>Pain Trend Logs</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Assessed By</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Clinical Notes</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pain Score</th>
                </tr>
              </thead>
              <tbody>
                {trendData.pain_trend.map((pt, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem' }}>{pt.date}</td>
                    <td style={{ padding: '0.5rem' }}>{pt.source}</td>
                    <td style={{ padding: '0.5rem', color: '#475569' }}>{pt.notes || 'Routine vitals log'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>{pt.pain_score}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Report Generated By</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>PhysioSystem Medical Core</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ height: '30px', borderBottom: '1px solid #0f172a', width: '180px', marginBottom: '0.25rem' }}></div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Physician Signature / Verification</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
