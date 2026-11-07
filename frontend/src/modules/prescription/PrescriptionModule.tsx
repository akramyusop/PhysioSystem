import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import {
  TreatmentPlan,
  TreatmentPlanDetail,
  PatientOption,
  CreatePatientPayload,
  UpdatePatientPayload,
  Exercise,
  CreatePrescribedExerciseInput,
} from '../../types';

// ==========================================================
// CLINICAL PROTOCOL TEMPLATES (Point 1)
// ==========================================================
interface ClinicalTemplate {
  id: string;
  name: string;
  targetCondition: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
  recommendedDurationWeeks: number;
  exercises: {
    exerciseNameMatch: string;
    fallbackExerciseId: number;
    sets: number;
    reps: number;
    hold_seconds: number;
    daily_frequency: number;
    safety_notes: string;
  }[];
}

const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'acl-p1',
    name: 'ACL Reconstruction Protocol (Phase 1)',
    targetCondition: 'Post-Op ACL Repair',
    icon: '🦿',
    color: '#0284c7',
    badge: 'Knee • Early Phase',
    description: 'Early quadriceps re-education, patellar glide, and extension restoration.',
    recommendedDurationWeeks: 4,
    exercises: [
      {
        exerciseNameMatch: 'Quadriceps Isometric',
        fallbackExerciseId: 1,
        sets: 3,
        reps: 10,
        hold_seconds: 5,
        daily_frequency: 3,
        safety_notes: 'Keep knee straight; halt if sharp patellar pain exceeds 3/10.',
      },
      {
        exerciseNameMatch: 'Heel Slides',
        fallbackExerciseId: 2,
        sets: 3,
        reps: 12,
        hold_seconds: 0,
        daily_frequency: 2,
        safety_notes: 'Use strap for assistance. Do not force flexion beyond 90° in weeks 1-4.',
      },
    ],
  },
  {
    id: 'frozen-shoulder',
    name: 'Adhesive Capsulitis (Frozen Shoulder)',
    targetCondition: 'Frozen Shoulder / Capsulitis',
    icon: '🧊',
    color: '#059669',
    badge: 'Shoulder • Mobilization',
    description: 'Gentle passive pendular mobility and scapular thoracic gliding.',
    recommendedDurationWeeks: 6,
    exercises: [
      {
        exerciseNameMatch: 'Shoulder Pendulum',
        fallbackExerciseId: 3,
        sets: 2,
        reps: 15,
        hold_seconds: 0,
        daily_frequency: 3,
        safety_notes: 'Arm must stay completely relaxed; torso momentum drives the movement.',
      },
      {
        exerciseNameMatch: 'Wall Angels',
        fallbackExerciseId: 4,
        sets: 2,
        reps: 8,
        hold_seconds: 3,
        daily_frequency: 1,
        safety_notes: 'Slide only to comfortable height without anterior shoulder pinch.',
      },
    ],
  },
  {
    id: 'patellofemoral',
    name: 'Patellofemoral Tracking & Alignment',
    targetCondition: 'Patellar Tendinopathy / Tracking',
    icon: '🏃',
    color: '#d97706',
    badge: 'Knee • Alignment',
    description: 'VMO activation and closed-chain hamstring control.',
    recommendedDurationWeeks: 5,
    exercises: [
      {
        exerciseNameMatch: 'Quadriceps Isometric',
        fallbackExerciseId: 1,
        sets: 3,
        reps: 15,
        hold_seconds: 6,
        daily_frequency: 2,
        safety_notes: 'Ensure knee stays aligned with second toe. Avoid inward knee collapse.',
      },
      {
        exerciseNameMatch: 'Heel Slides',
        fallbackExerciseId: 2,
        sets: 3,
        reps: 10,
        hold_seconds: 2,
        daily_frequency: 2,
        safety_notes: 'Smooth, controlled return phase to train eccentric deceleration.',
      },
    ],
  },
  {
    id: 'rotator-cuff',
    name: 'Rotator Cuff Subacromial Recovery',
    targetCondition: 'Rotator Cuff Impingement',
    icon: '🔄',
    color: '#7c3aed',
    badge: 'Upper Back & Shoulder',
    description: 'Scapular retraction, thoracic extension, and rotator cuff re-activation.',
    recommendedDurationWeeks: 6,
    exercises: [
      {
        exerciseNameMatch: 'Shoulder Pendulum',
        fallbackExerciseId: 3,
        sets: 3,
        reps: 12,
        hold_seconds: 0,
        daily_frequency: 2,
        safety_notes: 'Do not lift arm actively; passive gravity-assisted arc only.',
      },
      {
        exerciseNameMatch: 'Wall Angels',
        fallbackExerciseId: 4,
        sets: 3,
        reps: 10,
        hold_seconds: 4,
        daily_frequency: 2,
        safety_notes: 'Maintain chin tuck and flat lumbar spine against wall.',
      },
    ],
  },
];

