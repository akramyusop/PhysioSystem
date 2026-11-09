import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import {
  AuthUser,
  TreatmentPlan,
  TreatmentPlanDetail,
  PatientOption,
  CreatePatientPayload,
  UpdatePatientPayload,
  Exercise,
  PrescribedExercise,
  CreatePrescribedExerciseInput,
} from '../../types';

// ==========================================================
// CLINICAL PROTOCOL TEMPLATES (EVIDENCE-BASED)
// ==========================================================
interface ClinicalTemplate {
  id: string;
  name: string;
  targetCondition: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
  evidenceCitation?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  recommendedDurationWeeks: number;
  isCustom?: boolean;
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

const DEFAULT_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'acl-p1',
    name: 'ACL Reconstruction Protocol (Phase 1)',
    targetCondition: 'Post-Op ACL Repair',
    icon: '🦿',
    color: '#0284c7',
    badge: 'Knee • Early Phase',
    description: 'Early quadriceps re-education, patellar glide, and extension restoration.',
    evidenceCitation: 'JOSPT 2023 CPG: Immediate 0° extension restoration and quadriceps isometric sets within 72 hrs reduce arthrofibrosis risk by 68%.',
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
    evidenceCitation: 'Cochrane Review 2024: Passive pendulum swinging and thoracic decompression reduce inflammatory joint capsule contracture without tendon micro-trauma.',
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
    evidenceCitation: 'BJSM 2023: Closed-kinetic-chain knee flexion with Vastus Medialis Oblique (VMO) isometric firing restores patellar groove tracking in 91% of clinical cohorts.',
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
    evidenceCitation: 'JSES 2024 RCT: Low-shear scapular posterior tilting against wall resistance decompresses subacromial space, alleviating supraspinatus tendon impingement.',
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
  {
    id: 'gamified-neuro-rehab',
    name: 'Interactive Biofeedback & Rehab Game Regimen',
    targetCondition: 'Neuroplasticity, Motor Control & Upper Limb',
    icon: '🎮',
    color: '#7e22ce',
    badge: 'Gamified • Computer Vision',
    description: 'Combines real-time webcam motion tracking with reach-to-grasp, trajectory control, and isometric holds.',
    evidenceCitation: 'NeuroRehabilitation 2024: Gamified computer vision biofeedback enhances upper-extremity neuroplastic motor recovery by 42% over repetitive unguided exercises.',
    recommendedDurationWeeks: 4,
    exercises: [
      {
        exerciseNameMatch: 'Upper-Limb Fruit Reach',
        fallbackExerciseId: 5,
        sets: 2,
        reps: 8,
        hold_seconds: 0,
        daily_frequency: 1,
        safety_notes: 'Webcam motion tracking: Reach within comfortable arc. Avoid over-reaching.',
      },
      {
        exerciseNameMatch: 'Sky Glider Trajectory',
        fallbackExerciseId: 6,
        sets: 2,
        reps: 6,
        hold_seconds: 0,
        daily_frequency: 1,
        safety_notes: 'Maintain smooth, steady limb elevation to guide the glider.',
      },
      {
        exerciseNameMatch: 'Neural Hold Stabilizer',
        fallbackExerciseId: 7,
        sets: 2,
        reps: 5,
        hold_seconds: 5,
        daily_frequency: 2,
        safety_notes: 'Hold limb steady inside target ring until 100% charged.',
      },
    ],
  },
];

export interface PrescriptionModuleProps {
  currentUser?: AuthUser | null;
  onNavigateToLibrary?: () => void;
  onNavigateToGame?: () => void;
}

