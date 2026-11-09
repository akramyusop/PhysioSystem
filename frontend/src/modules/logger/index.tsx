// frontend/src/modules/logger/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import './logger.css';
import { AuthUser } from '../../types';

export interface ActivityLog {
  id?: number;
  patient_id: string;
  nurse_name: string;
  activity_type: string;
  duration_minutes: number;
  assistance_level: string;
  notes?: string;
  logged_at?: string;
  voided?: boolean;
  void_reason?: string;
}

export interface VitalNote {
  id?: number;
  patient_id: string;
  nurse_name: string;
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  spo2: number;
  temperature_c: number;
  pain_score: number;
  clinical_remarks?: string;
  recorded_at?: string;
  news2_score?: number;
  voided?: boolean;
  void_reason?: string;
}

export interface PatientItem {
  id: string;
  name: string;
  diagnosis?: string;
  avatar_url?: string;
}

const DEFAULT_NURSES: string[] = [
  'Mark Davis, RN',
  'Sarah Jenkins, RN',
];

const DEFAULT_PATIENTS: PatientItem[] = [
  {
    id: 'PT-001',
    name: 'John Doe',
    diagnosis: 'Post-Op Right ACL Reconstruction',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'PT-002',
    name: 'Emily Rose',
    diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Left)',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'PT-003',
    name: 'Alex San',
    diagnosis: 'Lower Back Lumbar Strain',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'PT-004',
    name: 'Test Patient',
    diagnosis: 'Lumbar Disc Herniation',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
];

const API_BASE = '/api/logger';

// --- NEWS2 Scoring Algorithm ---
export function calculateNews2(bpSys: number, hr: number, spo2: number, temp: number): number {
  let score = 0;
  // Systolic Blood Pressure
  if (bpSys <= 90 || bpSys >= 220) score += 3;
  else if (bpSys <= 100) score += 2;
  else if (bpSys <= 110) score += 1;

  // Heart Rate
  if (hr <= 40 || hr >= 131) score += 3;
  else if (hr >= 111) score += 2;
  else if (hr <= 50 || hr >= 91) score += 1;

  // Oxygen Saturation SpO2
  if (spo2 <= 91) score += 3;
  else if (spo2 <= 93) score += 2;
  else if (spo2 <= 95) score += 1;

  // Body Temperature
  if (temp <= 35.0) score += 3;
  else if (temp >= 39.1) score += 2;
  else if (temp <= 36.0 || temp >= 38.1) score += 1;

  return score;
}

interface PatientAvatarProps {
  patientId: string;
  patientName?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PatientAvatar: React.FC<PatientAvatarProps> = ({
  patientId,
  patientName = '',
  avatarUrl,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  const initials = patientName
    ? patientName
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : patientId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();

  return (
    <div
      className={`mod5-avatar-frame size-${size}`}
      title={`${patientName || patientId} • Patient Recognition Frame (Module 1 Ready)`}
    >
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={patientName || patientId}
          className="mod5-avatar-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="mod5-avatar-placeholder">
          <span>{initials}</span>
        </div>
      )}
    </div>
  );
};

export interface NurseActivityLoggerProps {
  currentUser?: AuthUser | null;
}