export const PrescriptionModule: React.FC = () => {
  // Master state
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter (Point 2)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  // Plan detail modal
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<TreatmentPlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Print Take-Home Sheet Modal (Point 3)
  const [printPlan, setPrintPlan] = useState<TreatmentPlanDetail | null>(null);

  // Form State: Create / Edit Plan (Point 4)
  const [showBuilder, setShowBuilder] = useState<boolean>(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [doctorId] = useState<number>(1); // Dr. Sarah Chen, MD
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planStatus, setPlanStatus] = useState<'active' | 'paused' | 'completed'>('active');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [prescribedRows, setPrescribedRows] = useState<CreatePrescribedExerciseInput[]>([
    { exercise_id: 1, sets: 3, reps: 10, hold_seconds: 5, daily_frequency: 2, safety_notes: '' },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Patient Management Modals (New Feature: Add & Update Patient)
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState<boolean>(false);

  // New Patient Form State
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientGender, setNewPatientGender] = useState<string>('Male');
  const [newPatientDob, setNewPatientDob] = useState<string>('1995-04-12');
  const [newPatientDiagnosis, setNewPatientDiagnosis] = useState<string>('');
  const [newPatientRom, setNewPatientRom] = useState<number | ''>(75);
  const [newPatientNotes, setNewPatientNotes] = useState<string>('');
  const [patientSaving, setPatientSaving] = useState<boolean>(false);

  // Edit Patient Form State
  const [editPatientDiagnosis, setEditPatientDiagnosis] = useState<string>('');
  const [editPatientRom, setEditPatientRom] = useState<number | ''>(85);
  const [editPatientNotes, setEditPatientNotes] = useState<string>('');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, patientsData, exercisesData] = await Promise.all([
        api.getTreatmentPlans(),
        api.getPrescriptionPatients(),
        api.getExercises(),
      ]);

      if (plansData && plansData.length > 0) {
        setPlans(plansData);
      } else {
        setPlans([
          {
            id: 1,
            patient_id: 1,
            patient_name: 'John Doe',
            patient_diagnosis: 'Post-Op Right ACL Reconstruction',
            doctor_id: 1,
            doctor_name: 'Dr. Sarah Chen, MD',
            title: 'Phase 1 ACL Recovery Protocol',
            status: 'active',
            start_date: '2026-10-15',
            end_date: '2026-12-01',
            exercise_count: 2,
          },
          {
            id: 2,
            patient_id: 2,
            patient_name: 'Emily Rose',
            patient_diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Left)',
            doctor_id: 1,
            doctor_name: 'Dr. Sarah Chen, MD',
            title: 'Shoulder Mobility & Pain Reduction',
            status: 'active',
            start_date: '2026-10-20',
            end_date: '2026-11-30',
            exercise_count: 1,
          },
        ]);
      }

      if (patientsData && patientsData.length > 0) {
        setPatients(patientsData);
        setSelectedPatientId(patientsData[0].patient_profile_id);
      } else {
        const fallbackPatients: PatientOption[] = [
          {
            patient_profile_id: 1,
            user_id: 3,
            full_name: 'John Doe',
            gender: 'Male',
            date_of_birth: '1992-05-14',
            injury_diagnosis: 'Post-Op Right ACL Reconstruction',
            baseline_rom_score: 85.0,
            notes: 'Surgery 3 weeks ago. Focus on extension and quad activation.',
          },
          {
            patient_profile_id: 2,
            user_id: 4,
            full_name: 'Emily Rose',
            gender: 'Female',
            date_of_birth: '1985-11-20',
            injury_diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Left)',
            baseline_rom_score: 45.0,
            notes: 'Stage 2 freezing phase. Moderate stiffness, avoid forced abduction.',
          },
        ];
        setPatients(fallbackPatients);
        setSelectedPatientId(1);
      }

      if (exercisesData && exercisesData.length > 0) {
        setAvailableExercises(exercisesData);
      } else {
        setAvailableExercises([
          { id: 1, name: 'Quadriceps Isometric Set', description: 'Tighten thigh muscles.', target_body_part: 'Knee / Quadriceps', difficulty: 'easy' },
          { id: 2, name: 'Heel Slides with Strap', description: 'Slowly slide heel toward buttocks.', target_body_part: 'Knee / Hamstring', difficulty: 'medium' },
          { id: 3, name: 'Shoulder Pendulum Swing', description: 'Gentle circles with injured arm.', target_body_part: 'Shoulder', difficulty: 'easy' },
          { id: 4, name: 'Wall Angels', description: 'Back against wall, slide arms upward.', target_body_part: 'Upper Back & Shoulder', difficulty: 'medium' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load prescription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Currently selected patient object for Context Preview (Point 2)
  const currentPatientContext = useMemo(() => {
    return patients.find(p => p.patient_profile_id === Number(selectedPatientId));
  }, [patients, selectedPatientId]);

  // Point 3: Daily Workout Time Calculator
  const estimatedWorkoutTime = useMemo(() => {
    if (!prescribedRows || prescribedRows.length === 0) return { sessionMins: 0, dailyMins: 0, level: 'Gentle' };

    let totalSecondsPerSession = 0;
    let maxCadence = 1;

    prescribedRows.forEach(row => {
      const sets = Number(row.sets) || 1;
      const reps = Number(row.reps) || 1;
      const hold = Number(row.hold_seconds) || 0;
      const cadence = Number(row.daily_frequency) || 1;
      if (cadence > maxCadence) maxCadence = cadence;

      // 3 seconds per dynamic rep + hold seconds per rep + 30s rest between sets
      const workTime = sets * reps * (3 + hold);
      const restTime = Math.max(0, sets - 1) * 30;
      totalSecondsPerSession += workTime + restTime;
    });

    const sessionMins = Math.round(totalSecondsPerSession / 60);
    const dailyMins = sessionMins * maxCadence;

    let level = 'Gentle';
    if (dailyMins > 30) level = 'Intensive';
    else if (dailyMins >= 15) level = 'Moderate';

    return { sessionMins, dailyMins, maxCadence, level };
  }, [prescribedRows]);

  // Point 1: Apply Clinical Template
  const handleApplyTemplate = (template: ClinicalTemplate) => {
    setPlanTitle(template.name);
    const d = new Date(startDate || new Date().toISOString().split('T')[0]);
    d.setDate(d.getDate() + template.recommendedDurationWeeks * 7);
    setEndDate(d.toISOString().split('T')[0]);

    const newRows: CreatePrescribedExerciseInput[] = template.exercises.map(tEx => {
      const match = availableExercises.find(ex =>
        ex.name.toLowerCase().includes(tEx.exerciseNameMatch.toLowerCase())
      );
      return {
        exercise_id: match ? match.id : tEx.fallbackExerciseId,
        sets: tEx.sets,
        reps: tEx.reps,
        hold_seconds: tEx.hold_seconds,
        daily_frequency: tEx.daily_frequency,
        safety_notes: tEx.safety_notes,
      };
    });

    setPrescribedRows(newRows);
    showMessage(`⚡ Applied "${template.name}" with ${newRows.length} clinical exercises!`, 'success');
  };

  // Point 4: Enter Edit Mode
  const handleStartEdit = async (plan: TreatmentPlan) => {
    setDetailLoading(true);
    setEditingPlanId(plan.id);
    setSelectedPatientId(plan.patient_id);
    setPlanTitle(plan.title);
    setPlanStatus(plan.status);
    setStartDate(plan.start_date);
    setEndDate(plan.end_date || '');

    const detail = await api.getTreatmentPlanDetail(plan.id);
    if (detail && detail.exercises && detail.exercises.length > 0) {
      setPrescribedRows(
        detail.exercises.map(ex => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          hold_seconds: ex.hold_seconds || 0,
          daily_frequency: ex.daily_frequency || 1,
          safety_notes: ex.safety_notes || '',
        }))
      );
    } else {
      setPrescribedRows([
        { exercise_id: 1, sets: 3, reps: 10, hold_seconds: 5, daily_frequency: 2, safety_notes: '' },
      ]);
    }

    setDetailLoading(false);
    setShowBuilder(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel Builder / Reset
  const handleCancelBuilder = () => {
    setShowBuilder(false);
    setEditingPlanId(null);
    setPlanTitle('');
    setEndDate('');
    setPlanStatus('active');
    setPrescribedRows([
      { exercise_id: availableExercises[0]?.id || 1, sets: 3, reps: 10, hold_seconds: 5, daily_frequency: 2, safety_notes: '' },
    ]);
  };

  // Submit Plan (Create or Update with Graceful Fallback)
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) {
      showMessage('Please provide a title for the treatment plan.', 'error');
      return;
    }

    setSubmitting(true);

    if (editingPlanId) {
      // UPDATE PLAN
      const payload = {
        title: planTitle.trim(),
        start_date: startDate,
        end_date: endDate.trim() ? endDate : undefined,
        status: planStatus,
        exercises: prescribedRows.map((row, idx) => ({
          exercise_id: Number(row.exercise_id),
          sets: Number(row.sets) || 3,
          reps: Number(row.reps) || 10,
          hold_seconds: Number(row.hold_seconds) || 0,
          daily_frequency: Number(row.daily_frequency) || 1,
          safety_notes: row.safety_notes?.trim() || undefined,
          order_index: idx + 1,
        })),
      };

      const res = await api.updateTreatmentPlan(editingPlanId, payload);
      setSubmitting(false);

      if (res.success) {
        showMessage(`✅ Treatment plan #${editingPlanId} successfully updated!`, 'success');
        handleCancelBuilder();
        loadData();
      } else {
        // Fallback update in state (backend offline)
        setPlans(prev =>
          prev.map(p =>
            p.id === editingPlanId
              ? {
                ...p,
                title: planTitle.trim(),
                start_date: startDate,
                end_date: endDate.trim() ? endDate : undefined,
                status: planStatus,
                exercise_count: prescribedRows.length,
              }
              : p
          )
        );
        showMessage(
          `✅ Plan #${editingPlanId} updated in local view! (Note: Start 'cargo run' in backend for SQLite persistence)`,
          'success'
        );
        handleCancelBuilder();
      }
    } else {
      // CREATE PLAN
      const payload = {
        patient_id: Number(selectedPatientId),
        doctor_id: Number(doctorId),
        title: planTitle.trim(),
        start_date: startDate,
        end_date: endDate.trim() ? endDate : undefined,
        exercises: prescribedRows.map((row, idx) => ({
          exercise_id: Number(row.exercise_id),
          sets: Number(row.sets) || 3,
          reps: Number(row.reps) || 10,
          hold_seconds: Number(row.hold_seconds) || 0,
          daily_frequency: Number(row.daily_frequency) || 1,
          safety_notes: row.safety_notes?.trim() || undefined,
          order_index: idx + 1,
        })),
      };

      const res = await api.createTreatmentPlan(payload);
      setSubmitting(false);

      if (res.success) {
        showMessage(res.message || 'Treatment plan issued successfully!', 'success');
        handleCancelBuilder();
        loadData();
      } else {
        // Fallback save in state (when backend server is offline)
        const patientObj = patients.find(p => p.patient_profile_id === Number(selectedPatientId));
        const newLocalPlan: TreatmentPlan = {
          id: (plans.length > 0 ? Math.max(...plans.map(p => p.id)) : 0) + 1,
          patient_id: Number(selectedPatientId),
          patient_name: patientObj?.full_name || `Patient #${selectedPatientId}`,
          patient_diagnosis: patientObj?.injury_diagnosis || 'Clinical Rehabilitation',
          doctor_id: Number(doctorId),
          doctor_name: 'Dr. Sarah Chen, MD',
          title: planTitle.trim(),
          status: 'active',
          start_date: startDate,
          end_date: endDate.trim() ? endDate : undefined,
          exercise_count: prescribedRows.length,
        };

        setPlans(prev => [newLocalPlan, ...prev]);
        showMessage(
          '✅ Treatment plan issued and saved locally! (Note: Boot backend with cargo run to save permanently in SQLite)',
          'success'
        );
        handleCancelBuilder();
      }
    }
  };

  // View Plan Detail Modal
  const handleViewPlan = async (planId: number) => {
    setDetailLoading(true);
    const detail = await api.getTreatmentPlanDetail(planId);
    if (detail) {
      setSelectedPlanDetail(detail);
    } else {
      const local = plans.find(p => p.id === planId);
      if (local) {
        setSelectedPlanDetail({
          ...local,
          exercises: [
            {
              id: 101,
              plan_id: planId,
              exercise_id: 1,
              exercise_name: 'Quadriceps Isometric Set',
              target_body_part: 'Knee / Quadriceps',
              difficulty: 'easy',
              sets: 3,
              reps: 10,
              hold_seconds: 5,
              daily_frequency: 3,
              safety_notes: 'Stop if sharp knee pain exceeds 3/10.',
            },
          ],
        });
      }
    }
    setDetailLoading(false);
  };

  // Open Print Sheet (Point 3)
  const handleOpenPrint = async (plan: TreatmentPlan) => {
    const detail = await api.getTreatmentPlanDetail(plan.id);
    if (detail) {
      setPrintPlan(detail);
    } else {
      setPrintPlan({
        ...plan,
        exercises: [
          {
            id: 1,
            plan_id: plan.id,
            exercise_id: 1,
            exercise_name: 'Quadriceps Isometric Set',
            target_body_part: 'Knee / Quadriceps',
            difficulty: 'easy',
            sets: 3,
            reps: 10,
            hold_seconds: 5,
            daily_frequency: 3,
            safety_notes: 'Maintain patellar extension.',
          },
        ],
      });
    }
  };

  // Inline Status Change
  const handleStatusChange = async (planId: number, newStatus: 'active' | 'paused' | 'completed') => {
    setPlans(prev => prev.map(p => (p.id === planId ? { ...p, status: newStatus } : p)));
    if (selectedPlanDetail && selectedPlanDetail.id === planId) {
      setSelectedPlanDetail({ ...selectedPlanDetail, status: newStatus });
    }
    const res = await api.updatePlanStatus(planId, newStatus);
    if (res.success) {
      showMessage(`Plan #${planId} status updated to ${newStatus}`, 'success');
    } else {
      showMessage(`Plan #${planId} status updated in local view`, 'success');
    }
  };

  // Delete Plan
  const handleDeletePlan = async (planId: number) => {
    if (!window.confirm(`Permanently delete Treatment Plan #${planId}?`)) return;
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (selectedPlanDetail && selectedPlanDetail.id === planId) {
      setSelectedPlanDetail(null);
    }
    const res = await api.deleteTreatmentPlan(planId);
    if (res.success) {
      showMessage(`Treatment plan #${planId} deleted`, 'success');
    } else {
      showMessage(`Treatment plan #${planId} removed from local view`, 'success');
    }
  };

  // Exercise Row Management
  const handleAddExerciseRow = () => {
    const firstId = availableExercises[0]?.id || 1;
    setPrescribedRows(prev => [
      ...prev,
      { exercise_id: firstId, sets: 3, reps: 10, hold_seconds: 0, daily_frequency: 1, safety_notes: '' },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    if (prescribedRows.length <= 1) return;
    setPrescribedRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateRow = (index: number, field: keyof CreatePrescribedExerciseInput, value: any) => {
    setPrescribedRows(prev =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  // Register New Patient Handler
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientDiagnosis.trim()) {
      showMessage('Please provide patient name and injury diagnosis.', 'error');
      return;
    }

    setPatientSaving(true);
    const payload: CreatePatientPayload = {
      full_name: newPatientName.trim(),
      gender: newPatientGender,
      date_of_birth: newPatientDob,
      injury_diagnosis: newPatientDiagnosis.trim(),
      baseline_rom_score: Number(newPatientRom) || undefined,
      notes: newPatientNotes.trim() || undefined,
    };

    const res = await api.createPrescriptionPatient(payload);
    setPatientSaving(false);

    const generatedId =
      res.data || (patients.length > 0 ? Math.max(...patients.map(p => p.patient_profile_id)) : 0) + 1;

    const createdPatient: PatientOption = {
      patient_profile_id: generatedId,
      user_id: 100 + generatedId,
      full_name: newPatientName.trim(),
      gender: newPatientGender,
      date_of_birth: newPatientDob,
      injury_diagnosis: newPatientDiagnosis.trim(),
      baseline_rom_score: Number(newPatientRom) || undefined,
      notes: newPatientNotes.trim(),
    };

    setPatients(prev => [createdPatient, ...prev]);
    setSelectedPatientId(createdPatient.patient_profile_id);
    setShowNewPatientModal(false);

    // Reset Form
    setNewPatientName('');
    setNewPatientDiagnosis('');
    setNewPatientNotes('');
    setNewPatientRom(75);

    showMessage(`🎉 Patient "${createdPatient.full_name}" registered & selected!`, 'success');
  };

  // Edit Existing Patient Handler
  const handleOpenEditPatient = () => {
    if (!currentPatientContext) return;
    setEditPatientDiagnosis(currentPatientContext.injury_diagnosis);
    setEditPatientRom(currentPatientContext.baseline_rom_score || 0);
    setEditPatientNotes(currentPatientContext.notes || '');
    setShowEditPatientModal(true);
  };

  const handleSaveEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatientContext) return;

    const payload: UpdatePatientPayload = {
      injury_diagnosis: editPatientDiagnosis.trim(),
      baseline_rom_score: Number(editPatientRom) || undefined,
      notes: editPatientNotes.trim() || undefined,
    };

    setPatientSaving(true);
    await api.updatePrescriptionPatient(currentPatientContext.patient_profile_id, payload);
    setPatientSaving(false);

    // Update in local state
    setPatients(prev =>
      prev.map(p =>
        p.patient_profile_id === currentPatientContext.patient_profile_id
          ? {
            ...p,
            injury_diagnosis: payload.injury_diagnosis,
            baseline_rom_score: payload.baseline_rom_score,
            notes: payload.notes,
          }
          : p
      )
    );

    // Update in plans list as well
    setPlans(prev =>
      prev.map(p =>
        p.patient_id === currentPatientContext.patient_profile_id
          ? { ...p, patient_diagnosis: payload.injury_diagnosis }
          : p
      )
    );

    setShowEditPatientModal(false);
    showMessage(`Clinical profile for "${currentPatientContext.full_name}" updated!`, 'success');
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Filtered Plans Search (Point 2)
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.title.toLowerCase().includes(term) ||
        (p.patient_name && p.patient_name.toLowerCase().includes(term)) ||
        (p.patient_diagnosis && p.patient_diagnosis.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [plans, statusFilter, searchTerm]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: '12px',
          padding: '1.75rem 2rem',
          color: 'white',
          marginBottom: '2rem',
          boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.2)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Module 2 • Doctor Workspace
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Clinical Prescriptions & Regimens
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Rehabilitation Prescription Planner
          </h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.95rem', maxWidth: '650px' }}>
            Design individualized clinical regimens, load evidence-based protocol templates, and print take-home recovery schedules.
          </p>
        </div>

        <button
          onClick={() => {
            if (showBuilder) handleCancelBuilder();
            else {
              setEditingPlanId(null);
              setShowBuilder(true);
            }
          }}
          style={{
            backgroundColor: showBuilder ? '#f1f5f9' : '#ffffff',
            color: showBuilder ? '#0f172a' : '#0284c7',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.4rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          {showBuilder ? '✕ Exit Builder' : '⚡ Issue New Prescription'}
        </button>
      </div>

      {/* NOTIFICATION TOAST */}
      {message && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ==========================================================
          PRESCRIPTION BUILDER & EDITOR
      ========================================================== */}
      {showBuilder && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '2px solid #0284c7',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2.5rem',
            boxShadow: '0 20px 25px -5px rgba(2, 132, 199, 0.1), 0 8px 10px -6px rgba(2, 132, 199, 0.1)',
          }}
        >
          {/* Builder Title Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    backgroundColor: editingPlanId ? '#fef3c7' : '#e0f2fe',
                    color: editingPlanId ? '#b45309' : '#0284c7',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {editingPlanId ? `Editing Plan #${editingPlanId}` : 'New Prescription Mode'}
                </span>
                <h3 style={{ fontSize: '1.4rem', color: '#0f172a', margin: 0 }}>
                  {editingPlanId ? 'Modify Treatment Regimen' : 'Clinical Prescription Builder'}
                </h3>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                Select clinical templates, calibrate repetitions, and observe dynamic daily commitment metrics.
              </p>
            </div>

            {/* Prescribing Doctor Badge */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🩺</span>
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>Dr. Sarah Chen, MD</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Chief Physiotherapist (ID #1)</div>
              </div>
            </div>
          </div>

          {/* POINT 1: CLINICAL PROTOCOL TEMPLATES CAROUSEL */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                ⚡ One-Click Evidence-Based Clinical Templates:
              </label>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Auto-populates exercises, target hold seconds & precautions
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {CLINICAL_TEMPLATES.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = tmpl.color;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${tmpl.color}25`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.3rem' }}>{tmpl.icon}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: `${tmpl.color}15`,
                          color: tmpl.color,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {tmpl.badge}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginTop: '0.4rem' }}>
                      {tmpl.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', lineHeight: '1.4' }}>
                      {tmpl.description}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: '0.6rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: tmpl.color,
                      fontWeight: 600,
                    }}
                  >
                    <span>{tmpl.recommendedDurationWeeks} Weeks Protocol</span>
                    <span>Apply ➔</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitPlan}>
            {/* ROW 1: PATIENT SELECTION & PLAN TITLE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    Target Patient *
                  </label>
                  {/* BUTTON: REGISTER NEW PATIENT */}
                  <button
                    type="button"
                    onClick={() => setShowNewPatientModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ＋ Register New Patient
                  </button>
                </div>

                <select
                  value={selectedPatientId}
                  disabled={editingPlanId !== null}
                  onChange={e => setSelectedPatientId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: editingPlanId !== null ? '#f1f5f9' : '#ffffff',
                    fontWeight: 500,
                  }}
                  required
                >
                  {patients.map(p => (
                    <option key={p.patient_profile_id} value={p.patient_profile_id}>
                      {p.full_name} — {p.injury_diagnosis}
                    </option>
                  ))}
                </select>
                {editingPlanId && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    * Patient locked during plan editing to preserve clinical continuity.
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Prescription / Protocol Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Phase 1 Post-Op ACL Recovery Protocol"
                  value={planTitle}
                  onChange={e => setPlanTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                  required
                />
              </div>
            </div>

            {/* POINT 2: PATIENT CLINICAL CONTEXT PREVIEW & EDIT CARD */}
            {currentPatientContext && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1.6fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700 }}>
                    Patient Clinical Record
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {currentPatientContext.full_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {currentPatientContext.gender || 'Patient'} • DOB: {currentPatientContext.date_of_birth || 'N/A'}
                  </div>
                </div>

                {/* Range of Motion Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    <span style={{ color: '#475569' }}>Baseline ROM Score</span>
                    <span style={{ color: '#0284c7' }}>
                      {currentPatientContext.baseline_rom_score ? `${currentPatientContext.baseline_rom_score}°` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round(((currentPatientContext.baseline_rom_score || 0) / 140) * 100))}%`,
                        backgroundColor:
                          (currentPatientContext.baseline_rom_score || 0) < 60 ? '#f59e0b' : '#0284c7',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Target functional ROM: ~135°</span>
                </div>

                {/* Clinical Intake Notes */}
                <div style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                    Diagnosis & Notes:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', fontStyle: 'italic', marginTop: '0.15rem' }}>
                    "{currentPatientContext.injury_diagnosis} — {currentPatientContext.notes || 'No intake notes'}"
                  </div>
                </div>

                {/* BUTTON: UPDATE PATIENT DETAILS */}
                <div>
                  <button
                    type="button"
                    onClick={handleOpenEditPatient}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0284c7',
                      padding: '0.45rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✏️ Update Patient
                  </button>
                </div>
              </div>
            )}

            {/* ROW 3: DATES & STATUS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Protocol Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Protocol Status
                </label>
                <select
                  value={planStatus}
                  onChange={e => setPlanStatus(e.target.value as any)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="active">Active (Currently Prescribed)</option>
                  <option value="paused">Paused (Clinical Hold)</option>
                  <option value="completed">Completed (Discharged / Next Phase)</option>
                </select>
              </div>
            </div>

            {/* POINT 3: DYNAMIC WORKOUT COMMITMENT CALCULATOR */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a' }}>
                    Calculated Patient Rehab Load: {estimatedWorkoutTime.sessionMins} mins / session
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                    Estimated total daily commitment: <strong>{estimatedWorkoutTime.dailyMins} mins / day</strong> ({estimatedWorkoutTime.maxCadence}x daily cadence)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#1e3a8a', fontWeight: 600 }}>Workload Intensity:</span>
                <span
                  style={{
                    backgroundColor:
                      estimatedWorkoutTime.level === 'Gentle'
                        ? '#dcfce7'
                        : estimatedWorkoutTime.level === 'Moderate'
                          ? '#fef3c7'
                          : '#fee2e2',
                    color:
                      estimatedWorkoutTime.level === 'Gentle'
                        ? '#15803d'
                        : estimatedWorkoutTime.level === 'Moderate'
                          ? '#b45309'
                          : '#b91c1c',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                  }}
                >
                  {estimatedWorkoutTime.level}
                </span>
              </div>
            </div>

            {/* PRESCRIBED EXERCISE ROWS SECTION */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Prescribed Exercise Regimen ({prescribedRows.length} item{prescribedRows.length > 1 ? 's' : ''})
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Calibrate dosage: sets, repetitions, isometric hold duration, and daily frequency.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddExerciseRow}
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  ＋ Add Another Exercise
                </button>
              </div>

              {prescribedRows.map((row, idx) => {
                const exerciseObj = availableExercises.find(e => e.id === row.exercise_id);
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      padding: '1.2rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            backgroundColor: '#0284c7',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                          Exercise Parameter Configuration
                        </span>
                        {exerciseObj && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              backgroundColor: '#e2e8f0',
                              color: '#475569',
                              borderRadius: '4px',
                            }}
                          >
                            {exerciseObj.target_body_part} • {exerciseObj.difficulty}
                          </span>
                        )}
                      </div>

                      {prescribedRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExerciseRow(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          ✕ Remove Row
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                          Target Exercise (Module 3)
                        </label>
                        <select
                          value={row.exercise_id}
                          onChange={e => handleUpdateRow(idx, 'exercise_id', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 500 }}
                        >
                          {availableExercises.map(ex => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name} ({ex.target_body_part})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                          Sets (Count)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={row.sets}
                          onChange={e => handleUpdateRow(idx, 'sets', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                          Reps (Count)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={row.reps}
                          onChange={e => handleUpdateRow(idx, 'reps', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                          Isometric Hold (sec)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={row.hold_seconds}
                          onChange={e => handleUpdateRow(idx, 'hold_seconds', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                          Cadence / Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={row.daily_frequency}
                          onChange={e => handleUpdateRow(idx, 'daily_frequency', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                        Clinical Safety Notes & Contraindications
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Stop immediately if pain exceeds 4/10 or acute swelling occurs."
                        value={row.safety_notes || ''}
                        onChange={e => handleUpdateRow(idx, 'safety_notes', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUBMIT / CANCEL BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleCancelBuilder}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: editingPlanId ? '#059669' : '#0284c7',
                  color: 'white',
                  border: 'none',
                  padding: '0.65rem 1.8rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting
                  ? 'Saving to Database...'
                  : editingPlanId
                    ? '💾 Save Plan Changes'
                    : '✅ Confirm & Issue Prescription'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================================
          MASTER TREATMENT PLANS LIST & SEARCH (Point 2)
      ========================================================== */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Controls Bar: Search & Status Filters */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Search Bar (Point 2) */}
          <div style={{ position: 'relative', minWidth: '320px', flex: '1 1 320px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '1rem',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by patient name, diagnosis, or plan title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.3rem',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            {(['all', 'active', 'paused', 'completed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  background: statusFilter === tab ? '#ffffff' : 'transparent',
                  color: statusFilter === tab ? '#0284c7' : '#64748b',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: statusFilter === tab ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  textTransform: 'capitalize',
                  transition: 'all 0.1s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Results Header Count */}
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
          Showing <strong>{filteredPlans.length}</strong> treatment plan{filteredPlans.length === 1 ? '' : 's'}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>

        {/* Plan Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            Loading active prescriptions from SQLite...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontWeight: 700, color: '#334155' }}>No treatment plans found</div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 1rem' }}>
              No plans match your current search query or filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setShowBuilder(true);
              }}
              style={{
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ＋ Prescribe First Regimen
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredPlans.map(plan => {
              const isActive = plan.status === 'active';
              const isPaused = plan.status === 'paused';

              return (
                <div
                  key={plan.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#93c5fd';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 12px rgba(2, 132, 199, 0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          {plan.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            backgroundColor: isActive ? '#dcfce7' : isPaused ? '#fef3c7' : '#f1f5f9',
                            color: isActive ? '#15803d' : isPaused ? '#b45309' : '#475569',
                            border: `1px solid ${isActive ? '#bbf7d0' : isPaused ? '#fde68a' : '#e2e8f0'}`,
                            textTransform: 'capitalize',
                          }}
                        >
                          ● {plan.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '0.35rem' }}>
                        Patient: <strong>{plan.patient_name || `Patient #${plan.patient_id}`}</strong>{' '}
                        {plan.patient_diagnosis && (
                          <span style={{ color: '#0284c7', fontWeight: 500 }}>
                            • {plan.patient_diagnosis}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        value={plan.status}
                        onChange={e => handleStatusChange(plan.id, e.target.value as any)}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        onClick={() => handleViewPlan(plan.id)}
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          border: '1px solid #bae6fd',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        👁️ Inspect Regimen
                      </button>

                      <button
                        onClick={() => handleStartEdit(plan)}
                        style={{
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit Plan
                      </button>

                      <button
                        onClick={() => handleOpenPrint(plan)}
                        title="Print Patient Take-Home Sheet"
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🖨️ Print Sheet
                      </button>

                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        title="Delete Plan"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          padding: '0.4rem',
                          cursor: 'pointer',
                          fontSize: '1rem',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94a3b8')}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: '#64748b',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.65rem',
                    }}
                  >
                    <span>
                      Prescribed by: <strong>{plan.doctor_name || 'Dr. Sarah Chen, MD'}</strong> •{' '}
                      <strong>{plan.exercise_count || 1}</strong> Exercises Assigned
                    </span>
                    <span>
                      Duration: <strong>{plan.start_date}</strong>{' '}
                      {plan.end_date ? `to ${plan.end_date}` : '(Open-ended)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================================
          REGIMEN DETAIL INSPECTOR MODAL
      ========================================================== */}
      {selectedPlanDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedPlanDetail(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Clinical Plan #{selectedPlanDetail.id}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.4rem 0 0' }}>
                  {selectedPlanDetail.title}
                </h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Patient: <strong>{selectedPlanDetail.patient_name}</strong> • {selectedPlanDetail.patient_diagnosis}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlanDetail(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                fontSize: '0.85rem',
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Doctor</span>
                <strong>{selectedPlanDetail.doctor_name}</strong>
              </div>
              <div>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Status</span>
                <strong style={{ textTransform: 'capitalize', color: '#0284c7' }}>{selectedPlanDetail.status}</strong>
              </div>
              <div>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Start Date</span>
                <strong>{selectedPlanDetail.start_date}</strong>
              </div>
              <div>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Completion Date</span>
                <strong>{selectedPlanDetail.end_date || 'Open-ended'}</strong>
              </div>
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem' }}>
              Prescribed Exercise Regimen
            </h4>

            {detailLoading ? (
              <p style={{ color: '#64748b' }}>Loading exercise parameters...</p>
            ) : selectedPlanDetail.exercises && selectedPlanDetail.exercises.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {selectedPlanDetail.exercises.map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#0284c7', fontSize: '1rem' }}>
                        {idx + 1}. {ex.exercise_name || `Exercise #${ex.exercise_id}`}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {ex.target_body_part || 'General'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.5rem',
                        marginTop: '0.65rem',
                        fontSize: '0.85rem',
                        background: '#f8fafc',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #edf2f7',
                      }}
                    >
                      <div>
                        Sets: <strong>{ex.sets}</strong>
                      </div>
                      <div>
                        Reps: <strong>{ex.reps}</strong>
                      </div>
                      <div>
                        Isometric Hold: <strong>{ex.hold_seconds ? `${ex.hold_seconds}s` : 'None'}</strong>
                      </div>
                      <div>
                        Cadence: <strong>{ex.daily_frequency ? `${ex.daily_frequency}x/day` : '1x/day'}</strong>
                      </div>
                    </div>

                    {ex.safety_notes && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          fontSize: '0.8rem',
                          color: '#92400e',
                          backgroundColor: '#fef3c7',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #fde68a',
                        }}
                      >
                        ⚠️ <strong>Precaution:</strong> {ex.safety_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>No exercises found attached to this plan.</p>
            )}

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setSelectedPlanDetail(null);
                  handleOpenPrint(selectedPlanDetail);
                }}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                🖨️ Open Print Take-Home View
              </button>

              <button
                onClick={() => setSelectedPlanDetail(null)}
                style={{
                  backgroundColor: '#0284c7',
                  color: 'white',
                  border: 'none',
                  padding: '0.55rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL: REGISTER NEW PATIENT
      ========================================================== */}
      {showNewPatientModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            padding: '1.5rem',
          }}
          onClick={() => setShowNewPatientModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Register New Patient
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Creates clinical profile in <code>patient_profiles</code> table
                </span>
              </div>
              <button
                onClick={() => setShowNewPatientModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Tan, Marcus Lee"
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Gender
                  </label>
                  <select
                    value={newPatientGender}
                    onChange={e => setNewPatientGender(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newPatientDob}
                    onChange={e => setNewPatientDob(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Primary Injury / Diagnosis *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medial Meniscus Tear (Left Knee), Rotator Cuff Impingement"
                  value={newPatientDiagnosis}
                  onChange={e => setNewPatientDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Baseline Range of Motion (ROM) Score (Degrees)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  placeholder="e.g. 75"
                  value={newPatientRom}
                  onChange={e => setNewPatientRom(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Clinical Intake Notes
                </label>
                <textarea
                  placeholder="e.g. Acute knee pain occurred during sport. Patient cannot bend beyond 80 degrees."
                  value={newPatientNotes}
                  onChange={e => setNewPatientNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.55rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patientSaving}
                  style={{
                    backgroundColor: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '0.55rem 1.5rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: patientSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {patientSaving ? 'Registering...' : '✅ Save & Select Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL: EDIT PATIENT CLINICAL DETAILS
      ========================================================== */}
      {showEditPatientModal && currentPatientContext && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            padding: '1.5rem',
          }}
          onClick={() => setShowEditPatientModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Update Patient Details: {currentPatientContext.full_name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Update clinical diagnosis, baseline ROM score, and physician notes.
                </span>
              </div>
              <button
                onClick={() => setShowEditPatientModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPatient}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Injury Diagnosis *
                </label>
                <input
                  type="text"
                  value={editPatientDiagnosis}
                  onChange={e => setEditPatientDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Measured Range of Motion (ROM) Score (Degrees)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={editPatientRom}
                  onChange={e => setEditPatientRom(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Doctor Clinical Progress Notes
                </label>
                <textarea
                  value={editPatientNotes}
                  onChange={e => setEditPatientNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditPatientModal(false)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.55rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patientSaving}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '0.55rem 1.5rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: patientSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {patientSaving ? 'Updating...' : '💾 Save Patient Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          POINT 3: PRINTABLE PATIENT TAKE-HOME SHEET MODAL
      ========================================================== */}
      {printPlan && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '1.5rem',
          }}
          onClick={() => setPrintPlan(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              fontFamily: '"Segoe UI", -apple-system, Roboto, sans-serif',
              color: '#0f172a',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}
            >
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                📄 Official Take-Home Sheet Ready for Printing
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '0.45rem 1.2rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print Now
                </button>
                <button
                  onClick={() => setPrintPlan(null)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* PRINTABLE LETTERHEAD */}
            <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', margin: 0 }}>
                  PhysioSystem Clinical Rehabilitation
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                  Department of Orthopedic Physiotherapy & Physical Medicine
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                <div>Date Issued: {new Date().toLocaleDateString()}</div>
                <div>Plan ID: #{printPlan.id}</div>
              </div>
            </div>

            {/* Patient & Prescription Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: '1rem',
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
              }}
            >
              <div>
                <div>Patient: <strong>{printPlan.patient_name || `Patient #${printPlan.patient_id}`}</strong></div>
                <div>Diagnosis: <strong>{printPlan.patient_diagnosis || 'Physical Rehabilitation'}</strong></div>
              </div>
              <div>
                <div>Prescribing Doctor: <strong>{printPlan.doctor_name || 'Dr. Sarah Chen, MD'}</strong></div>
                <div>Plan: <strong>{printPlan.title}</strong></div>
              </div>
            </div>

            {/* Exercise Instructions Table */}
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.6rem' }}>
              Daily Home Exercise Regimen
            </h4>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#0284c7', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>#</th>
                  <th style={{ padding: '8px 10px' }}>Exercise Name</th>
                  <th style={{ padding: '8px 10px' }}>Sets</th>
                  <th style={{ padding: '8px 10px' }}>Reps</th>
                  <th style={{ padding: '8px 10px' }}>Hold</th>
                  <th style={{ padding: '8px 10px' }}>Frequency</th>
                  <th style={{ padding: '8px 10px' }}>Precautions</th>
                </tr>
              </thead>
              <tbody>
                {printPlan.exercises?.map((ex, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{ex.exercise_name || `Exercise #${ex.exercise_id}`}</td>
                    <td style={{ padding: '8px 10px' }}>{ex.sets}</td>
                    <td style={{ padding: '8px 10px' }}>{ex.reps}</td>
                    <td style={{ padding: '8px 10px' }}>{ex.hold_seconds ? `${ex.hold_seconds}s` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{ex.daily_frequency ? `${ex.daily_frequency}x/day` : '1x'}</td>
                    <td style={{ padding: '8px 10px', color: '#b45309', fontSize: '0.8rem' }}>{ex.safety_notes || 'None noted'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* WEEKLY CHECKLIST MATRIX */}
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.6rem' }}>
              Weekly Adherence Tracker (Tick completed sessions):
            </h4>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
                textAlign: 'center',
                marginBottom: '2rem',
                border: '1px solid #cbd5e1',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Exercise</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Mon</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Tue</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Wed</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Thu</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Fri</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Sat</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Sun</th>
                </tr>
              </thead>
              <tbody>
                {printPlan.exercises?.map((ex, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600 }}>
                      {ex.exercise_name || `Exercise #${ex.exercise_id}`}
                    </td>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <td key={day} style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#94a3b8' }}>
                        [ ]
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Doctor Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                PhysioSystem Automated Clinical EHR System<br />
                Report any sudden flare-ups or pain &gt; 5/10 to your supervising nurse.
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid #000', width: '180px', marginBottom: '0.3rem' }}></div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Dr. Sarah Chen, MD</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Supervising Physiotherapist</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionModule;