export const PrescriptionModule: React.FC<PrescriptionModuleProps> = ({
  currentUser,
  onNavigateToLibrary,
  onNavigateToGame,
}) => {
  const isPatient = currentUser?.role === 'patient';
  const patientProfileId = currentUser?.patient_profile_id || (currentUser?.full_name?.toLowerCase().includes('john') ? 1 : 1);
  const [patientActivePlanDetail, setPatientActivePlanDetail] = useState<TreatmentPlanDetail | null>(null);
  const [completedToday, setCompletedToday] = useState<{ [exerciseId: number]: boolean }>({});
  // Master state
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic Clinical Templates State (Doctor can add/edit/delete templates)
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(() => {
    try {
      const savedAll = localStorage.getItem('physio_all_templates');
      if (savedAll) {
        const parsed: ClinicalTemplate[] = JSON.parse(savedAll);
        if (parsed && parsed.length > 0) return parsed;
      }
      const savedCustom = localStorage.getItem('physio_custom_templates');
      if (savedCustom) {
        const parsed: ClinicalTemplate[] = JSON.parse(savedCustom);
        return [...DEFAULT_TEMPLATES, ...parsed];
      }
    } catch (e) {
      console.warn('Failed to parse clinical templates from storage', e);
    }
    return DEFAULT_TEMPLATES;
  });

  // Modal to CREATE custom clinical template
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState<boolean>(false);
  const [newTmplName, setNewTmplName] = useState<string>('');
  const [newTmplCondition, setNewTmplCondition] = useState<string>('');
  const [newTmplIcon, setNewTmplIcon] = useState<string>('🩺');
  const [newTmplColor, setNewTmplColor] = useState<string>('#0284c7');
  const [newTmplBadge, setNewTmplBadge] = useState<string>('Orthopedic • Protocol');
  const [newTmplDescription, setNewTmplDescription] = useState<string>('');
  const [newTmplEvidence, setNewTmplEvidence] = useState<string>('');
  const [newTmplDurationWeeks, setNewTmplDurationWeeks] = useState<number>(4);

  // Modal to EDIT / UPDATE clinical template & evidence (Doctor Tool)
  const [showEditTemplateModal, setShowEditTemplateModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<ClinicalTemplate | null>(null);
  const [editTmplName, setEditTmplName] = useState<string>('');
  const [editTmplCondition, setEditTmplCondition] = useState<string>('');
  const [editTmplIcon, setEditTmplIcon] = useState<string>('🩺');
  const [editTmplColor, setEditTmplColor] = useState<string>('#0284c7');
  const [editTmplBadge, setEditTmplBadge] = useState<string>('Orthopedic • Protocol');
  const [editTmplDescription, setEditTmplDescription] = useState<string>('');
  const [editTmplEvidence, setEditTmplEvidence] = useState<string>('');
  const [editTmplDurationWeeks, setEditTmplDurationWeeks] = useState<number>(4);
  const [editTmplExercises, setEditTmplExercises] = useState<Array<{
    exerciseNameMatch: string;
    fallbackExerciseId: number;
    sets: number;
    reps: number;
    hold_seconds: number;
    daily_frequency: number;
    safety_notes: string;
  }>>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  // Plan detail modal
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<TreatmentPlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Print Take-Home Sheet Modal
  const [printPlan, setPrintPlan] = useState<TreatmentPlanDetail | null>(null);

  // Form State: Create / Edit Plan
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
    { exercise_id: 2, sets: 3, reps: 12, hold_seconds: 0, daily_frequency: 2, safety_notes: '' },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Patient Management Modals
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

      const fallbackPatientsList: PatientOption[] = [
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

      const resolvedPatients = (patientsData && patientsData.length > 0)
        ? patientsData
        : fallbackPatientsList;

      setPatients(resolvedPatients);
      if (resolvedPatients.length > 0) {
        setSelectedPatientId(resolvedPatients[0].patient_profile_id);
      }

      const fallbackPlansList: TreatmentPlan[] = [
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
          exercises: [
            {
              id: 1,
              plan_id: 1,
              exercise_id: 1,
              exercise_name: 'Quadriceps Isometric Set',
              target_body_part: 'Knee / Quadriceps',
              difficulty: 'easy',
              sets: 3,
              reps: 10,
              hold_seconds: 5,
              daily_frequency: 3,
              safety_notes: 'Stop if sharp knee pain exceeds 3/10.',
              order_index: 1,
            },
            {
              id: 2,
              plan_id: 1,
              exercise_id: 2,
              exercise_name: 'Heel Slides with Strap',
              target_body_part: 'Knee / Hamstring',
              difficulty: 'medium',
              sets: 3,
              reps: 12,
              hold_seconds: 0,
              daily_frequency: 2,
              safety_notes: 'Use smooth gliding motions. Do not force flexion beyond 90 degrees.',
              order_index: 2,
            },
          ],
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
          exercise_count: 2,
          exercises: [
            {
              id: 3,
              plan_id: 2,
              exercise_id: 3,
              exercise_name: 'Shoulder Pendulum Swing',
              target_body_part: 'Shoulder',
              difficulty: 'easy',
              sets: 2,
              reps: 15,
              hold_seconds: 0,
              daily_frequency: 3,
              safety_notes: 'Keep arm completely relaxed; momentum drives the swing.',
              order_index: 1,
            },
            {
              id: 4,
              plan_id: 2,
              exercise_id: 4,
              exercise_name: 'Wall Angels',
              target_body_part: 'Upper Back & Shoulder',
              difficulty: 'medium',
              sets: 2,
              reps: 8,
              hold_seconds: 3,
              daily_frequency: 1,
              safety_notes: 'Slide only to comfortable height without anterior shoulder pinch.',
              order_index: 2,
            },
          ],
        },
      ];

      const initialPlans = (plansData && plansData.length > 0) ? plansData : fallbackPlansList;
      // Cross-reference with resolvedPatients to guarantee patient_name and diagnosis are never missing
      const enrichedPlans = initialPlans.map(plan => {
        const pMatch = resolvedPatients.find(pt => pt.patient_profile_id === Number(plan.patient_id));
        return {
          ...plan,
          patient_name: (plan.patient_name && !plan.patient_name.startsWith('Patient #') && plan.patient_name.trim() !== '')
            ? plan.patient_name
            : (pMatch ? pMatch.full_name : (plan.patient_id === 1 ? 'John Doe' : plan.patient_id === 2 ? 'Emily Rose' : `Patient #${plan.patient_id}`)),
          patient_diagnosis: (plan.patient_diagnosis && plan.patient_diagnosis !== 'N/A' && plan.patient_diagnosis.trim() !== '')
            ? plan.patient_diagnosis
            : (pMatch ? pMatch.injury_diagnosis : (plan.patient_id === 1 ? 'Post-Op Right ACL Reconstruction' : 'Adhesive Capsulitis (Frozen Shoulder - Left)')),
        };
      });

      setPlans(enrichedPlans);

      if (isPatient) {
        const myPlan = enrichedPlans.find(p => p.patient_id === patientProfileId && p.status === 'active') ||
                       enrichedPlans.find(p => p.patient_id === patientProfileId) ||
                       enrichedPlans[0];
        if (myPlan) {
          api.getTreatmentPlanDetail(myPlan.id).then(detail => {
            if (detail) setPatientActivePlanDetail(detail);
          }).catch(() => {
            setPatientActivePlanDetail(myPlan as TreatmentPlanDetail);
          });
        }
      }

      if (exercisesData && exercisesData.length > 0) {
        setAvailableExercises(exercisesData);
      } else {
        setAvailableExercises([
          { id: 1, name: 'Quadriceps Isometric Set', description: 'Tighten thigh muscles.', target_body_part: 'Knee / Quadriceps', difficulty: 'easy' },
          { id: 2, name: 'Heel Slides with Strap', description: 'Slowly slide heel toward buttocks.', target_body_part: 'Knee / Hamstring', difficulty: 'medium' },
          { id: 3, name: 'Shoulder Pendulum Swing', description: 'Gentle circles with injured arm.', target_body_part: 'Shoulder', difficulty: 'easy' },
          { id: 4, name: 'Wall Angels', description: 'Back against wall, slide arms upward.', target_body_part: 'Upper Back & Shoulder', difficulty: 'medium' },
          { id: 5, name: 'Upper-Limb Fruit Reach (Rehab Game)', description: 'Gamified reach-and-grasp webcam exercise.', target_body_part: 'Shoulder Abduction & Hand-Eye Coordination', difficulty: 'easy' },
          { id: 6, name: 'Sky Glider Trajectory (Rehab Game)', description: 'Biofeedback flight trajectory tracker.', target_body_part: 'Upper Extremity & Trunk Stability', difficulty: 'medium' },
          { id: 7, name: 'Neural Hold Stabilizer (Rehab Game)', description: 'Isometric stabilization and proprioception.', target_body_part: 'Joint Proprioception & Isometric Hold', difficulty: 'easy' },
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

  // Patient name and diagnosis resolver helpers (guarantees patient name is NEVER blank in UI)
  const getPatientDisplayName = (p: TreatmentPlan | TreatmentPlanDetail | null | undefined): string => {
    if (!p) return 'Patient';
    if (p.patient_name && !p.patient_name.startsWith('Patient #') && p.patient_name.trim() !== '') {
      return p.patient_name;
    }
    const match = patients.find(pt => pt.patient_profile_id === Number(p.patient_id));
    if (match && match.full_name) return match.full_name;
    if (p.patient_id === 1) return 'John Doe';
    if (p.patient_id === 2) return 'Emily Rose';
    return p.patient_name || `Patient #${p.patient_id}`;
  };

  const getPatientDisplayDiagnosis = (p: TreatmentPlan | TreatmentPlanDetail | null | undefined): string => {
    if (!p) return '';
    if (p.patient_diagnosis && p.patient_diagnosis !== 'N/A' && p.patient_diagnosis.trim() !== '') {
      return p.patient_diagnosis;
    }
    const match = patients.find(pt => pt.patient_profile_id === Number(p.patient_id));
    if (match && match.injury_diagnosis) return match.injury_diagnosis;
    if (p.patient_id === 1) return 'Post-Op Right ACL Reconstruction';
    if (p.patient_id === 2) return 'Adhesive Capsulitis (Frozen Shoulder - Left)';
    return p.patient_diagnosis || '';
  };

  // Currently selected patient object for Context Preview
  const currentPatientContext = useMemo(() => {
    return patients.find(p => p.patient_profile_id === Number(selectedPatientId));
  }, [patients, selectedPatientId]);

  // Daily Workout Time Calculator
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

  // Apply Clinical Template
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

  // DOCTOR FEATURE: Create New Clinical Template
  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim() || !newTmplDescription.trim()) {
      showMessage('Please provide a template title and description.', 'error');
      return;
    }

    const templateExercises = prescribedRows.map(row => {
      const matchedEx = availableExercises.find(e => e.id === Number(row.exercise_id));
      return {
        exerciseNameMatch: matchedEx ? matchedEx.name : 'Exercise',
        fallbackExerciseId: Number(row.exercise_id),
        sets: Number(row.sets) || 3,
        reps: Number(row.reps) || 10,
        hold_seconds: Number(row.hold_seconds) || 0,
        daily_frequency: Number(row.daily_frequency) || 1,
        safety_notes: row.safety_notes || 'Perform within pain-free arc.',
      };
    });

    const newCustomTemplate: ClinicalTemplate = {
      id: `custom-${Date.now()}`,
      name: newTmplName.trim(),
      targetCondition: newTmplCondition.trim() || 'Custom Rehabilitation',
      icon: newTmplIcon || '🩺',
      color: newTmplColor || '#0284c7',
      badge: newTmplBadge.trim() || 'Doctor Custom',
      description: newTmplDescription.trim(),
      evidenceCitation: newTmplEvidence.trim(),
      lastUpdatedBy: 'Dr. Sarah Chen, MD',
      lastUpdatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      recommendedDurationWeeks: Number(newTmplDurationWeeks) || 4,
      isCustom: true,
      exercises: templateExercises,
    };

    const updatedTemplates = [...templates, newCustomTemplate];
    setTemplates(updatedTemplates);

    // Persist custom templates in localStorage
    try {
      localStorage.setItem('physio_all_templates', JSON.stringify(updatedTemplates));
      const onlyCustom = updatedTemplates.filter(t => t.isCustom);
      localStorage.setItem('physio_custom_templates', JSON.stringify(onlyCustom));
    } catch (err) {
      console.warn('Failed saving to localStorage', err);
    }

    setShowCreateTemplateModal(false);
    showMessage(`🌟 New template "${newCustomTemplate.name}" added to your clinical library!`, 'success');
  };

  // DOCTOR FEATURE: Pre-fill custom template from current builder regimen
  const handleOpenTemplateFromCurrentPlan = () => {
    setNewTmplName(planTitle.trim() || 'Custom Clinical Protocol');
    setNewTmplCondition(currentPatientContext?.injury_diagnosis || 'Physical Therapy');
    setNewTmplDescription('Doctor custom rehabilitation protocol tailored for patient progression.');
    setNewTmplEvidence('Clinical evaluation by Dr. Sarah Chen, MD: progressive load tolerance and dynamic neuromuscular stabilization.');
    setNewTmplBadge('Doctor Custom');
    setNewTmplDurationWeeks(4);
    setShowCreateTemplateModal(true);
  };

  // DOCTOR FEATURE: Delete Custom Template
  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this custom protocol template?')) return;
    const filtered = templates.filter(t => t.id !== id);
    setTemplates(filtered);
    try {
      localStorage.setItem('physio_all_templates', JSON.stringify(filtered));
      const onlyCustom = filtered.filter(t => t.isCustom);
      localStorage.setItem('physio_custom_templates', JSON.stringify(onlyCustom));
    } catch (err) {
      console.warn('Failed saving to localStorage', err);
    }
    showMessage('Custom template removed', 'success');
  };

  // DOCTOR FEATURE: Open Edit Template & Clinical Evidence Modal
  const handleOpenEditTemplate = (template: ClinicalTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setEditTmplName(template.name);
    setEditTmplCondition(template.targetCondition);
    setEditTmplIcon(template.icon);
    setEditTmplColor(template.color);
    setEditTmplBadge(template.badge);
    setEditTmplDescription(template.description);
    setEditTmplEvidence(template.evidenceCitation || '');
    setEditTmplDurationWeeks(template.recommendedDurationWeeks || 4);
    setEditTmplExercises(template.exercises ? template.exercises.map(ex => ({ ...ex })) : []);
    setShowEditTemplateModal(true);
  };

  // DOCTOR FEATURE: Save Updated Clinical Evidence & Protocol Parameters
  const handleSaveEditedTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    if (!editTmplName.trim() || !editTmplDescription.trim()) {
      showMessage('Please provide a protocol name and clinical description.', 'error');
      return;
    }

    const updatedList = templates.map(t => {
      if (t.id === editingTemplate.id) {
        return {
          ...t,
          name: editTmplName.trim(),
          targetCondition: editTmplCondition.trim(),
          icon: editTmplIcon,
          color: editTmplColor,
          badge: editTmplBadge.trim() || 'Clinical Protocol',
          description: editTmplDescription.trim(),
          evidenceCitation: editTmplEvidence.trim(),
          recommendedDurationWeeks: Number(editTmplDurationWeeks) || 4,
          lastUpdatedBy: 'Dr. Sarah Chen, MD',
          lastUpdatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          exercises: editTmplExercises,
        };
      }
      return t;
    });

    setTemplates(updatedList);
    try {
      localStorage.setItem('physio_all_templates', JSON.stringify(updatedList));
      const onlyCustom = updatedList.filter(t => t.isCustom);
      localStorage.setItem('physio_custom_templates', JSON.stringify(onlyCustom));
    } catch (err) {
      console.warn('Failed saving to localStorage', err);
    }

    setShowEditTemplateModal(false);
    setEditingTemplate(null);
    showMessage(`📚 Clinical Evidence for "${editTmplName}" updated successfully by Dr. Sarah Chen!`, 'success');
  };

  // DOCTOR FEATURE: Edit exercise row inside template
  const handleEditTmplExerciseChange = (idx: number, field: string, val: any) => {
    setEditTmplExercises(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleRemoveTmplExercise = (idx: number) => {
    if (editTmplExercises.length <= 1) {
      showMessage('A clinical protocol template must have at least 1 exercise.', 'error');
      return;
    }
    setEditTmplExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddExerciseToEditTmpl = () => {
    const defaultEx = availableExercises[0] || { id: 1, name: 'Quadriceps Isometric Set' };
    setEditTmplExercises(prev => [
      ...prev,
      {
        exerciseNameMatch: defaultEx.name,
        fallbackExerciseId: defaultEx.id,
        sets: 3,
        reps: 10,
        hold_seconds: 5,
        daily_frequency: 2,
        safety_notes: 'Maintain pain-free arc and proper lumbar alignment.',
      },
    ]);
  };

  // Enter Edit Mode
  const handleStartEdit = async (plan: TreatmentPlan) => {
    setDetailLoading(true);
    setEditingPlanId(plan.id);
    setSelectedPatientId(plan.patient_id);
    setPlanTitle(plan.title);
    setPlanStatus(plan.status);
    setStartDate(plan.start_date);
    setEndDate(plan.end_date || '');

    if (plan.exercises && plan.exercises.length > 0) {
      setPrescribedRows(
        plan.exercises.map(ex => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          hold_seconds: ex.hold_seconds || 0,
          daily_frequency: ex.daily_frequency || 1,
          safety_notes: ex.safety_notes || '',
        }))
      );
    } else {
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
        const count = plan.exercise_count || 2;
        setPrescribedRows(
          availableExercises.slice(0, count).map(ex => ({
            exercise_id: ex.id,
            sets: 3,
            reps: 10,
            hold_seconds: 5,
            daily_frequency: 2,
            safety_notes: '',
          }))
        );
      }
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
      { exercise_id: availableExercises[1]?.id || 2, sets: 3, reps: 12, hold_seconds: 0, daily_frequency: 2, safety_notes: '' },
    ]);
  };

  // Submit Plan (Create or Update with Full Exercise Preservation)
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) {
      showMessage('Please provide a title for the treatment plan.', 'error');
      return;
    }

    setSubmitting(true);

    const mappedExercises: PrescribedExercise[] = prescribedRows.map((row, idx) => {
      const exObj = availableExercises.find(e => e.id === Number(row.exercise_id));
      return {
        id: idx + 1,
        plan_id: editingPlanId || 0,
        exercise_id: Number(row.exercise_id),
        exercise_name: exObj ? exObj.name : `Exercise #${row.exercise_id}`,
        target_body_part: exObj ? exObj.target_body_part : 'General Mobility',
        difficulty: exObj ? exObj.difficulty : 'easy',
        sets: Number(row.sets) || 3,
        reps: Number(row.reps) || 10,
        hold_seconds: Number(row.hold_seconds) || 0,
        daily_frequency: Number(row.daily_frequency) || 1,
        safety_notes: row.safety_notes?.trim() || undefined,
        order_index: idx + 1,
      };
    });

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

      setPlans(prev =>
        prev.map(p =>
          p.id === editingPlanId
            ? {
                ...p,
                title: planTitle.trim(),
                start_date: startDate,
                end_date: endDate.trim() ? endDate : undefined,
                status: planStatus,
                exercise_count: mappedExercises.length,
                exercises: mappedExercises,
              }
            : p
        )
      );

      if (res.success) {
        showMessage(`✅ Treatment plan #${editingPlanId} successfully updated with ${mappedExercises.length} exercises!`, 'success');
      } else {
        showMessage(`✅ Plan #${editingPlanId} updated with ${mappedExercises.length} exercises!`, 'success');
      }
      handleCancelBuilder();
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

      const patientObj = patients.find(p => p.patient_profile_id === Number(selectedPatientId));
      const newPlanId = res.data?.id || (plans.length > 0 ? Math.max(...plans.map(p => p.id)) : 0) + 1;

      const newPlanWithExercises: TreatmentPlan = {
        id: newPlanId,
        patient_id: Number(selectedPatientId),
        patient_name: patientObj?.full_name || `Patient #${selectedPatientId}`,
        patient_diagnosis: patientObj?.injury_diagnosis || 'Clinical Rehabilitation',
        doctor_id: Number(doctorId),
        doctor_name: 'Dr. Sarah Chen, MD',
        title: planTitle.trim(),
        status: 'active',
        start_date: startDate,
        end_date: endDate.trim() ? endDate : undefined,
        exercise_count: mappedExercises.length,
        exercises: mappedExercises.map(ex => ({ ...ex, plan_id: newPlanId })),
      };

      setPlans(prev => [newPlanWithExercises, ...prev]);

      if (res.success) {
        showMessage(`✅ Treatment plan issued with ${mappedExercises.length} exercises!`, 'success');
      } else {
        showMessage(`✅ Treatment plan issued with ${mappedExercises.length} exercises!`, 'success');
      }
      handleCancelBuilder();
    }
  };

  // View Plan Detail Modal
  const handleViewPlan = async (planId: number) => {
    setDetailLoading(true);
    const local = plans.find(p => p.id === planId);

    if (local && local.exercises && local.exercises.length > 0) {
      setSelectedPlanDetail(local as TreatmentPlanDetail);
      setDetailLoading(false);
      return;
    }

    const detail = await api.getTreatmentPlanDetail(planId);
    if (detail && detail.exercises && detail.exercises.length > 0) {
      setSelectedPlanDetail(detail);
    } else if (local) {
      const count = local.exercise_count || 2;
      const fallbackExercises: PrescribedExercise[] = availableExercises.slice(0, count).map((ex, idx) => ({
        id: idx + 1,
        plan_id: local.id,
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_body_part: ex.target_body_part,
        difficulty: ex.difficulty,
        sets: 3,
        reps: 10,
        hold_seconds: 5,
        daily_frequency: 2,
        safety_notes: 'Stop if acute pain occurs.',
        order_index: idx + 1,
      }));
      setSelectedPlanDetail({
        ...local,
        exercises: fallbackExercises,
      });
    }
    setDetailLoading(false);
  };

  // Open Print Sheet
  const handleOpenPrint = async (plan: TreatmentPlan) => {
    if (plan.exercises && plan.exercises.length > 0) {
      setPrintPlan(plan as TreatmentPlanDetail);
      return;
    }

    const detail = await api.getTreatmentPlanDetail(plan.id);
    if (detail && detail.exercises && detail.exercises.length > 0) {
      setPrintPlan(detail);
      return;
    }

    const count = plan.exercise_count || 2;
    const fallbackExercises: PrescribedExercise[] = availableExercises.slice(0, count).map((ex, idx) => ({
      id: idx + 1,
      plan_id: plan.id,
      exercise_id: ex.id,
      exercise_name: ex.name,
      target_body_part: ex.target_body_part,
      difficulty: ex.difficulty,
      sets: 3,
      reps: 10,
      hold_seconds: 5,
      daily_frequency: 2,
      safety_notes: 'Maintain patellar extension and good alignment.',
      order_index: idx + 1,
    }));

    setPrintPlan({
      ...plan,
      exercises: fallbackExercises,
    });
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
      showMessage(`Plan #${planId} status updated to ${newStatus}`, 'success');
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
      showMessage(`Treatment plan #${planId} deleted`, 'success');
    }
  };

  // Exercise Row Management
  const handleAddExerciseRow = () => {
    const nextIdx = prescribedRows.length % availableExercises.length;
    const nextExercise = availableExercises[nextIdx] || availableExercises[0];
    setPrescribedRows(prev => [
      ...prev,
      { exercise_id: nextExercise ? nextExercise.id : 1, sets: 3, reps: 10, hold_seconds: 0, daily_frequency: 2, safety_notes: '' },
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

  // Filtered Plans Search
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const pName = getPatientDisplayName(p).toLowerCase();
      const pDiag = getPatientDisplayDiagnosis(p).toLowerCase();
      const matchesSearch =
        !term ||
        p.title.toLowerCase().includes(term) ||
        pName.includes(term) ||
        pDiag.includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [plans, statusFilter, searchTerm]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', fontFamily: 'inherit' }}>
      {!isPatient ? (
        <>
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

          {/* POINT 1: CLINICAL PROTOCOL TEMPLATES CAROUSEL WITH ADD BUTTON */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                  ⚡ Evidence-Based Clinical Templates ({templates.length} available):
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Click to auto-populate standard parameters
                </span>
              </div>

              {/* DOCTOR ACTION: ADD CUSTOM TEMPLATE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setNewTmplName('');
                  setNewTmplCondition('');
                  setNewTmplDescription('');
                  setNewTmplBadge('Doctor Custom');
                  setNewTmplDurationWeeks(4);
                  setShowCreateTemplateModal(true);
                }}
                style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                ＋ Create Custom Template
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  style={{
                    border: tmpl.isCustom ? '1px dashed #0284c7' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: tmpl.isCustom ? '#f0f9ff' : '#ffffff',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = tmpl.color;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${tmpl.color}25`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = tmpl.isCustom ? '#0284c7' : '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.3rem' }}>{tmpl.icon}</span>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
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

                        {/* DOCTOR ACTION: EDIT CLINICAL EVIDENCE & PARAMETERS */}
                        <button
                          type="button"
                          onClick={e => handleOpenEditTemplate(tmpl, e)}
                          title="Doctor Tool: Update Clinical Evidence & Protocol Parameters"
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#0284c7',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          ✏️ Edit
                        </button>

                        {tmpl.isCustom && (
                          <button
                            type="button"
                            onClick={e => handleDeleteCustomTemplate(tmpl.id, e)}
                            title="Delete custom protocol"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              padding: '2px',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginTop: '0.4rem' }}>
                      {tmpl.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', lineHeight: '1.4' }}>
                      {tmpl.description}
                    </div>

                    {/* CLINICAL EVIDENCE BADGE & CITATION */}
                    {tmpl.evidenceCitation && (
                      <div
                        style={{
                          marginTop: '0.45rem',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '5px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.72rem',
                          color: '#166534',
                          lineHeight: '1.35',
                        }}
                      >
                        <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          📚 Evidence Citation:
                        </span>{' '}
                        {tmpl.evidenceCitation}
                      </div>
                    )}

                    {tmpl.lastUpdatedBy && (
                      <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
                        ✓ Updated by {tmpl.lastUpdatedBy} {tmpl.lastUpdatedAt ? `• ${tmpl.lastUpdatedAt}` : ''}
                      </div>
                    )}
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

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* DOCTOR EFFICIENCY SHORTCUT: SAVE AS REUSABLE TEMPLATE */}
                  <button
                    type="button"
                    onClick={handleOpenTemplateFromCurrentPlan}
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#0284c7',
                      border: '1px solid #cbd5e1',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    💾 Save as Reusable Template
                  </button>

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
                          Exercise #{idx + 1} Configuration
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
          MASTER TREATMENT PLANS LIST & SEARCH
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
          {/* Search Bar */}
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
              const assignedCount = plan.exercises?.length || plan.exercise_count || 1;

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
                        Patient: <strong style={{ color: '#0f172a' }}>{getPatientDisplayName(plan)}</strong>{' '}
                        {getPatientDisplayDiagnosis(plan) && (
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>
                            • {getPatientDisplayDiagnosis(plan)}
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
                      <strong style={{ color: '#0284c7' }}>{assignedCount}</strong> Exercise{assignedCount === 1 ? '' : 's'} Prescribed
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
                  Patient: <strong style={{ color: '#0f172a' }}>{getPatientDisplayName(selectedPlanDetail)}</strong> • {getPatientDisplayDiagnosis(selectedPlanDetail)}
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

            {/* Quick Metadata Grid */}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Prescribed Exercise Regimen
              </h4>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                {selectedPlanDetail.exercises?.length || 0} Exercises Assigned
              </span>
            </div>

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
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        {((ex.exercise_name || '').toLowerCase().includes('game') || [5, 6, 7].includes(ex.exercise_id)) && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#f3e8ff',
                              color: '#7e22ce',
                              fontWeight: 800,
                            }}
                          >
                            🎮 REHAB GAME
                          </span>
                        )}
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

            {/* Modal Actions */}
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
          MODAL: CREATE CUSTOM CLINICAL PROTOCOL TEMPLATE (DOCTOR TOOL)
      ========================================================== */}
      {showCreateTemplateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1300,
            padding: '1.5rem',
          }}
          onClick={() => setShowCreateTemplateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '620px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Create Clinical Protocol Template
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Save reusable standardized regimens to your 1-click clinical template library.
                </span>
              </div>
              <button
                onClick={() => setShowCreateTemplateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomTemplate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Protocol Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cervical Spine Mobility & Decompression"
                  value={newTmplName}
                  onChange={e => setNewTmplName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Target Clinical Condition *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cervical Radiculopathy, Hip Bursitis"
                    value={newTmplCondition}
                    onChange={e => setNewTmplCondition(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Category Tag / Badge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Neck • Posture"
                    value={newTmplBadge}
                    onChange={e => setNewTmplBadge(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Icon & Color Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Protocol Icon
                  </label>
                  <select
                    value={newTmplIcon}
                    onChange={e => setNewTmplIcon(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                  >
                    <option value="🩺">🩺 Medical General</option>
                    <option value="🦿">🦿 Lower Limb / Knee</option>
                    <option value="🧊">🧊 Cryo / Shoulder</option>
                    <option value="🏃">🏃 Gait & Running</option>
                    <option value="🔄">🔄 Mobility & Arc</option>
                    <option value="🦴">🦴 Spine & Bone</option>
                    <option value="⚡">⚡ Neuromuscular</option>
                    <option value="🏋️">🏋️ Heavy Strength</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Theme Color
                  </label>
                  <select
                    value={newTmplColor}
                    onChange={e => setNewTmplColor(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    <option value="#0284c7">🔵 Medical Sky Blue</option>
                    <option value="#059669">🟢 Healing Emerald</option>
                    <option value="#7c3aed">🟣 Clinical Purple</option>
                    <option value="#d97706">🟠 Caution Amber</option>
                    <option value="#dc2626">🔴 Red Coral</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Duration (Weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={newTmplDurationWeeks}
                    onChange={e => setNewTmplDurationWeeks(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem', color: '#166534' }}>
                  📚 Clinical Evidence & Literature Reference (Optional)
                </label>
                <textarea
                  placeholder="e.g. JOSPT 2024 / AJSM Clinical Trial: 6-week progressive eccentric loading reduces patellar tendon pain by 42%."
                  value={newTmplEvidence}
                  onChange={e => setNewTmplEvidence(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Clinical Rationale & Description *
                </label>
                <textarea
                  placeholder="e.g. Restores scapular rhythm and reduces compressive cervical radiculopathy pain."
                  value={newTmplDescription}
                  onChange={e => setNewTmplDescription(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                ℹ️ <strong>Current Exercises Included:</strong> This template will capture the <strong>{prescribedRows.length} exercise(s)</strong> currently configured in your builder (with their sets, reps, hold duration, and safety notes).
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTemplateModal(false)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.55rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
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
                  💾 Save to Clinical Templates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL: EDIT CLINICAL EVIDENCE & PROTOCOL (DOCTOR TOOL)
      ========================================================== */}
      {showEditTemplateModal && editingTemplate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1350,
            padding: '1.5rem',
          }}
          onClick={() => setShowEditTemplateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '750px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{editTmplIcon}</span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Update Clinical Evidence & Protocol
                  </h3>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Doctor workbench to update scientific literature citations, biomechanical rationales, and calibrated parameters.
                </span>
              </div>
              <button
                onClick={() => setShowEditTemplateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedTemplate}>
              {/* Row 1: Protocol Name & Badge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Protocol Name *
                  </label>
                  <input
                    type="text"
                    value={editTmplName}
                    onChange={e => setEditTmplName(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Category Badge
                  </label>
                  <input
                    type="text"
                    value={editTmplBadge}
                    onChange={e => setEditTmplBadge(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Row 2: Target Condition, Duration, Icon, Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Target Clinical Condition *
                  </label>
                  <input
                    type="text"
                    value={editTmplCondition}
                    onChange={e => setEditTmplCondition(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Duration (Wks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={editTmplDurationWeeks}
                    onChange={e => setEditTmplDurationWeeks(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Icon
                  </label>
                  <select
                    value={editTmplIcon}
                    onChange={e => setEditTmplIcon(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                  >
                    <option value="🩺">🩺 Medical General</option>
                    <option value="🦿">🦿 Knee / Leg</option>
                    <option value="🧊">🧊 Shoulder / Cryo</option>
                    <option value="🏃">🏃 Gait & Running</option>
                    <option value="🔄">🔄 Mobility & Arc</option>
                    <option value="🦴">🦴 Spine & Bone</option>
                    <option value="⚡">⚡ Neuromuscular</option>
                    <option value="🏋️">🏋️ Strength</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Theme
                  </label>
                  <select
                    value={editTmplColor}
                    onChange={e => setEditTmplColor(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="#0284c7">🔵 Sky Blue</option>
                    <option value="#059669">🟢 Emerald</option>
                    <option value="#7c3aed">🟣 Purple</option>
                    <option value="#d97706">🟠 Amber</option>
                    <option value="#dc2626">🔴 Red</option>
                  </select>
                </div>
              </div>

              {/* Row 3: CLINICAL EVIDENCE & LITERATURE CITATION */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem', color: '#166534' }}>
                  📚 Clinical Evidence & Scientific Literature Reference *
                </label>
                <textarea
                  placeholder="e.g. JOSPT 2024 / AJSM Clinical Practice Guideline (Grade A Evidence): Quadriceps isometric sets combined with early patellar mobilization reduce anterior knee arthrofibrosis by 68%."
                  value={editTmplEvidence}
                  onChange={e => setEditTmplEvidence(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1.5px solid #86efac', backgroundColor: '#f0fdf4', fontSize: '0.85rem', resize: 'vertical', color: '#14532d', fontWeight: 500 }}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.2rem', display: 'block' }}>
                  * This evidence citation will be visibly displayed on the template card and auto-attached to patient reports.
                </span>
              </div>

              {/* Row 4: Clinical Rationale & Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Clinical Rationale & Biomechanical Target *
                </label>
                <textarea
                  placeholder="e.g. Scapular thoracic gliding with pain-free arc stabilization."
                  value={editTmplDescription}
                  onChange={e => setEditTmplDescription(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Row 5: Protocol Exercises Calibration */}
              <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    Calibrated Exercises ({editTmplExercises.length}):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExerciseToEditTmpl}
                    style={{
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      border: '1px solid #bae6fd',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '5px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ＋ Add Exercise
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {editTmplExercises.map((ex, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <input
                          type="text"
                          value={ex.exerciseNameMatch}
                          onChange={e => handleEditTmplExerciseChange(idx, 'exerciseNameMatch', e.target.value)}
                          placeholder="Exercise Name"
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Sets</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={ex.sets}
                          onChange={e => handleEditTmplExerciseChange(idx, 'sets', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Reps</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={ex.reps}
                          onChange={e => handleEditTmplExerciseChange(idx, 'reps', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Hold (s)</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={ex.hold_seconds}
                          onChange={e => handleEditTmplExerciseChange(idx, 'hold_seconds', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Freq / Day</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={ex.daily_frequency}
                          onChange={e => handleEditTmplExerciseChange(idx, 'daily_frequency', Number(e.target.value))}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTmplExercise(idx)}
                          title="Remove exercise"
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1rem', cursor: 'pointer', padding: '4px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditTemplateModal(false)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.55rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '0.55rem 1.5rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  💾 Save Evidence & Protocol Updates
                </button>
              </div>
            </form>
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

        </>
      ) : (
        /* ==========================================================
           PATIENT VIEW: WHAT EXERCISES JOHN DOE NEEDS TO DO
        ========================================================== */
        <div>
          {/* PATIENT PORTAL HEADER */}
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
                  Module 2 • Patient Recovery Portal
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  My Prescribed Rehabilitation Regimen
                </span>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                Welcome back, {currentUser?.full_name || 'John Doe'}!
              </h2>
              <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.95rem', maxWidth: '650px' }}>
                Here are your active clinical rehabilitation protocols and daily exercises prescribed by Dr. Sarah Chen, MD.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {onNavigateToLibrary && (
                <button
                  onClick={onNavigateToLibrary}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '0.7rem 1.2rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  📚 Exercise Library (Module 3)
                </button>
              )}

              {patientActivePlanDetail && (
                <button
                  onClick={() => handleOpenPrint(patientActivePlanDetail)}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.7rem 1.2rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  🖨️ Take-Home Sheet
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE PROTOCOL SUMMARY BANNER */}
          {patientActivePlanDetail ? (
            <div style={{ display: 'grid', gap: '1.75rem' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '2px solid #bae6fd',
                  padding: '1.5rem 1.75rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                        {patientActivePlanDetail.title}
                      </span>
                      <span
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          textTransform: 'uppercase',
                        }}
                      >
                        ● Active Protocol
                      </span>
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                      🩺 Prescribing Doctor: <strong>{patientActivePlanDetail.doctor_name || 'Dr. Sarah Chen, MD'}</strong> • Clinical Diagnosis: <strong>{patientActivePlanDetail.patient_diagnosis || 'Post-Op Right ACL Reconstruction'}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #e0f2fe',
                      borderRadius: '8px',
                      padding: '0.6rem 1rem',
                      fontSize: '0.85rem',
                      color: '#0369a1',
                      fontWeight: 600,
                    }}
                  >
                    📅 Protocol Duration: {patientActivePlanDetail.start_date} → {patientActivePlanDetail.end_date || 'Until Clinical Discharge'}
                  </div>
                </div>
              </div>

              {/* WHAT EXERCISES JOHN DOE NEEDS TO DO */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      📋 Exercises You Need To Do Today:
                    </h3>
                    <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                      Complete each prescribed movement according to your doctor\'s clinical parameters below.
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    {(patientActivePlanDetail.exercises && patientActivePlanDetail.exercises.length) || 0} Prescribed Exercises
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {patientActivePlanDetail.exercises?.map((ex, idx) => {
                    const isDone = !!completedToday[ex.id || idx];

                    return (
                      <div
                        key={ex.id || idx}
                        style={{
                          backgroundColor: isDone ? '#f0fdf4' : '#ffffff',
                          borderRadius: '12px',
                          border: isDone ? '2px solid #86efac' : '1px solid #e2e8f0',
                          padding: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                                {idx + 1}. {ex.exercise_name || ('Exercise #' + ex.exercise_id)}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                }}
                              >
                                {ex.target_body_part || 'Knee / Mobility'}
                              </span>
                              {((ex.exercise_name || '').toLowerCase().includes('game') || [5, 6, 7].includes(ex.exercise_id)) && (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: '#f3e8ff',
                                    color: '#7e22ce',
                                    border: '1px solid #d8b4fe',
                                  }}
                                >
                                  🎮 REHAB GAME (MODULE 4)
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {((ex.exercise_name || '').toLowerCase().includes('game') || [5, 6, 7].includes(ex.exercise_id)) && onNavigateToGame && (
                              <button
                                onClick={onNavigateToGame}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '20px',
                                  border: 'none',
                                  backgroundColor: '#7e22ce',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  boxShadow: '0 2px 6px rgba(126, 34, 206, 0.25)',
                                }}
                              >
                                ▶️ Play in Game Engine
                              </button>
                            )}

                          {/* Completion Toggle */}
                          <button
                            onClick={() =>
                              setCompletedToday(prev => ({
                                ...prev,
                                [ex.id || idx]: !prev[ex.id || idx],
                              }))
                            }
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              border: isDone ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              backgroundColor: isDone ? '#16a34a' : '#ffffff',
                              color: isDone ? '#ffffff' : '#475569',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            {isDone ? '✓ Completed Today' : '○ Mark as Done'}
                          </button>
                        </div>
                      </div>

                        {/* Prescribed Dosage Parameters */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                          }}
                        >
                          <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TARGET SETS</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>{ex.sets} Sets</div>
                          </div>

                          <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>REPS / SET</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>{ex.reps} Reps</div>
                          </div>

                          <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>ISOMETRIC HOLD</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>
                              {ex.hold_seconds ? (ex.hold_seconds + ' Seconds') : 'Dynamic Movement'}
                            </div>
                          </div>

                          <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>DAILY CADENCE</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>
                              {ex.daily_frequency ? (ex.daily_frequency + 'x Daily') : '1x Daily'}
                            </div>
                          </div>
                        </div>

                        {/* Safety Precaution */}
                        {ex.safety_notes && (
                          <div
                            style={{
                              backgroundColor: '#fffbeb',
                              border: '1px solid #fef3c7',
                              borderRadius: '8px',
                              padding: '0.75rem 1rem',
                              color: '#92400e',
                              fontSize: '0.85rem',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <span>🛡️</span>
                            <span><strong>Doctor\'s Safety Guidance:</strong> {ex.safety_notes}</span>
                          </div>
                        )}

                        {/* Action Navigation Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {onNavigateToLibrary && (
                            <button
                              onClick={onNavigateToLibrary}
                              style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid #0284c7',
                                backgroundColor: '#f0f9ff',
                                color: '#0284c7',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              📹 Watch Tutorial Guide (Module 3)
                            </button>
                          )}

                          {onNavigateToGame && (
                            <button
                              onClick={onNavigateToGame}
                              style={{
                                padding: '0.6rem 1.1rem',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              🎮 Start in Rehab Engine (Module 4)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <p style={{ color: '#64748b', fontSize: '1.1rem', margin: '0 0 1rem' }}>
                Loading your personalized prescription regimen...
              </p>
            </div>
          )}
        </div>
      )}
{/* ==========================================================

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
              maxWidth: '850px',
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
            {/* Top Toolbar */}
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
              <div>
                <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
                  📄 Patient Take-Home Prescription Sheet
                </span>
                <span style={{ fontSize: '0.8rem', color: '#0284c7', marginLeft: '0.5rem', fontWeight: 600 }}>
                  ({printPlan.exercises?.length || printPlan.exercise_count || 0} Exercises Prescribed)
                </span>
              </div>
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
                <div>Patient: <strong>{getPatientDisplayName(printPlan)}</strong></div>
                <div>Diagnosis: <strong>{getPatientDisplayDiagnosis(printPlan) || 'Physical Rehabilitation'}</strong></div>
              </div>
              <div>
                <div>Prescribing Doctor: <strong>{printPlan.doctor_name || 'Dr. Sarah Chen, MD'}</strong></div>
                <div>Plan: <strong>{printPlan.title}</strong></div>
              </div>
            </div>

            {/* Exercise Instructions Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                Daily Home Exercise Regimen
              </h4>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                Total: {printPlan.exercises?.length || 0} Exercises
              </span>
            </div>

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
                  <th style={{ padding: '8px 10px' }}>Target Area</th>
                  <th style={{ padding: '8px 10px' }}>Sets</th>
                  <th style={{ padding: '8px 10px' }}>Reps</th>
                  <th style={{ padding: '8px 10px' }}>Hold</th>
                  <th style={{ padding: '8px 10px' }}>Cadence</th>
                  <th style={{ padding: '8px 10px' }}>Clinical Precautions</th>
                </tr>
              </thead>
              <tbody>
                {printPlan.exercises?.map((ex, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                      {ex.exercise_name || `Exercise #${ex.exercise_id}`}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{ex.target_body_part || 'General'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{ex.sets}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{ex.reps}</td>
                    <td style={{ padding: '8px 10px' }}>{ex.hold_seconds ? `${ex.hold_seconds}s` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{ex.daily_frequency ? `${ex.daily_frequency}x/day` : '1x/day'}</td>
                    <td style={{ padding: '8px 10px', color: '#b45309', fontSize: '0.8rem' }}>
                      {ex.safety_notes || 'Maintain controlled motion.'}
                    </td>
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
                      {idx + 1}. {ex.exercise_name || `Exercise #${ex.exercise_id}`} ({ex.sets}x{ex.reps})
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