export const NurseActivityLogger: React.FC<NurseActivityLoggerProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'vitals'>('activity');
  const [patientFilter, setPatientFilter] = useState('');

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [vitals, setVitals] = useState<VitalNote[]>([]);

  // Registered Patients & Nurses from DB
  const [patients, setPatients] = useState<PatientItem[]>(DEFAULT_PATIENTS);
  const [nurses, setNurses] = useState<string[]>(DEFAULT_NURSES);

  // --- Feature 4: Smart Dynamic Sub-Metrics State ---
  const [subMetricVal, setSubMetricVal] = useState<string>('90');

  // --- Feature 5: Session Stopwatch State ---
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // --- Feature 1: Voice Dictation State ---
  const [isDictatingAct, setIsDictatingAct] = useState<boolean>(false);
  const [isDictatingVit, setIsDictatingVit] = useState<boolean>(false);

  const isPatient = currentUser?.role === 'patient';
  const matchedPatient = patients.find(
    (p) =>
      p.name.toLowerCase() === (currentUser?.full_name || '').toLowerCase() ||
      (currentUser?.username?.toLowerCase().includes('john') && p.id === 'PT-001') ||
      (currentUser?.username?.toLowerCase().includes('emily') && p.id === 'PT-002') ||
      (currentUser?.username?.toLowerCase().includes('alex') && p.id === 'PT-003') ||
      (currentUser?.username?.toLowerCase().includes('test') && p.id === 'PT-004')
  ) || patients[0];



  // Patient Self-Logging State (Log Pain and Sets)
  const [patientPain, setPatientPain] = useState<number>(2);
  const [patientExercise, setPatientExercise] = useState<string>('Quadriceps Isometric Set');
  const [patientSets, setPatientSets] = useState<number>(3);
  const [patientReps, setPatientReps] = useState<number>(10);
  const [patientDuration, setPatientDuration] = useState<number>(15);
  const [patientRpe, setPatientRpe] = useState<number>(4);
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [patientSubmittedToast, setPatientSubmittedToast] = useState<boolean>(false);

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const notesFormatted = `[Pain: ${patientPain}/10 | Sets: ${patientSets} × ${patientReps} | RPE: ${patientRpe}/10 | Duration: ${patientDuration} mins] ${patientNotes}`.trim();

    const newActivity: ActivityLog = {
      patient_id: matchedPatient.id,
      nurse_name: 'Self-Logged (Patient Check-in)',
      activity_type: `${patientExercise} (Self-Logged)`,
      duration_minutes: patientDuration,
      assistance_level: 'Independent (Self-Guided)',
      notes: notesFormatted,
      id: Date.now(),
      logged_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voided: false,
    };

    const newVital: VitalNote = {
      patient_id: matchedPatient.id,
      nurse_name: 'Self-Logged Check-in',
      bp_systolic: 120,
      bp_diastolic: 80,
      heart_rate: 72,
      spo2: 98,
      temperature_c: 36.8,
      pain_score: patientPain,
      clinical_remarks: `[Patient Self-Report] Pain rating: ${patientPain}/10 after ${patientSets} sets of ${patientExercise}. ${patientNotes}`.trim(),
      id: Date.now(),
      recorded_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      news2_score: 0,
      voided: false,
    };

    try {
      await fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity),
      });
      await fetch(`${API_BASE}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVital),
      });
    } catch {
      // Offline fallback
    }

    const updatedActs = [newActivity, ...activities];
    setActivities(updatedActs);
    localStorage.setItem('mod5_activity_logs', JSON.stringify(updatedActs));

    const updatedVits = [newVital, ...vitals];
    setVitals(updatedVits);
    localStorage.setItem('mod5_vital_notes', JSON.stringify(updatedVits));

    setPatientNotes('');
    setPatientSubmittedToast(true);
    setTimeout(() => setPatientSubmittedToast(false), 4000);
  };

  // Activity Form State
  const [actForm, setActForm] = useState<ActivityLog>({
    patient_id: DEFAULT_PATIENTS[0].id,
    nurse_name: DEFAULT_NURSES[0],
    activity_type: 'ROM Exercise',
    duration_minutes: 30,
    assistance_level: 'Min Assist',
    notes: '',
  });

  // Vitals Form State
  const [vitalForm, setVitalForm] = useState<VitalNote>({
    patient_id: DEFAULT_PATIENTS[0].id,
    nurse_name: DEFAULT_NURSES[0],
    bp_systolic: 120,
    bp_diastolic: 80,
    heart_rate: 72,
    spo2: 98,
    temperature_c: 36.8,
    pain_score: 2,
    clinical_remarks: '',
  });

  // Fetch registered patients & nurses + initial logs
  useEffect(() => {
    fetch(`${API_BASE}/meta`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          if (Array.isArray(json.data.nurses) && json.data.nurses.length > 0) {
            const nurseNames = json.data.nurses.map((n: { full_name: string }) => n.full_name);
            setNurses(nurseNames);
            setActForm((prev) => ({ ...prev, nurse_name: prev.nurse_name || nurseNames[0] }));
            setVitalForm((prev) => ({ ...prev, nurse_name: prev.nurse_name || nurseNames[0] }));
          }
          if (Array.isArray(json.data.patients) && json.data.patients.length > 0) {
            const patientItems: PatientItem[] = json.data.patients.map(
              (p: { patient_id: string; full_name: string; injury_diagnosis: string; avatar_url?: string }) => ({
                id: p.patient_id,
                name: p.full_name,
                diagnosis: p.injury_diagnosis,
                avatar_url: p.avatar_url,
              })
            );
            setPatients(patientItems);
            setActForm((prev) => ({ ...prev, patient_id: prev.patient_id || patientItems[0].id }));
            setVitalForm((prev) => ({ ...prev, patient_id: prev.patient_id || patientItems[0].id }));
          }
        }
      })
      .catch(() => {});

    fetch(`${API_BASE}/activities`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setActivities(json.data);
          localStorage.setItem('mod5_activity_logs', JSON.stringify(json.data));
        } else {
          const savedAct = localStorage.getItem('mod5_activity_logs');
          if (savedAct) setActivities(JSON.parse(savedAct));
        }
      })
      .catch(() => {
        const savedAct = localStorage.getItem('mod5_activity_logs');
        if (savedAct) setActivities(JSON.parse(savedAct));
      });

    fetch(`${API_BASE}/vitals`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setVitals(json.data);
          localStorage.setItem('mod5_vital_notes', JSON.stringify(json.data));
        } else {
          const savedVit = localStorage.getItem('mod5_vital_notes');
          if (savedVit) setVitals(JSON.parse(savedVit));
        }
      })
      .catch(() => {
        const savedVit = localStorage.getItem('mod5_vital_notes');
        if (savedVit) setVitals(JSON.parse(savedVit));
      });
  }, []);

  // --- Stopwatch Effect ---
  useEffect(() => {
    if (isStopwatchRunning) {
      timerRef.current = setInterval(() => {
        setStopwatchSeconds((sec) => {
          const next = sec + 1;
          const mins = Math.floor(next / 60);
          if (mins > 0 && mins !== Math.floor(sec / 60)) {
            setActForm((f) => ({ ...f, duration_minutes: mins }));
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStopwatchRunning]);

  const toggleStopwatch = () => {
    if (!isStopwatchRunning) {
      setIsStopwatchRunning(true);
    } else {
      setIsStopwatchRunning(false);
      const computedMins = Math.max(1, Math.round(stopwatchSeconds / 60));
      setActForm((f) => ({ ...f, duration_minutes: computedMins }));
    }
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchSeconds(0);
  };

  const formatStopwatch = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- Sub-metric Helper Info ---
  const getSubMetricConfig = (type: string) => {
    switch (type) {
      case 'ROM Exercise':
        return { label: '🎯 Measured ROM Angle', unit: 'degrees (°)', defaultVal: '90' };
      case 'Gait & Ambulation Training':
        return { label: '🚶 Distance Walked', unit: 'meters (m)', defaultVal: '50' };
      case 'Bed Mobility & Transfer':
        return { label: '🛏️ Transfer Reps / Method', unit: 'reps (pivot)', defaultVal: '5' };
      case 'Balance & Proprioception':
        return { label: '⚖️ Single-Leg Stance Duration', unit: 'seconds (s)', defaultVal: '20' };
      default:
        return { label: '❄️ Modality Protocol / Dosage', unit: 'minutes', defaultVal: '15' };
    }
  };

  const subMetricConfig = getSubMetricConfig(actForm.activity_type);

  // --- Feature 2: One-Tap Observation Chips ---
  const addChip = (target: 'act' | 'vit', phrase: string) => {
    if (target === 'act') {
      setActForm((prev) => ({
        ...prev,
        notes: prev.notes ? `${prev.notes} ${phrase}` : phrase,
      }));
    } else {
      setVitalForm((prev) => ({
        ...prev,
        clinical_remarks: prev.clinical_remarks ? `${prev.clinical_remarks} ${phrase}` : phrase,
      }));
    }
  };

  // --- Feature 1: Web Speech Dictation ---
  const toggleVoiceDictation = (target: 'act' | 'vit') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const simulatedText = target === 'act'
        ? 'Patient demonstrated improved active range of motion with minimal verbal cueing.'
        : 'Post-session recovery vitals recorded within safe hemodynamic margins. Patient stable.';
      addChip(target, simulatedText);
      return;
    }

    if (target === 'act') {
      if (isDictatingAct) {
        setIsDictatingAct(false);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsDictatingAct(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        addChip('act', transcript);
      };
      recognition.onend = () => setIsDictatingAct(false);
      recognition.onerror = () => setIsDictatingAct(false);
      recognition.start();
    } else {
      if (isDictatingVit) {
        setIsDictatingVit(false);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsDictatingVit(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        addChip('vit', transcript);
      };
      recognition.onend = () => setIsDictatingVit(false);
      recognition.onerror = () => setIsDictatingVit(false);
      recognition.start();
    }
  };

  // --- Feature 3: Live NEWS2 Score ---
  const liveNews2 = calculateNews2(
    vitalForm.bp_systolic,
    vitalForm.heart_rate,
    vitalForm.spo2,
    vitalForm.temperature_c
  );

  const getNews2Style = (score: number) => {
    if (score === 0) return { style: 'news2-normal', text: 'Normal / Zero Clinical Risk' };
    if (score <= 4) return { style: 'news2-low', text: 'Low Clinical Risk (Ward Monitoring)' };
    if (score <= 6) return { style: 'news2-medium', text: 'Medium Risk (Doctor Assessment Recommended)' };
    return { style: 'news2-high', text: '🚨 High Alert (Immediate Clinical Escalation)' };
  };

  const news2Meta = getNews2Style(liveNews2);

  // --- Form Submissions ---
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedNotes = `[${subMetricConfig.label}: ${subMetricVal} ${subMetricConfig.unit}] ${actForm.notes || ''}`.trim();

    const newEntry: ActivityLog = {
      ...actForm,
      notes: formattedNotes,
      id: Date.now(),
      logged_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voided: false,
    };

    try {
      const res = await fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...actForm, notes: formattedNotes }),
      });
      const data = await res.json();
      if (data?.data?.id) newEntry.id = data.data.id;
    } catch {
      // Standalone mode fallback
    }

    const updated = [newEntry, ...activities];
    setActivities(updated);
    localStorage.setItem('mod5_activity_logs', JSON.stringify(updated));
    setActForm({ ...actForm, notes: '' });
    resetStopwatch();
  };

  const handleCreateVital = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: VitalNote = {
      ...vitalForm,
      news2_score: liveNews2,
      id: Date.now(),
      recorded_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voided: false,
    };

    try {
      const res = await fetch(`${API_BASE}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vitalForm, news2_score: liveNews2 }),
      });
      const data = await res.json();
      if (data?.data?.id) newEntry.id = data.data.id;
    } catch {
      // Standalone mode fallback
    }

    const updated = [newEntry, ...vitals];
    setVitals(updated);
    localStorage.setItem('mod5_vital_notes', JSON.stringify(updated));
    setVitalForm({ ...vitalForm, clinical_remarks: '' });
  };

  // --- Feature 6: Clinical Strike-Through & Voiding (Medical Audit Trail) ---
  const handleVoidRecord = async (id: number | undefined, type: 'activity' | 'vitals') => {
    if (!id) return;
    const reason = window.prompt(
      'Medical Audit Trail: Enter clinical justification for amending/voiding this record:',
      'Recorded under incorrect patient ID / Data entry typo'
    );
    if (!reason) return;

    const auditStamp = `${reason} (Amended by Nurse on ${new Date().toLocaleTimeString()})`;

    try {
      await fetch(`${API_BASE}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, record_type: type, reason: auditStamp }),
      });
    } catch {
      // Standalone mode
    }

    if (type === 'activity') {
      const updated = activities.map((a) => (a.id === id ? { ...a, voided: true, void_reason: auditStamp } : a));
      setActivities(updated);
      localStorage.setItem('mod5_activity_logs', JSON.stringify(updated));
    } else {
      const updated = vitals.map((v) => (v.id === id ? { ...v, voided: true, void_reason: auditStamp } : v));
      setVitals(updated);
      localStorage.setItem('mod5_vital_notes', JSON.stringify(updated));
    }
  };

  // --- Feature 6: CSV Export ---
  const handleExportCsv = () => {
    let csv = '';
    if (activeTab === 'activity') {
      csv = 'ID,Patient ID,Patient Name,Nurse Name,Activity Type,Duration (Mins),Assistance Level,Notes,Logged At,Voided,Audit Reason\n';
      filteredActivities.forEach((a) => {
        const pName = patients.find((p) => p.id === a.patient_id)?.name || a.patient_id;
        csv += `"${a.id || ''}","${a.patient_id}","${pName}","${a.nurse_name}","${a.activity_type}","${a.duration_minutes}","${a.assistance_level}","${(a.notes || '').replace(/"/g, '""')}","${a.logged_at || ''}","${a.voided ? 'YES' : 'NO'}","${(a.void_reason || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csv = 'ID,Patient ID,Patient Name,Nurse Name,BP Systolic,BP Diastolic,Heart Rate,SpO2,Temp C,Pain Score,NEWS2 Score,Remarks,Recorded At,Voided,Audit Reason\n';
      filteredVitals.forEach((v) => {
        const pName = patients.find((p) => p.id === v.patient_id)?.name || v.patient_id;
        csv += `"${v.id || ''}","${v.patient_id}","${pName}","${v.nurse_name}","${v.bp_systolic}","${v.bp_diastolic}","${v.heart_rate}","${v.spo2}","${v.temperature_c}","${v.pain_score}","${v.news2_score ?? 0}","${(v.clinical_remarks || '').replace(/"/g, '""')}","${v.recorded_at || ''}","${v.voided ? 'YES' : 'NO'}","${(v.void_reason || '').replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `physio_module5_${activeTab}_shift_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Feature 6: Dedicated Medical Print Handover Report ---
  const handlePrintHandover = () => {
    const escapeHtml = (str: string = '') =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const generatedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const activePatientObj = patientFilter
      ? patients.find((p) => p.id.toLowerCase() === patientFilter.toLowerCase())
      : null;

    const patientHeaderHtml = activePatientObj
      ? `
        <div class="patient-card">
          <div class="patient-grid">
            <div>
              <div class="patient-label">Patient ID</div>
              <div class="patient-val">${escapeHtml(activePatientObj.id)}</div>
            </div>
            <div>
              <div class="patient-label">Patient Full Name</div>
              <div class="patient-val">${escapeHtml(activePatientObj.name)}</div>
            </div>
            <div>
              <div class="patient-label">Handover Scope</div>
              <div class="patient-val">Single Patient Shift Dossier</div>
            </div>
            <div style="grid-column: span 3; margin-top: 4px;">
              <div class="patient-label">Clinical Diagnosis / Reason for Admission</div>
              <div class="patient-val" style="color: #0d9488;">🩺 ${escapeHtml(activePatientObj.diagnosis || 'Active Rehabilitation Protocol')}</div>
            </div>
          </div>
        </div>
      `
      : `
        <div class="patient-card">
          <div class="patient-grid">
            <div>
              <div class="patient-label">Handover Scope</div>
              <div class="patient-val">All Ward Patients (${patients.length} Active Profiles)</div>
            </div>
            <div>
              <div class="patient-label">Activity Sessions Included</div>
              <div class="patient-val">${filteredActivities.length} Sessions Logged</div>
            </div>
            <div>
              <div class="patient-label">Vitals Records Included</div>
              <div class="patient-val">${filteredVitals.length} Vitals Recorded</div>
            </div>
          </div>
        </div>
      `;

    // Activity Table Rows
    const activityRowsHtml =
      filteredActivities.length === 0
        ? `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 14px;">No rehabilitation activity sessions recorded for this handover scope.</td></tr>`
        : filteredActivities
            .map((a) => {
              const p = patients.find((pat) => pat.id === a.patient_id);
              const pDisplay = p ? `${escapeHtml(p.name)} (${escapeHtml(a.patient_id)})` : escapeHtml(a.patient_id);
              const voidClass = a.voided ? 'voided' : '';
              const voidAudit = a.voided
                ? `<div class="void-stamp">⚠️ VOIDED: ${escapeHtml(a.void_reason || 'Amended in clinical audit')}</div>`
                : '';

              return `
                <tr class="${voidClass}">
                  <td style="white-space: nowrap; font-weight: 600;">${escapeHtml(a.logged_at || '-')}</td>
                  <td>${pDisplay}</td>
                  <td><strong>${escapeHtml(a.activity_type)}</strong></td>
                  <td style="text-align: center;">${a.duration_minutes} mins</td>
                  <td>${escapeHtml(a.assistance_level)}</td>
                  <td>${escapeHtml(a.nurse_name)}</td>
                  <td>
                    <div>${escapeHtml(a.notes || '-')}</div>
                    ${voidAudit}
                  </td>
                </tr>
              `;
            })
            .join('');

    // Vital Table Rows
    const vitalRowsHtml =
      filteredVitals.length === 0
        ? `<tr><td colspan="10" style="text-align: center; color: #64748b; padding: 14px;">No vital sign records recorded for this handover scope.</td></tr>`
        : filteredVitals
            .map((v) => {
              const p = patients.find((pat) => pat.id === v.patient_id);
              const pDisplay = p ? `${escapeHtml(p.name)} (${escapeHtml(v.patient_id)})` : escapeHtml(v.patient_id);
              const isHighBp = v.bp_systolic >= 140 || v.bp_diastolic >= 90;
              const isLowSpo2 = v.spo2 < 95;
              const nScore = v.news2_score ?? calculateNews2(v.bp_systolic, v.heart_rate, v.spo2, v.temperature_c);
              const voidClass = v.voided ? 'voided' : '';
              const voidAudit = v.voided
                ? `<div class="void-stamp">⚠️ VOIDED: ${escapeHtml(v.void_reason || 'Amended in clinical audit')}</div>`
                : '';

              let news2Badge = `<span class="badge badge-normal">NEWS2: ${nScore} (Normal)</span>`;
              if (nScore >= 7) {
                news2Badge = `<span class="badge badge-alert">NEWS2: ${nScore} (HIGH ALERT)</span>`;
              } else if (nScore >= 5) {
                news2Badge = `<span class="badge badge-medium">NEWS2: ${nScore} (Medium)</span>`;
              } else if (nScore > 0) {
                news2Badge = `<span class="badge badge-normal" style="background:#fef9c3; color:#854d0e;">NEWS2: ${nScore} (Low Risk)</span>`;
              }

              return `
                <tr class="${voidClass}">
                  <td style="white-space: nowrap; font-weight: 600;">${escapeHtml(v.recorded_at || '-')}</td>
                  <td>${pDisplay}</td>
                  <td style="${isHighBp ? 'font-weight: bold; color: #b91c1c;' : ''}">${v.bp_systolic}/${v.bp_diastolic}</td>
                  <td>${v.heart_rate} bpm</td>
                  <td style="${isLowSpo2 ? 'font-weight: bold; color: #b91c1c;' : ''}">${v.spo2}%</td>
                  <td>${v.temperature_c}°C</td>
                  <td style="text-align: center; font-weight: 600;">${v.pain_score}/10</td>
                  <td>${news2Badge}</td>
                  <td>${escapeHtml(v.nurse_name)}</td>
                  <td>
                    <div>${escapeHtml(v.clinical_remarks || '-')}</div>
                    ${voidAudit}
                  </td>
                </tr>
              `;
            })
            .join('');

    const reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PhysioSystem Clinical Shift Handover Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.35;
      padding: 10px;
    }
    .report-header {
      border-bottom: 2.5px solid #0d9488;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .brand-subtitle {
      font-size: 8.5pt;
      color: #0d9488;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748b;
    }
    .patient-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0d9488;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 16px;
      font-size: 9pt;
    }
    .patient-label {
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .patient-val {
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 3px;
      margin-top: 14px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 12px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      font-size: 7.5pt;
      text-transform: uppercase;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    tr.voided td {
      text-decoration: line-through;
      color: #94a3b8;
      background: #fff5f5 !important;
    }
    .void-stamp {
      display: block;
      color: #b91c1c;
      font-weight: 700;
      text-decoration: none !important;
      font-size: 7pt;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 700;
    }
    .badge-normal { background: #dcfce7; color: #166534; }
    .badge-medium { background: #ffedd5; color: #9a3412; }
    .badge-alert { background: #fee2e2; color: #991b1b; }
    .signoff-container {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      page-break-inside: avoid;
    }
    .signoff-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 10px 12px;
      background: #fcfcfc;
    }
    .signoff-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .signoff-line {
      margin-top: 14px;
      border-bottom: 1px dotted #94a3b8;
      height: 16px;
    }
    .signoff-label {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .report-footer {
      margin-top: 18px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      text-align: center;
      font-size: 7pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-title">PHYSIOSYSTEM — CLINICAL SHIFT HANDOVER REPORT</div>
      <div class="brand-subtitle">Department of Physical Medicine &amp; Rehabilitation &bull; Nursing Shift Documentation</div>
    </div>
    <div class="header-meta">
      <div><strong>Date/Time:</strong> ${escapeHtml(generatedAt)}</div>
      <div><strong>Classification:</strong> Confidential PHI</div>
    </div>
  </div>

  ${patientHeaderHtml}

  <div class="section-title">
    <span>SECTION 1: REHABILITATION &amp; ACTIVITY LOGS (${filteredActivities.length})</span>
    <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Smart Measured Metrics &amp; Patient Tolerance</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 13%;">Date / Time</th>
        <th style="width: 16%;">Patient</th>
        <th style="width: 18%;">Activity &amp; Metrics</th>
        <th style="width: 9%;">Duration</th>
        <th style="width: 12%;">Assistance</th>
        <th style="width: 12%;">Therapist</th>
        <th style="width: 20%;">Session Notes</th>
      </tr>
    </thead>
    <tbody>
      ${activityRowsHtml}
    </tbody>
  </table>

  <div class="section-title">
    <span>SECTION 2: VITAL SIGNS &amp; NEWS2 CLINICAL RISK SCORING (${filteredVitals.length})</span>
    <span style="font-size: 8pt; font-weight: normal; color: #64748b;">National Early Warning Score Assessment</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Date / Time</th>
        <th style="width: 15%;">Patient</th>
        <th style="width: 9%;">BP (mmHg)</th>
        <th style="width: 8%;">HR</th>
        <th style="width: 7%;">SpO2</th>
        <th style="width: 7%;">Temp</th>
        <th style="width: 7%;">Pain</th>
        <th style="width: 13%;">NEWS2 Status</th>
        <th style="width: 10%;">Nurse</th>
        <th style="width: 12%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${vitalRowsHtml}
    </tbody>
  </table>

  <div class="signoff-container">
    <div class="signoff-box">
      <div class="signoff-title">Outgoing Nurse / Therapist Verification</div>
      <div class="signoff-line"></div>
      <div class="signoff-label">Clinician Full Name (Print)</div>
      <div class="signoff-line"></div>
      <div class="signoff-label">Clinician Signature</div>
      <div class="signoff-line"></div>
      <div class="signoff-label">Date &amp; Time Signed</div>
    </div>

    <div class="signoff-box">
      <div class="signoff-title">Incoming Nurse / Therapist Acceptance</div>
      <div class="signoff-line"></div>
      <div class="signoff-label">Clinician Full Name (Print)</div>
      <div class="signoff-line"></div>
      <div class="signoff-label">Clinician Signature</div>
      <div class="signoff-line"></div>
      <div class="signoff-label">Date &amp; Time Signed</div>
    </div>
  </div>

  <div class="report-footer">
    This document contains protected health information (PHI) intended solely for the medical handover between authorized clinical staff. &copy; PhysioSystem Healthcare.
  </div>
</body>
</html>`;

    // Try opening an isolated print window, with fallback to hidden iframe
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(reportHtml);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }, 350);
      }
    }
  };

  // Helper to strictly match patient IDs across various representations (PT-001, 1, full name)
  const matchesPatient = (entryPatientId: string | number, targetId: string) => {
    if (!targetId || targetId === 'all') return true;
    const eStr = String(entryPatientId).toLowerCase().trim();
    const tStr = String(targetId).toLowerCase().trim();
    if (eStr === tStr) return true;
    // Normalize PT-001 vs 1
    const eNum = eStr.replace('pt-', '').replace(/^0+/, '');
    const tNum = tStr.replace('pt-', '').replace(/^0+/, '');
    if (eNum && tNum && eNum === tNum) return true;
    // Check patient item by name
    const pObj = patients.find((p) => p.id.toLowerCase() === tStr || p.name.toLowerCase() === tStr);
    if (pObj) {
      if (eStr === pObj.id.toLowerCase() || eStr === pObj.name.toLowerCase()) return true;
    }
    return false;
  };

  const handleSelectPatient = (id: string) => {
    setPatientFilter(id);
    if (id) {
      setActForm((prev) => ({ ...prev, patient_id: id }));
      setVitalForm((prev) => ({ ...prev, patient_id: id }));
    }
  };

  // Filtered feeds strictly isolated to the selected patient (or all if empty)
  const filteredActivities = activities.filter((a) => matchesPatient(a.patient_id, patientFilter));
  const filteredVitals = vitals.filter((v) => matchesPatient(v.patient_id, patientFilter));

  const selectedActPatient = patients.find((p) => p.id === actForm.patient_id);
  const selectedVitPatient = patients.find((p) => p.id === vitalForm.patient_id);

  // ==========================================================
  // PATIENT VIEW: LOG PAIN AND SETS
  // ==========================================================
  if (isPatient) {
    const myLogs = activities.filter((a) => a.patient_id === matchedPatient.id);
    const painColors = [
      { max: 0, color: '#10b981', label: 'Zero Pain (Comfortable)', emoji: '😊' },
      { max: 3, color: '#22c55e', label: 'Mild & Manageable', emoji: '🙂' },
      { max: 6, color: '#eab308', label: 'Moderate Discomfort', emoji: '😐' },
      { max: 8, color: '#f97316', label: 'Severe Pain — Rest Advised', emoji: '😣' },
      { max: 10, color: '#ef4444', label: 'Extreme Pain — Contact Clinic', emoji: '😫' },
    ];
    const currentPainMeta = painColors.find((p) => patientPain <= p.max) || painColors[painColors.length - 1];

    return (
      <div className="mod5-patient-portal">
        {/* Patient Portal Header Banner */}
        <div className="mod5-patient-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                🏃 Patient Recovery Portal
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                ID: <strong>{matchedPatient.id}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.35rem 0' }}>
              Log Pain & Completed Sets
            </h1>
            <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.92, maxWidth: '650px' }}>
              Welcome back, <strong>{matchedPatient.name}</strong> ({matchedPatient.diagnosis || 'Rehabilitation Routine'}). 
              Track your daily home routine, completed sets, and pain response so your physiotherapist can adjust your recovery safely.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <PatientAvatar size="lg" patientId={matchedPatient.id} patientName={matchedPatient.name} avatarUrl={matchedPatient.avatar_url} />
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="mod5-patient-stat-grid">
          <div className="mod5-patient-stat-card">
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>CHECK-IN STREAK</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
              🔥 {Math.min(myLogs.length + 1, 7)} Days Active
            </div>
          </div>
          <div className="mod5-patient-stat-card">
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL CHECK-INS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2dd4bf' }}>
              📋 {myLogs.length} Logged
            </div>
          </div>
          <div className="mod5-patient-stat-card">
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>TARGET DOSAGE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa' }}>
              🎯 2 - 3 Sets / Day
            </div>
          </div>
          <div className="mod5-patient-stat-card">
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>SUPERVISING CLINICIAN</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
              🩺 Dr. Sarah Chen, MD
            </div>
          </div>
        </div>

        {/* Success Alert Toast */}
        {patientSubmittedToast && (
          <div className="mod5-toast-success">
            <span>✓</span>
            <div>
              <strong>Recovery check-in successfully recorded!</strong>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Your pain rating and completed sets have been synchronized with Module 6 (Recovery Analytics) for Dr. Chen and your supervising nurse.
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="mod5-main-grid">
          {/* Left: Patient Check-in Form */}
          <div className="mod5-card">
            <form onSubmit={handlePatientSubmit} className="mod5-form">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', margin: '0 0 1rem 0' }}>
                ✍️ Record Today's Exercise & Pain
              </h2>

              {/* 1. Exercise Routine Selection */}
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>1. Select Exercise Performed</label>
                <select
                  value={patientExercise}
                  onChange={(e) => setPatientExercise(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #475569', color: '#ffffff' }}
                >
                  <option value="Quadriceps Isometric Set">Quadriceps Isometric Set (Knee & Quad)</option>
                  <option value="Heel Slides with Strap">Heel Slides with Strap (Flexion & Hamstring)</option>
                  <option value="Upper-Limb Fruit Reach (Rehab Game)">Upper-Limb Fruit Reach (Rehab Game 1)</option>
                  <option value="Sky Glider Trajectory (Rehab Game)">Sky Glider Trajectory (Rehab Game 2)</option>
                  <option value="Neural Hold Stabilizer (Rehab Game)">Neural Hold Stabilizer (Rehab Game 3)</option>
                  <option value="Shoulder Pendulum Swing">Shoulder Pendulum Swing (Shoulder Mobility)</option>
                  <option value="Wall Angels">Wall Angels (Thoracic & Posture)</option>
                  <option value="Walking & Ambulation Practice">Walking & Ambulation Practice</option>
                  <option value="General Home Stretching">General Home Stretching & Mobility</option>
                </select>
              </div>

              {/* 2. Sets and Reps Dosage with Presets */}
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>2. Sets & Repetitions Completed</label>
                
                {/* Quick Dosage Presets */}
                <div className="mod5-preset-pills">
                  <button
                    type="button"
                    onClick={() => { setPatientSets(2); setPatientReps(8); }}
                    className={`mod5-preset-btn ${patientSets === 2 && patientReps === 8 ? 'active' : ''}`}
                  >
                    2 Sets × 8 Reps
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPatientSets(3); setPatientReps(10); }}
                    className={`mod5-preset-btn ${patientSets === 3 && patientReps === 10 ? 'active' : ''}`}
                  >
                    3 Sets × 10 Reps (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPatientSets(3); setPatientReps(12); }}
                    className={`mod5-preset-btn ${patientSets === 3 && patientReps === 12 ? 'active' : ''}`}
                  >
                    3 Sets × 12 Reps
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPatientSets(2); setPatientReps(15); }}
                    className={`mod5-preset-btn ${patientSets === 2 && patientReps === 15 ? 'active' : ''}`}
                  >
                    2 Sets × 15 Reps
                  </button>
                </div>

                <div className="mod5-grid-3">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sets</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={10}
                      value={patientSets}
                      onChange={(e) => setPatientSets(Number(e.target.value))}
                      style={{ width: '100%', textAlign: 'center', fontWeight: 800 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reps / Set</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={50}
                      value={patientReps}
                      onChange={(e) => setPatientReps(Number(e.target.value))}
                      style={{ width: '100%', textAlign: 'center', fontWeight: 800 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Duration (mins)</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={120}
                      value={patientDuration}
                      onChange={(e) => setPatientDuration(Number(e.target.value))}
                      style={{ width: '100%', textAlign: 'center', fontWeight: 800 }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Visual Pain Scale Slider */}
              <div className="mod5-pain-slider-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                    3. Pain Level During / After Exercise
                  </label>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: currentPainMeta.color }}>
                    {currentPainMeta.emoji} {patientPain} / 10
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={10}
                  value={patientPain}
                  onChange={(e) => setPatientPain(Number(e.target.value))}
                  style={{ width: '100%', accentColor: currentPainMeta.color, cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  <span>0 - No Pain 😊</span>
                  <span>5 - Moderate 😐</span>
                  <span>10 - Severe 😫</span>
                </div>

                <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${currentPainMeta.color}`, fontSize: '0.78rem', color: currentPainMeta.color, fontWeight: 700 }}>
                  Clinical Evaluation: {currentPainMeta.label}
                </div>
              </div>

              {/* 4. Perceived Exertion (RPE) */}
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  4. How hard did this feel? (RPE Exertion: <strong>{patientRpe} / 10</strong>)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {[
                    { val: 2, label: 'Light' },
                    { val: 4, label: 'Moderate' },
                    { val: 6, label: 'Somewhat Hard' },
                    { val: 8, label: 'Very Hard' },
                    { val: 10, label: 'Maximum' },
                  ].map((rpe) => (
                    <button
                      key={rpe.val}
                      type="button"
                      onClick={() => setPatientRpe(rpe.val)}
                      className={`mod5-preset-btn ${patientRpe === rpe.val ? 'active' : ''}`}
                      style={{ flex: 1, padding: '0.35rem 0.2rem', textAlign: 'center', fontSize: '0.75rem' }}
                    >
                      {rpe.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Quick Sensation & Symptom Chips */}
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>5. How did your joint & muscles feel?</label>
                <div className="mod5-chips-row" style={{ marginTop: '0.35rem' }}>
                  {[
                    'Completed smoothly without stopping 💪',
                    'Mild stiffness upon starting 🌅',
                    'Applied 5 min ice pack afterwards 🧊',
                    'Felt slight joint click / pop ⚠️',
                    'High energy & good strength today ⚡',
                    'Needed short pause between sets ⏸️',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPatientNotes((prev) => (prev ? `${prev} ${chip}` : chip))}
                      className="mod5-chip-btn"
                    >
                      + {chip.split(' ')[0]} {chip.split(' ')[1]}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Tell your doctor or nurse how you felt (e.g. knee felt steady, slight pain on rep 8)..."
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #475569', color: '#ffffff' }}
                />
              </div>

              <button
                type="submit"
                className="mod5-submit-btn"
                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', marginTop: '1rem', padding: '0.75rem' }}
              >
                💾 Save Today's Recovery Log
              </button>
            </form>
          </div>

          {/* Right: Patient History Feed */}
          <div className="mod5-feed">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                📜 My Past Recovery Check-ins ({myLogs.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Synchronized with Clinical EHR</span>
            </div>

            {myLogs.length === 0 ? (
              <div className="mod5-empty" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                <strong>No recovery check-ins logged yet.</strong>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.4rem 0 0 0' }}>
                  Fill out the form on the left after finishing today's prescribed routine to log your sets and pain rating.
                </p>
              </div>
            ) : (
              myLogs.map((log) => (
                <div key={log.id} className="mod5-patient-history-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{log.activity_type}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                        🕒 {log.logged_at} • Mode: {log.assistance_level}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#0369a1', color: '#ffffff' }}>
                      ⏱️ {log.duration_minutes} mins
                    </span>
                  </div>

                  {log.notes && (
                    <div style={{ background: '#0f172a', padding: '0.55rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#cbd5e1', border: '1px solid #334155', marginTop: '0.4rem' }}>
                      {log.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mod5-container">
      {/* Header with Export & Print Controls */}
      <div className="mod5-header">
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2dd4bf' }}>
            Module 5 • Rehabilitation & Clinical Tracking
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', margin: '0.25rem 0 0 0' }}>Nurse & Activity Logger</h1>
        </div>

        <div className="mod5-controls">
          {/* Pop-Out Vibrant Tab Switcher */}
          <div className="mod5-tab-switch">
            <button
              onClick={() => setActiveTab('activity')}
              className={`mod5-tab-btn tab-act ${activeTab === 'activity' ? 'active' : ''}`}
              title="View physical therapy & exercise tolerance sessions"
            >
              <span>🏃 Activity Logs</span>
              <span className="mod5-tab-badge">{filteredActivities.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('vitals')}
              className={`mod5-tab-btn tab-vit ${activeTab === 'vitals' ? 'active' : ''}`}
              title="View patient hemodynamic vitals & automated NEWS2 scores"
            >
              <span>🩺 Vital Notes & NEWS2</span>
              <span className="mod5-tab-badge">{filteredVitals.length}</span>
            </button>
          </div>



          {/* Patient Filter Dropdown */}
          <select
            value={patientFilter}
            onChange={(e) => handleSelectPatient(e.target.value)}
            className="mod5-filter-input"
            style={{ cursor: 'pointer', fontWeight: 700 }}
          >
            <option value="">👥 All Ward Patients ({patients.length})</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                Focus: {p.id} — {p.name}
              </option>
            ))}
          </select>

          <button onClick={handleExportCsv} className="mod5-export-btn" title="Export shift records to CSV file">
            📥 Export CSV
          </button>
          <button onClick={handlePrintHandover} className="mod5-export-btn" title="Print shift handover dossier with signatures">
            🖨️ Print Handover
          </button>
        </div>
      </div>

      {/* Patient Divide / Focus Bar */}
      <div className="mod5-patient-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
            👤 Patient Records View:
          </span>
        </div>

        <div className="mod5-patient-pills">
          <button
            type="button"
            onClick={() => handleSelectPatient('')}
            className={`mod5-patient-pill ${!patientFilter ? 'active' : ''}`}
            title="Display all patients in the ward"
          >
            <span>👥 All Patients</span>
            <span className="mod5-pill-count">{activeTab === 'activity' ? activities.length : vitals.length}</span>
          </button>
          {patients.map((p) => {
            const count = activeTab === 'activity'
              ? activities.filter((a) => matchesPatient(a.patient_id, p.id)).length
              : vitals.filter((v) => matchesPatient(v.patient_id, p.id)).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPatient(p.id)}
                className={`mod5-patient-pill ${patientFilter === p.id ? 'active' : ''}`}
                title={`Focus chart strictly on ${p.name}`}
              >
                <PatientAvatar size="sm" patientId={p.id} patientName={p.name} avatarUrl={p.avatar_url} />
                <span>{p.name}</span>
                <span className="mod5-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mod5-main-grid">
        {/* Left Column: Input Form */}
        <div className="mod5-card">
          {activeTab === 'activity' ? (
            <form onSubmit={handleCreateActivity} className="mod5-form">
              <h2>Log Patient Activity</h2>

              <div className="mod5-grid-2">
                <div>
                  <label>Select Patient</label>
                  <select
                    required
                    value={actForm.patient_id}
                    onChange={(e) => setActForm({ ...actForm, patient_id: e.target.value })}
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Nurse / Therapist</label>
                  <select
                    required
                    value={actForm.nurse_name}
                    onChange={(e) => setActForm({ ...actForm, nurse_name: e.target.value })}
                  >
                    {nurses.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Recognition Photo Frame Card */}
              {selectedActPatient && (
                <div className="mod5-patient-preview-card">
                  <PatientAvatar
                    size="lg"
                    patientId={selectedActPatient.id}
                    patientName={selectedActPatient.name}
                    avatarUrl={selectedActPatient.avatar_url}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{selectedActPatient.name}</strong>
                      <span className="mod5-tag-patient">{selectedActPatient.id}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#2dd4bf', marginTop: '0.15rem' }}>
                      🩺 {selectedActPatient.diagnosis || 'Rehabilitation In-Progress'}
                    </div>
                    <div className="mod5-photo-badge" style={{ marginTop: '0.2rem' }}>
                      📷 {selectedActPatient.avatar_url ? 'Patient Photo Active' : 'Photo Frame Ready (Module 1 Linked)'}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label>Rehab Activity Type</label>
                <select
                  value={actForm.activity_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setActForm({ ...actForm, activity_type: newType });
                    setSubMetricVal(getSubMetricConfig(newType).defaultVal);
                  }}
                >
                  <option value="ROM Exercise">ROM Exercise (Range of Motion)</option>
                  <option value="Gait & Ambulation Training">Gait & Ambulation Training</option>
                  <option value="Bed Mobility & Transfer">Bed Mobility & Transfer</option>
                  <option value="Balance & Proprioception">Balance & Proprioception</option>
                  <option value="Hydrotherapy / Modality">Hydrotherapy / Modality</option>
                </select>
              </div>

              {/* Feature 4: Smart Dynamic Sub-Metrics */}
              <div className="mod5-submetric-box">
                <div className="mod5-submetric-header">
                  <span className="mod5-submetric-label">{subMetricConfig.label}</span>
                  <span style={{ fontSize: '0.65rem', color: '#2dd4bf', textTransform: 'uppercase', fontWeight: 700 }}>
                    Smart Metric
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={subMetricVal}
                    onChange={(e) => setSubMetricVal(e.target.value)}
                    style={{ width: '100px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{subMetricConfig.unit}</span>
                </div>
              </div>

              {/* Feature 5: Interactive Session Stopwatch & Duration */}
              <div className="mod5-stopwatch-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>
                    ⏱️ Session Stopwatch
                  </span>
                  <span className="mod5-stopwatch-display">{formatStopwatch(stopwatchSeconds)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={toggleStopwatch}
                    className={`mod5-btn-timer ${isStopwatchRunning ? 'paused' : ''}`}
                  >
                    {isStopwatchRunning ? 'Pause Timer' : stopwatchSeconds > 0 ? 'Resume' : 'Start Timer'}
                  </button>
                  <button type="button" onClick={resetStopwatch} className="mod5-btn-timer-reset">
                    Reset
                  </button>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Duration:</span>
                    <input
                      required
                      type="number"
                      min={1}
                      max={240}
                      value={actForm.duration_minutes}
                      onChange={(e) => setActForm({ ...actForm, duration_minutes: Number(e.target.value) })}
                      style={{ width: '60px', textAlign: 'center', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>mins</span>
                  </div>
                </div>
              </div>

              <div>
                <label>Assistance Level</label>
                <select
                  value={actForm.assistance_level}
                  onChange={(e) => setActForm({ ...actForm, assistance_level: e.target.value })}
                >
                  <option>Independent (0% assist)</option>
                  <option>Supervision / Cueing</option>
                  <option>Min Assist (25% effort by therapist)</option>
                  <option>Mod Assist (50% effort by therapist)</option>
                  <option>Max Assist (75%+ assistance)</option>
                </select>
              </div>

              {/* Feature 1 & 2: Dictation & Observation Chips */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label style={{ margin: 0 }}>Session Notes & Observations</label>
                  <button
                    type="button"
                    onClick={() => toggleVoiceDictation('act')}
                    className={`mod5-mic-btn ${isDictatingAct ? 'recording' : ''}`}
                  >
                    <span>🎤</span> {isDictatingAct ? 'Listening...' : 'Voice Dictation'}
                  </button>
                </div>

                <div className="mod5-chips-row">
                  <button type="button" onClick={() => addChip('act', 'Good patient tolerance.')} className="mod5-chip-btn">
                    + Good tolerance
                  </button>
                  <button type="button" onClick={() => addChip('act', 'Smooth gait with quad cane.')} className="mod5-chip-btn">
                    + Quad cane used
                  </button>
                  <button type="button" onClick={() => addChip('act', 'Mild pain on terminal extension.')} className="mod5-chip-btn">
                    + Extension pain
                  </button>
                  <button type="button" onClick={() => addChip('act', '5x Sit-to-stand unassisted.')} className="mod5-chip-btn">
                    + 5x Sit-to-stand
                  </button>
                  <button type="button" onClick={() => addChip('act', 'Fatigue reported towards end.')} className="mod5-chip-btn">
                    + Fatigue cues
                  </button>
                </div>

                <textarea
                  rows={3}
                  placeholder="Document patient tolerance, range achieved, or fatigue cues..."
                  value={actForm.notes}
                  onChange={(e) => setActForm({ ...actForm, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="mod5-submit-btn">
                💾 Save Activity Log
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateVital} className="mod5-form">
              <h2>Record Vital Signs & NEWS2</h2>

              <div className="mod5-grid-2">
                <div>
                  <label>Select Patient</label>
                  <select
                    required
                    value={vitalForm.patient_id}
                    onChange={(e) => setVitalForm({ ...vitalForm, patient_id: e.target.value })}
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Nurse Name</label>
                  <select
                    required
                    value={vitalForm.nurse_name}
                    onChange={(e) => setVitalForm({ ...vitalForm, nurse_name: e.target.value })}
                  >
                    {nurses.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Recognition Photo Frame Card */}
              {selectedVitPatient && (
                <div className="mod5-patient-preview-card">
                  <PatientAvatar
                    size="lg"
                    patientId={selectedVitPatient.id}
                    patientName={selectedVitPatient.name}
                    avatarUrl={selectedVitPatient.avatar_url}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{selectedVitPatient.name}</strong>
                      <span className="mod5-tag-patient-vitals">{selectedVitPatient.id}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginTop: '0.15rem' }}>
                      🩺 {selectedVitPatient.diagnosis || 'Rehabilitation In-Progress'}
                    </div>
                    <div className="mod5-photo-badge" style={{ marginTop: '0.2rem' }}>
                      📷 {selectedVitPatient.avatar_url ? 'Patient Photo Active' : 'Photo Frame Ready (Module 1 Linked)'}
                    </div>
                  </div>
                </div>
              )}

              <div className="mod5-grid-2">
                <div>
                  <label>Systolic BP (mmHg)</label>
                  <input
                    required
                    type="number"
                    value={vitalForm.bp_systolic}
                    onChange={(e) => setVitalForm({ ...vitalForm, bp_systolic: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label>Diastolic BP (mmHg)</label>
                  <input
                    required
                    type="number"
                    value={vitalForm.bp_diastolic}
                    onChange={(e) => setVitalForm({ ...vitalForm, bp_diastolic: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="mod5-grid-3">
                <div>
                  <label>HR (bpm)</label>
                  <input
                    required
                    type="number"
                    value={vitalForm.heart_rate}
                    onChange={(e) => setVitalForm({ ...vitalForm, heart_rate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label>SpO2 (%)</label>
                  <input
                    required
                    type="number"
                    max={100}
                    value={vitalForm.spo2}
                    onChange={(e) => setVitalForm({ ...vitalForm, spo2: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label>Temp (°C)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={vitalForm.temperature_c}
                    onChange={(e) => setVitalForm({ ...vitalForm, temperature_c: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Feature 3: Live NEWS2 Risk Badge Card */}
              <div className={`mod5-news2-card ${news2Meta.style}`}>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                    Automated NEWS2 Score
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.15rem' }}>
                    {news2Meta.text}
                  </div>
                </div>
                <div className="mod5-news2-badge">
                  {liveNews2} pts
                </div>
              </div>

              <div>
                <label>
                  Pain Score (VAS): <span style={{ fontWeight: 700, color: '#2dd4bf' }}>{vitalForm.pain_score} / 10</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={vitalForm.pain_score}
                  onChange={(e) => setVitalForm({ ...vitalForm, pain_score: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#14b8a6', cursor: 'pointer' }}
                />
              </div>

              {/* Feature 1 & 2: Dictation & Observation Chips for Vitals */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label style={{ margin: 0 }}>Clinical Remarks</label>
                  <button
                    type="button"
                    onClick={() => toggleVoiceDictation('vit')}
                    className={`mod5-mic-btn ${isDictatingVit ? 'recording' : ''}`}
                  >
                    <span>🎤</span> {isDictatingVit ? 'Listening...' : 'Voice Dictation'}
                  </button>
                </div>

                <div className="mod5-chips-row">
                  <button type="button" onClick={() => addChip('vit', 'Patient hemodynamically stable.')} className="mod5-chip-btn">
                    + Hemodynamically stable
                  </button>
                  <button type="button" onClick={() => addChip('vit', 'No dizziness on standing.')} className="mod5-chip-btn">
                    + No dizziness
                  </button>
                  <button type="button" onClick={() => addChip('vit', 'Post-exercise recovery normal.')} className="mod5-chip-btn">
                    + Recovery normal
                  </button>
                  <button type="button" onClick={() => addChip('vit', 'Hydration and rest advised.')} className="mod5-chip-btn">
                    + Rest advised
                  </button>
                </div>

                <textarea
                  rows={2}
                  placeholder="Pre/post-session vitals comparison, dizziness, etc."
                  value={vitalForm.clinical_remarks}
                  onChange={(e) => setVitalForm({ ...vitalForm, clinical_remarks: e.target.value })}
                />
              </div>

              <button type="submit" className="mod5-submit-btn">
                💾 Save Vital Note & NEWS2
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Feed / History */}
        <div className="mod5-feed">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #334155' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeTab === 'activity' ? 'Rehab Activity History' : 'Vital Signs & NEWS2 History'}
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0.15rem 0 0 0' }}>
                {patientFilter
                  ? `Showing Only: ${patients.find((p) => p.id === patientFilter)?.name || patientFilter} (${activeTab === 'activity' ? filteredActivities.length : filteredVitals.length} records)`
                  : `All Ward Records (${activeTab === 'activity' ? filteredActivities.length : filteredVitals.length} total)`}
              </h3>
            </div>
            {patientFilter && (
              <button
                type="button"
                onClick={() => handleSelectPatient('')}
                style={{ fontSize: '0.78rem', color: '#38bdf8', background: 'transparent', border: '1px solid #0284c7', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                ✕ Show All
              </button>
            )}
          </div>

          {activeTab === 'activity' ? (
            filteredActivities.length === 0 ? (
              <div className="mod5-empty">
                No activity logs recorded yet. Submit a log on the left to start tracking.
              </div>
            ) : (
              filteredActivities.map((log) => {
                const patientObj = patients.find((p) => p.id === log.patient_id);
                return (
                  <div key={log.id} className={`mod5-entry-card ${log.voided ? 'voided' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <PatientAvatar
                          size="sm"
                          patientId={log.patient_id}
                          patientName={patientObj?.name}
                          avatarUrl={patientObj?.avatar_url}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="mod5-tag-patient">{log.patient_id}</span>
                          <strong className={log.voided ? 'mod5-voided-text' : ''} style={{ color: '#ffffff' }}>
                            {patientObj ? `${patientObj.name} • ` : ''}{log.activity_type}
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{log.logged_at}</span>
                        {!log.voided ? (
                          <button
                            type="button"
                            onClick={() => handleVoidRecord(log.id, 'activity')}
                            className="mod5-btn-void"
                            title="Strike-through and document audit amendment"
                          >
                            Void / Strike
                          </button>
                        ) : (
                          <span className="mod5-badge-voided">VOIDED</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                      <span>⏱️ Duration: <strong>{log.duration_minutes} mins</strong></span>
                      <span>🤝 Assistance: <strong>{log.assistance_level}</strong></span>
                      <span>👩‍⚕️ Nurse: <strong>{log.nurse_name}</strong></span>
                    </div>

                    {log.notes && (
                      <p className={`mod5-notes-quote ${log.voided ? 'mod5-voided-text' : ''}`}>{log.notes}</p>
                    )}

                    {log.voided && log.void_reason && (
                      <div className="mod5-audit-note">
                        ⚠️ <strong>Medical Audit Note:</strong> {log.void_reason}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : filteredVitals.length === 0 ? (
            <div className="mod5-empty">
              No vital notes recorded yet. Record vitals on the left to populate patient history.
            </div>
          ) : (
            filteredVitals.map((v) => {
              const isHighBP = v.bp_systolic >= 140 || v.bp_diastolic >= 90;
              const isLowSpo2 = v.spo2 < 95;
              const patientObj = patients.find((p) => p.id === v.patient_id);
              const news2Score = v.news2_score ?? calculateNews2(v.bp_systolic, v.heart_rate, v.spo2, v.temperature_c);
              const isHighNews2 = news2Score >= 5;

              return (
                <div key={v.id} className={`mod5-entry-card ${v.voided ? 'voided' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <PatientAvatar
                        size="sm"
                        patientId={v.patient_id}
                        patientName={patientObj?.name}
                        avatarUrl={patientObj?.avatar_url}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="mod5-tag-patient-vitals">{v.patient_id}</span>
                          <strong className={v.voided ? 'mod5-voided-text' : ''} style={{ color: '#ffffff' }}>
                            {patientObj?.name || v.patient_id}
                          </strong>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Recorded by {v.nurse_name}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{v.recorded_at}</span>
                      {!v.voided ? (
                        <button
                          type="button"
                          onClick={() => handleVoidRecord(v.id, 'vitals')}
                          className="mod5-btn-void"
                          title="Strike-through and document audit amendment"
                        >
                          Void / Strike
                        </button>
                      ) : (
                        <span className="mod5-badge-voided">VOIDED</span>
                      )}
                    </div>
                  </div>

                  <div className="mod5-vitals-grid">
                    <div className={`mod5-vital-box ${isHighBP ? 'warning-red' : ''}`}>
                      <div className="mod5-vital-label">BP (mmHg)</div>
                      <div className={`mod5-vital-val ${v.voided ? 'mod5-voided-text' : ''}`}>{v.bp_systolic}/{v.bp_diastolic}</div>
                    </div>
                    <div className="mod5-vital-box">
                      <div className="mod5-vital-label">Heart Rate</div>
                      <div className={`mod5-vital-val ${v.voided ? 'mod5-voided-text' : ''}`}>{v.heart_rate} bpm</div>
                    </div>
                    <div className={`mod5-vital-box ${isLowSpo2 ? 'warning-amber' : ''}`}>
                      <div className="mod5-vital-label">SpO2</div>
                      <div className={`mod5-vital-val ${v.voided ? 'mod5-voided-text' : ''}`}>{v.spo2}%</div>
                    </div>
                    <div className="mod5-vital-box">
                      <div className="mod5-vital-label">Temp</div>
                      <div className={`mod5-vital-val ${v.voided ? 'mod5-voided-text' : ''}`}>{v.temperature_c}°C</div>
                    </div>
                    <div className="mod5-vital-box">
                      <div className="mod5-vital-label">Pain (VAS)</div>
                      <div className={`mod5-vital-val ${v.voided ? 'mod5-voided-text' : ''}`}>{v.pain_score}/10</div>
                    </div>
                    <div className={`mod5-vital-box ${isHighNews2 ? 'warning-red' : ''}`}>
                      <div className="mod5-vital-label">NEWS2</div>
                      <div className={`mod5-vital-val ${v.voided ? 'mod5-voided-text' : ''}`}>{news2Score} pts</div>
                    </div>
                  </div>

                  {v.clinical_remarks && (
                    <p className={`mod5-notes-quote ${v.voided ? 'mod5-voided-text' : ''}`}>{v.clinical_remarks}</p>
                  )}

                  {v.voided && v.void_reason && (
                    <div className="mod5-audit-note">
                      ⚠️ <strong>Medical Audit Note:</strong> {v.void_reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NurseActivityLogger;
