import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ApiResponse, MediaAsset, AuthUser } from '../../types';

export interface StepGuideItem {
  stepNumber: number;
  title: string;
  instruction: string;
  postureTip?: string;
}

export interface ExerciseWithMedia {
  id: number;
  name: string;
  description: string;
  target_body_part: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended_frequency?: string;
  media_assets: MediaAsset[];
  step_guides?: StepGuideItem[];
}

export interface PatientOption {
  patient_id: number;
  user_id: number;
  full_name: string;
  injury_diagnosis: string;
  baseline_rom_score?: number;
  notes?: string;
}

export interface GuidedExerciseItem {
  prescribed_id: number;
  plan_id: number;
  plan_title: string;
  doctor_name: string;
  exercise_id: number;
  exercise_name: string;
  description: string;
  target_body_part: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended_frequency?: string;
  sets: number;
  reps: number;
  hold_seconds: number;
  daily_frequency: number;
  safety_notes?: string;
  order_index: number;
  media_assets: MediaAsset[];
}

interface PatientGuidancePayload {
  patient: PatientOption;
  items: GuidedExerciseItem[];
}

// Helper to convert YouTube share/watch links into embedded iframe URLs
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Match youtu.be/<id>
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    const id = shortMatch[1];
    const timeMatch = url.match(/[?&]t=(\d+)/);
    const start = timeMatch ? `?start=${timeMatch[1]}` : '';
    return `https://www.youtube.com/embed/${id}${start}`;
  }
  // Match youtube.com/watch?v=<id>
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (longMatch) {
    const id = longMatch[1];
    const timeMatch = url.match(/[?&]t=(\d+)/);
    const start = timeMatch ? `?start=${timeMatch[1]}` : '';
    return `https://www.youtube.com/embed/${id}${start}`;
  }
  if (url.includes('youtube.com/embed/')) return url;
  return null;
}

// Fallback seed data matching clinical exercises with exact YouTube clinical tutorials
const FALLBACK_CATALOG: ExerciseWithMedia[] = [
  {
    id: 1,
    name: 'Quadriceps Isometric Set',
    description:
      'Sit or lie flat with your injured leg straight on the mat. Place a small rolled-up towel directly under your knee. Slowly tighten your top thigh muscle (quadriceps) by pressing your knee down into the towel. Hold firmly for 5 seconds while breathing normally. Slowly release and relax your muscle for 3 seconds before the next repetition.',
    target_body_part: 'Knee / Quadriceps',
    difficulty: 'easy',
    recommended_frequency: '3x daily',
    media_assets: [
      {
        id: 1,
        exercise_id: 1,
        asset_type: 'video',
        url: 'https://youtu.be/HscSsKwohoQ?si=RZ5ayjgvD13cVYp1',
        title: 'Quadriceps Isometrics Clinic Tutorial',
        thumbnail_url: 'https://img.youtube.com/vi/HscSsKwohoQ/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Starting Setup',
        instruction: 'Sit or lie flat with your injured leg fully extended on the exercise mat.',
        postureTip: 'Keep your pelvis level and spine relaxed against the mat.',
      },
      {
        stepNumber: 2,
        title: 'Towel Placement',
        instruction: 'Place a small rolled-up towel directly beneath the bend of your knee.',
        postureTip: 'The towel roll provides a gentle fulcrum for safe joint extension.',
      },
      {
        stepNumber: 3,
        title: 'Quad Contraction',
        instruction: 'Slowly tighten your upper thigh muscle by pressing the back of your knee down into the towel.',
        postureTip: 'Focus the squeeze strictly in your front thigh, not in your glutes.',
      },
      {
        stepNumber: 4,
        title: '5-Second Isometric Hold',
        instruction: 'Hold the firm contraction for 5 seconds while continuing to breathe calmly and normally.',
        postureTip: 'Do not hold your breath during the isometric hold phase.',
      },
      {
        stepNumber: 5,
        title: 'Controlled Rest',
        instruction: 'Slowly release and relax your thigh muscle for 3 seconds before starting the next repetition.',
        postureTip: 'Allow full blood circulation return between each contraction.',
      },
    ],
  },
  {
    id: 2,
    name: 'Heel Slides with Strap',
    description:
      'Lie flat on your back with both legs straight. Loop a strap or towel securely around the bottom of your foot. Gently pull the strap to slide your heel toward your buttocks as far as comfortable. Hold for 3 seconds at peak bend without forcing past sharp pain. Slowly slide your heel back straight to the starting position.',
    target_body_part: 'Knee / Hamstring',
    difficulty: 'medium',
    recommended_frequency: '2x daily',
    media_assets: [
      {
        id: 2,
        exercise_id: 2,
        asset_type: 'video',
        url: 'https://youtu.be/yxmPWykyov4?si=-rcCPlKPERoT3HVc',
        title: 'Heel Slides with Strap Physical Therapy Video',
        thumbnail_url: 'https://img.youtube.com/vi/yxmPWykyov4/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Supine Position',
        instruction: 'Lie flat on your back with both legs extended straight and toes pointing upward.',
        postureTip: 'Rest your head on a thin pillow to keep your neck strain-free.',
      },
      {
        stepNumber: 2,
        title: 'Strap Placement',
        instruction: 'Loop a towel or strap securely around the bottom arch of your foot.',
        postureTip: 'Hold the strap ends lightly with both hands.',
      },
      {
        stepNumber: 3,
        title: 'Smooth Heel Slide',
        instruction: 'Gently pull the strap to slide your heel toward your buttocks, smoothly bending your knee.',
        postureTip: 'Maintain gentle floor contact with your heel throughout the glide.',
      },
      {
        stepNumber: 4,
        title: 'Peak Flexion Hold',
        instruction: 'Hold for 3 seconds at your maximum comfortable bend without sharp joint pain.',
        postureTip: 'Stop immediately if knee discomfort exceeds 4/10.',
      },
      {
        stepNumber: 5,
        title: 'Controlled Return',
        instruction: 'Slowly slide your heel back straight to the starting position with gentle resistance.',
        postureTip: 'Do not let the leg flop downward; guide it smoothly back.',
      },
    ],
  },
  {
    id: 3,
    name: 'Shoulder Pendulum Swing',
    description:
      'Lean forward slightly at the waist and rest your uninjured hand on a sturdy table. Let your injured arm hang straight down completely loose and relaxed. Gently sway your body in small circles so momentum swings your arm naturally. Do not use your shoulder muscles to lift the arm; let gravity and momentum do the work. Complete 15 clockwise circles, then reverse for 15 counter-clockwise circles.',
    target_body_part: 'Shoulder',
    difficulty: 'easy',
    recommended_frequency: '3x daily',
    media_assets: [
      {
        id: 3,
        exercise_id: 3,
        asset_type: 'video',
        url: 'https://youtu.be/zY5nq68IxwA?si=lMe96uvUW6CcaDxf&t=20',
        title: 'Shoulder Pendulum Swing Clinical Tutorial',
        thumbnail_url: 'https://img.youtube.com/vi/zY5nq68IxwA/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Table Support Stance',
        instruction: 'Lean forward at your waist and rest your uninjured hand firmly on a sturdy table.',
        postureTip: 'Hinge from your hips with soft knees to support your lower back.',
      },
      {
        stepNumber: 2,
        title: 'Relax Injured Arm',
        instruction: 'Let your injured arm hang straight down completely loose like a ragdoll.',
        postureTip: 'Release all tension in your neck, trapezius, and shoulder joint.',
      },
      {
        stepNumber: 3,
        title: 'Torso Momentum Swing',
        instruction: 'Gently sway your body in small circles so torso momentum swings your arm naturally.',
        postureTip: 'Your torso leads the motion; the arm follows passively.',
      },
      {
        stepNumber: 4,
        title: 'Gravity-Guided Arc',
        instruction: 'Do not use your shoulder muscles to actively steer; let gravity and momentum do the work.',
        postureTip: 'Keep the circular swing small (dinner plate size).',
      },
      {
        stepNumber: 5,
        title: 'Direction Switch',
        instruction: 'Complete 15 gentle clockwise circles, then reverse for 15 counter-clockwise circles.',
        postureTip: 'Breathe evenly throughout the entire circular sequence.',
      },
    ],
  },
  {
    id: 4,
    name: 'Wall Angels',
    description:
      'Stand tall with your head, upper back, and buttocks flat against a smooth wall. Position your elbows and the back of your hands against the wall at 90 degrees. Slowly slide your arms upward along the wall into a gentle V-shape. Keep your elbows and wrists touching the wall without arching your lower back. Slowly slide back down to the 90-degree starting position.',
    target_body_part: 'Upper Back & Shoulder',
    difficulty: 'medium',
    recommended_frequency: '1x daily',
    media_assets: [
      {
        id: 4,
        exercise_id: 4,
        asset_type: 'video',
        url: 'https://youtu.be/Qlan0IApO7o?si=OjWqXDcMd_TWZ2FM',
        title: 'Wall Angels Posture Walkthrough Tutorial',
        thumbnail_url: 'https://img.youtube.com/vi/Qlan0IApO7o/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Wall Alignment Stance',
        instruction: 'Stand tall with your head, upper back, and buttocks flat against a smooth wall.',
        postureTip: 'Keep your heels roughly 4 to 6 inches away from the baseboard.',
      },
      {
        stepNumber: 2,
        title: '90-Degree Starting Angle',
        instruction: 'Position your elbows and the back of your hands against the wall at 90 degrees.',
        postureTip: 'Elbows should rest horizontally level with your shoulders.',
      },
      {
        stepNumber: 3,
        title: 'Upward Wall Glide',
        instruction: 'Slowly slide your arms upward along the wall surface into a gentle V-shape.',
        postureTip: 'Only slide as high as you can maintain constant wall contact.',
      },
      {
        stepNumber: 4,
        title: 'Core & Rib Check',
        instruction: 'Keep elbows and wrists touching the wall without arching your lower back.',
        postureTip: 'Engage your lower abdominals so your ribcage does not flare outward.',
      },
      {
        stepNumber: 5,
        title: 'Smooth Descent',
        instruction: 'Slowly glide your elbows back down to the 90-degree starting position.',
        postureTip: 'Move at a steady 3-second up, 3-second down pace.',
      },
    ],
  },
  {
    id: 5,
    name: 'Upper-Limb Fruit Reach (Rehab Game)',
    description:
      'Webcam motion-tracked gamified reach-and-grasp exercise. Grab glowing fruit at multiple Range-of-Motion angles to train neuroplasticity and shoulder ROM.',
    target_body_part: 'Shoulder Abduction & Hand-Eye Coordination',
    difficulty: 'easy',
    recommended_frequency: '1x daily (8 reps)',
    media_assets: [
      {
        id: 5,
        exercise_id: 5,
        asset_type: 'video',
        url: 'https://youtu.be/HscSsKwohoQ',
        title: 'Upper-Limb Fruit Reach Gameplay Guide',
        thumbnail_url: 'https://img.youtube.com/vi/HscSsKwohoQ/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Camera Positioning',
        instruction: 'Position your webcam 4-6 feet away so your upper torso and both arms are clearly visible.',
        postureTip: 'Ensure good lighting with no strong backlighting directly behind you.',
      },
      {
        stepNumber: 2,
        title: 'Target Calibration',
        instruction: 'Stand or sit upright with shoulders relaxed. Raise arms to touch the initial calibration marker.',
        postureTip: 'Keep your neck and chest upright without hunching forward.',
      },
      {
        stepNumber: 3,
        title: 'Dynamic Reaching',
        instruction: 'Reach smoothly towards appearing fruit targets within your comfortable range of motion.',
        postureTip: 'Do not fling or jerk your arm; controlled velocity provides the best neuro-muscular activation.',
      },
    ],
  },
  {
    id: 6,
    name: 'Sky Glider Trajectory (Rehab Game)',
    description:
      'Biofeedback flight simulator. Steer virtual glider through golden trajectory rings using vertical limb movements to dampen ataxia and build endurance.',
    target_body_part: 'Upper Extremity & Trunk Stability',
    difficulty: 'medium',
    recommended_frequency: '1x daily (6 reps)',
    media_assets: [
      {
        id: 6,
        exercise_id: 6,
        asset_type: 'video',
        url: 'https://youtu.be/zY5nq68IxwA',
        title: 'Sky Glider Trajectory Flight Guide',
        thumbnail_url: 'https://img.youtube.com/vi/zY5nq68IxwA/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Flight Stance',
        instruction: 'Sit or stand evenly balanced with both feet flat on the floor.',
        postureTip: 'Align ears over shoulders; avoid leaning the torso sideways.',
      },
      {
        stepNumber: 2,
        title: 'Altitude Control',
        instruction: 'Elevate your arm to guide the glider upward and lower gently to bring it down through the rings.',
        postureTip: 'Maintain smooth breathing throughout each flight maneuver.',
      },
      {
        stepNumber: 3,
        title: 'Level Flight Hold',
        instruction: 'Hold the neutral horizon line between target gates to train trunk and shoulder isometric control.',
        postureTip: 'Engage your core gently to stabilize your torso.',
      },
    ],
  },
  {
    id: 7,
    name: 'Neural Hold Stabilizer (Rehab Game)',
    description:
      'Isometric stabilization game. Hold virtual limb steady inside neural energy rings until 100% charged to build joint proprioception and steadiness.',
    target_body_part: 'Joint Proprioception & Isometric Hold',
    difficulty: 'easy',
    recommended_frequency: '2x daily (5 holds)',
    media_assets: [
      {
        id: 7,
        exercise_id: 7,
        asset_type: 'video',
        url: 'https://youtu.be/yxmPWykyov4',
        title: 'Neural Hold Stabilizer Clinic Guide',
        thumbnail_url: 'https://img.youtube.com/vi/yxmPWykyov4/hqdefault.jpg',
      },
    ],
    step_guides: [
      {
        stepNumber: 1,
        title: 'Target Ring Acquisition',
        instruction: 'Move your hand smoothly into the glowing stabilization ring displayed on the screen.',
        postureTip: 'Keep your wrist neutral and relaxed without clenching your fist.',
      },
      {
        stepNumber: 2,
        title: 'Isometric Charge Hold',
        instruction: 'Maintain position inside the perimeter ring for 5 seconds until the charge meter fills.',
        postureTip: 'Avoid tremor by focusing on steady, rhythmic exhalations.',
      },
      {
        stepNumber: 3,
        title: 'Controlled Rest',
        instruction: 'Return arm to neutral resting position for 3 seconds before acquiring the next stabilizer gate.',
        postureTip: 'Completely relax your shoulder blade between holds.',
      },
    ],
  },
];

const FALLBACK_PATIENTS: PatientOption[] = [
  {
    patient_id: 1,
    user_id: 3,
    full_name: 'John Doe',
    injury_diagnosis: 'Post-Op Right ACL Reconstruction',
    baseline_rom_score: 85.0,
    notes: 'Surgery 3 weeks ago. Focus on extension and quad activation.',
  },
  {
    patient_id: 2,
    user_id: 4,
    full_name: 'Emily Rose',
    injury_diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Left)',
    baseline_rom_score: 45.0,
    notes: 'Stage 2 freezing phase. Moderate stiffness, avoid forced abduction.',
  },
];

// Helper to breakdown media assets clearly (e.g. "🎬 1 Clinical Video • 📋 5 Step Routine")
function getMediaBreakdown(assets: MediaAsset[]): string {
  if (!assets || assets.length === 0) return '📁 No media attached yet';
  const videos = assets.filter(a => a.asset_type === 'video').length;
  const diagrams = assets.filter(a => a.asset_type === 'diagram').length;
  const parts: string[] = [];
  if (videos > 0) parts.push(`🎬 ${videos} Clinical Video Tutorial${videos > 1 ? 's' : ''}`);
  if (diagrams > 0) parts.push(`📐 ${diagrams} Anatomical Diagram${diagrams > 1 ? 's' : ''}`);
  parts.push(`📋 5-Step Routine`);
  return parts.join(' • ');
}

// Helper cues by body part so patients know how to check their own posture at home
function getPostureCues(bodyPart: string): { doCue: string; dontCue: string } {
  const lower = bodyPart.toLowerCase();
  if (lower.includes('knee') || lower.includes('quad') || lower.includes('hamstring')) {
    return {
      doCue: 'Keep your pelvis neutral and press the back of your knee smoothly without holding your breath.',
      dontCue: 'Do not twist your ankle inward or force knee flexion past sharp joint pain (> 4/10).',
    };
  }
  if (lower.includes('shoulder')) {
    return {
      doCue: 'Keep your neck and upper trapezius relaxed; let momentum or smooth scapular control guide the movement.',
      dontCue: 'Do not shrug your shoulder toward your ear or arch your lower spine to compensate for stiffness.',
    };
  }
  return {
    doCue: 'Maintain core engagement, keep your spine aligned, and move slowly with controlled breathing.',
    dontCue: 'Do not jerk, bounce, or rush through repetitions if you feel sharp or radiating discomfort.',
  };
}

export interface LibraryModuleProps {
  currentUser?: AuthUser | null;
}

export const LibraryModule: React.FC<LibraryModuleProps> = ({ currentUser }) => {
  const isDoctorUser = currentUser?.role === 'doctor' || currentUser?.role === 'nurse';
  const isPatientUser = currentUser?.role === 'patient';

  // Role Mode: 'patient' (Guidance & Daily Checklist) vs 'physio' (Catalog & Media Manager)
  const [roleMode, setRoleMode] = useState<'patient' | 'physio'>(isDoctorUser ? 'physio' : 'patient');

  const playerCardRef = useRef<HTMLDivElement | null>(null);

  // Patient step-by-step checklist map
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Exercise catalog state
  const [catalog, setCatalog] = useState<ExerciseWithMedia[]>(FALLBACK_CATALOG);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number>(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Filters & search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');

  // Initial patient ID based on logged in user
  const initialPatientId =
    isPatientUser && currentUser?.patient_profile_id
      ? currentUser.patient_profile_id
      : (currentUser?.username === 'emily_rose' ? 2 : 1);

  // Patient Daily Guidance state ("Exercise Checklist")
  const [patients, setPatients] = useState<PatientOption[]>(FALLBACK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(initialPatientId);
  const [guidedItems, setGuidedItems] = useState<GuidedExerciseItem[]>([]);

  // Automatically sync role and patient id whenever logged in user changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'patient') {
        const pid = currentUser.patient_profile_id || (currentUser.username === 'emily_rose' ? 2 : 1);
        setSelectedPatientId(pid);
        setRoleMode('patient');
      } else {
        setRoleMode('physio');
      }
    }
  }, [currentUser]);
  const [completedChecklistIds, setCompletedChecklistIds] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('physio_mod3_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Physiotherapist CRUD state
  const [showExerciseForm, setShowExerciseForm] = useState<boolean>(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [exForm, setExForm] = useState({
    name: '',
    target_body_part: 'Knee / Quadriceps',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    recommended_frequency: '3x daily',
    description: '',
    initial_media_type: 'video' as 'video' | 'image' | 'diagram',
    initial_media_url: '',
    initial_media_title: '',
  });

  const [showAddMediaForm, setShowAddMediaForm] = useState<boolean>(false);
  const [mediaForm, setMediaForm] = useState({
    asset_type: 'video' as 'video' | 'image' | 'diagram',
    url: '',
    title: '',
    thumbnail_url: '',
  });

  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), 3500);
  };

  // Load catalog and patients from backend (with fallback)
  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/library/catalog');
      if (res.ok) {
        const json: ApiResponse<ExerciseWithMedia[]> = await res.json();
        if (json.data && json.data.length > 0) {
          // Merge with fallback step_guides for rich animated character walkthroughs
          const merged = json.data.map(item => {
            const fallback = FALLBACK_CATALOG.find(f => f.id === item.id);
            return {
              ...item,
              step_guides: fallback?.step_guides || [],
            };
          });
          setCatalog(merged);
          return;
        }
      }
    } catch {
      // Fallback already populated
    }
  };

  const loadPatients = async () => {
    try {
      const res = await fetch('/api/library/patients');
      if (res.ok) {
        const json: ApiResponse<PatientOption[]> = await res.json();
        if (json.data && json.data.length > 0) {
          setPatients(json.data);
        }
      }
    } catch {
      // Keep fallback patients
    }
  };

  const loadPatientGuidance = async (patientId: number, currentCatalog: ExerciseWithMedia[]) => {
    try {
      const res = await fetch(`/api/library/guidance/${patientId}`);
      if (res.ok) {
        const json: ApiResponse<PatientGuidancePayload> = await res.json();
        if (json.data && json.data.items) {
          setGuidedItems(json.data.items);
          return;
        }
      }
    } catch {
      // Use offline fallback derived from 002_seed.sql
    }

    // Offline fallback matching 002_seed.sql prescriptions
    if (patientId === 1) {
      const ex1 = currentCatalog.find(e => e.id === 1) || FALLBACK_CATALOG[0];
      const ex2 = currentCatalog.find(e => e.id === 2) || FALLBACK_CATALOG[1];
      setGuidedItems([
        {
          prescribed_id: 1,
          plan_id: 1,
          plan_title: 'Phase 1 ACL Recovery Protocol',
          doctor_name: 'Dr. Sarah Chen, MD',
          exercise_id: ex1.id,
          exercise_name: ex1.name,
          description: ex1.description,
          target_body_part: ex1.target_body_part,
          difficulty: ex1.difficulty,
          recommended_frequency: ex1.recommended_frequency,
          sets: 3,
          reps: 10,
          hold_seconds: 5,
          daily_frequency: 3,
          safety_notes: 'Stop if sharp knee pain exceeds 4/10.',
          order_index: 1,
          media_assets: ex1.media_assets,
        },
        {
          prescribed_id: 2,
          plan_id: 1,
          plan_title: 'Phase 1 ACL Recovery Protocol',
          doctor_name: 'Dr. Sarah Chen, MD',
          exercise_id: ex2.id,
          exercise_name: ex2.name,
          description: ex2.description,
          target_body_part: ex2.target_body_part,
          difficulty: ex2.difficulty,
          recommended_frequency: ex2.recommended_frequency,
          sets: 3,
          reps: 12,
          hold_seconds: 0,
          daily_frequency: 2,
          safety_notes: 'Use smooth gliding motions. Do not force flexion.',
          order_index: 2,
          media_assets: ex2.media_assets,
        },
      ]);
    } else {
      const ex3 = currentCatalog.find(e => e.id === 3) || FALLBACK_CATALOG[2];
      setGuidedItems([
        {
          prescribed_id: 3,
          plan_id: 2,
          plan_title: 'Shoulder Mobility & Pain Reduction',
          doctor_name: 'Dr. Sarah Chen, MD',
          exercise_id: ex3.id,
          exercise_name: ex3.name,
          description: ex3.description,
          target_body_part: ex3.target_body_part,
          difficulty: ex3.difficulty,
          recommended_frequency: ex3.recommended_frequency,
          sets: 2,
          reps: 15,
          hold_seconds: 0,
          daily_frequency: 3,
          safety_notes: 'Keep arm completely relaxed; momentum drives the swing.',
          order_index: 1,
          media_assets: ex3.media_assets,
        },
      ]);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadPatients();
  }, []);

  useEffect(() => {
    loadPatientGuidance(selectedPatientId, catalog);
  }, [selectedPatientId, catalog]);

  // Update HTML5 video playback speed whenever playbackRate changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, selectedExerciseId, activeMediaIndex]);

  const toggleStep = (stepNumber: number) => {
    const key = `${selectedExercise.id}_${stepNumber}`;
    setCompletedSteps(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save checklist state
  const toggleChecklistComplete = (prescribedId: number) => {
    setCompletedChecklistIds(prev => {
      const next = { ...prev, [prescribedId]: !prev[prescribedId] };
      try {
        localStorage.setItem('physio_mod3_checklist', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Filtered catalog list
  const filteredCatalog = useMemo(() => {
    return catalog.filter(ex => {
      const matchesBodyPart =
        bodyPartFilter === 'All' ||
        ex.target_body_part.toLowerCase().includes(bodyPartFilter.toLowerCase());
      const matchesDifficulty =
        difficultyFilter === 'All' || ex.difficulty === difficultyFilter.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.target_body_part.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBodyPart && matchesDifficulty && matchesSearch;
    });
  }, [catalog, bodyPartFilter, difficultyFilter, searchQuery]);

  // Currently active exercise for the Video & Tutorial Player
  const selectedExercise = useMemo(() => {
    return catalog.find(e => e.id === selectedExerciseId) || catalog[0] || FALLBACK_CATALOG[0];
  }, [catalog, selectedExerciseId]);

  // The primary video asset or active media asset
  const activeMedia: MediaAsset | undefined =
    selectedExercise?.media_assets?.[activeMediaIndex] || selectedExercise?.media_assets?.[0];

  // List of step-by-step guides for this exercise
  const currentStepGuides: StepGuideItem[] = useMemo(() => {
    if (selectedExercise.step_guides && selectedExercise.step_guides.length > 0) {
      return selectedExercise.step_guides;
    }
    const fallback = FALLBACK_CATALOG.find(f => f.id === selectedExercise.id);
    if (fallback?.step_guides && fallback.step_guides.length > 0) {
      return fallback.step_guides;
    }
    // Synthesize steps from description if none provided
    const sentences = selectedExercise.description
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim().replace(/^\d+[\.\)]\s*/, ''))
      .filter(s => s.length > 2);
    return sentences.map((instruction, idx) => ({
      stepNumber: idx + 1,
      title: `Step ${idx + 1}`,
      instruction,
      postureTip: 'Perform with steady breathing and smooth control.',
    }));
  }, [selectedExercise]);

  // Check if selected exercise has a prescription safety note for the current patient
  const matchingPrescription = useMemo(() => {
    return guidedItems.find(item => item.exercise_id === selectedExercise?.id);
  }, [guidedItems, selectedExercise]);

  // Dosage stats for selected exercise
  const prescribedSets = matchingPrescription?.sets || 3;
  const prescribedReps = matchingPrescription?.reps || 10;
  const prescribedHold =
    matchingPrescription?.hold_seconds ??
    (selectedExercise.name.toLowerCase().includes('isometric') ||
    selectedExercise.name.toLowerCase().includes('quadriceps')
      ? 5
      : selectedExercise.name.toLowerCase().includes('heel slide')
      ? 3
      : selectedExercise.name.toLowerCase().includes('wall angel')
      ? 2
      : 0);
  const prescribedFrequency = matchingPrescription?.daily_frequency
    ? `${matchingPrescription.daily_frequency}x Daily`
    : selectedExercise.recommended_frequency || '3x daily';

  // Step progress calculation
  const completedStepsCount = currentStepGuides.filter(
    g => !!completedSteps[`${selectedExercise.id}_${g.stepNumber}`]
  ).length;
  const stepsProgressPct =
    currentStepGuides.length > 0
      ? Math.round((completedStepsCount / currentStepGuides.length) * 100)
      : 0;

  const activePatient = useMemo(() => {
    const found = patients.find(p => p.patient_id === selectedPatientId);
    if (found) return found;
    if (currentUser?.role === 'patient') {
      return {
        patient_id: selectedPatientId,
        user_id: currentUser.id,
        full_name: currentUser.full_name,
        injury_diagnosis: currentUser.injury_diagnosis || 'General Physical Therapy / Rehabilitation',
        baseline_rom_score: 80.0,
        notes: 'Personalized recovery program',
      };
    }
    return FALLBACK_PATIENTS[0];
  }, [patients, selectedPatientId, currentUser]);

  const completedCount = guidedItems.filter(i => completedChecklistIds[i.prescribed_id]).length;

  // Select an exercise and reset media carousel index + auto-scroll to player
  const handleSelectExercise = (exerciseId: number, autoScroll: boolean = true) => {
    setSelectedExerciseId(exerciseId);
    setActiveMediaIndex(0);
    setPlaybackRate(1.0);
    if (autoScroll && playerCardRef.current) {
      playerCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Physiotherapist: Open Create or Edit Exercise Form
  const openCreateForm = () => {
    setEditingExerciseId(null);
    setExForm({
      name: '',
      target_body_part: 'Knee / Quadriceps',
      difficulty: 'easy',
      recommended_frequency: '3x daily',
      description: '',
      initial_media_type: 'video',
      initial_media_url: '',
      initial_media_title: '',
    });
    setShowExerciseForm(true);
  };

  const openEditForm = (ex: ExerciseWithMedia) => {
    setEditingExerciseId(ex.id);
    setExForm({
      name: ex.name,
      target_body_part: ex.target_body_part,
      difficulty: ex.difficulty,
      recommended_frequency: ex.recommended_frequency || '1x daily',
      description: ex.description,
      initial_media_type: 'video',
      initial_media_url: '',
      initial_media_title: '',
    });
    setShowExerciseForm(true);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exForm.name.trim() || !exForm.description.trim()) return;

    if (editingExerciseId !== null) {
      // Update existing exercise
      try {
        const res = await fetch(`/api/library/exercises/${editingExerciseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: exForm.name,
            description: exForm.description,
            target_body_part: exForm.target_body_part,
            difficulty: exForm.difficulty,
            recommended_frequency: exForm.recommended_frequency,
          }),
        });
        if (res.ok) {
          await loadCatalog();
          setShowExerciseForm(false);
          showToast(`Updated "${exForm.name}" in Exercise Library.`);
          return;
        }
      } catch {
        // Fallback local update
      }

      setCatalog(prev =>
        prev.map(item =>
          item.id === editingExerciseId
            ? {
                ...item,
                name: exForm.name,
                description: exForm.description,
                target_body_part: exForm.target_body_part,
                difficulty: exForm.difficulty,
                recommended_frequency: exForm.recommended_frequency,
              }
            : item
        )
      );
      setShowExerciseForm(false);
      showToast(`Updated "${exForm.name}" in Exercise Library.`);
    } else {
      // Create new exercise
      try {
        const res = await fetch('/api/library/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exForm),
        });
        if (res.ok) {
          const json: ApiResponse<ExerciseWithMedia> = await res.json();
          if (json.data) {
            await loadCatalog();
            setSelectedExerciseId(json.data.id);
            setShowExerciseForm(false);
            showToast(`Added "${exForm.name}" to Exercise Library.`);
            return;
          }
        }
      } catch {
        // Fallback local create
      }

      const newId = Math.max(0, ...catalog.map(c => c.id)) + 1;
      const newMedia: MediaAsset[] = exForm.initial_media_url.trim()
        ? [
            {
              id: Date.now(),
              exercise_id: newId,
              asset_type: exForm.initial_media_type,
              url: exForm.initial_media_url.trim(),
              title: exForm.initial_media_title.trim() || `${exForm.name} Tutorial`,
            },
          ]
        : [
            {
              id: Date.now(),
              exercise_id: newId,
              asset_type: 'video',
              url: 'https://youtu.be/HscSsKwohoQ',
              title: `${exForm.name} Demonstration Video`,
            },
          ];

      const created: ExerciseWithMedia = {
        id: newId,
        name: exForm.name.trim(),
        description: exForm.description.trim(),
        target_body_part: exForm.target_body_part.trim(),
        difficulty: exForm.difficulty,
        recommended_frequency: exForm.recommended_frequency.trim() || '1x daily',
        media_assets: newMedia,
      };
      setCatalog(prev => [...prev, created]);
      setSelectedExerciseId(newId);
      setShowExerciseForm(false);
      showToast(`Added "${created.name}" to Exercise Library.`);
    }
  };

  const handleDeleteExercise = async (id: number, name: string) => {
    try {
      await fetch(`/api/library/exercises/${id}`, { method: 'DELETE' });
    } catch {
      // fallback local delete
    }
    const remaining = catalog.filter(c => c.id !== id);
    setCatalog(remaining);
    if (selectedExerciseId === id && remaining.length > 0) {
      setSelectedExerciseId(remaining[0].id);
    }
    showToast(`Removed "${name}" from catalog.`, 'info');
  };

  const handleAddMediaAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaForm.url.trim() || !selectedExercise) return;

    try {
      const res = await fetch(`/api/library/exercises/${selectedExercise.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaForm),
      });
      if (res.ok) {
        await loadCatalog();
        setShowAddMediaForm(false);
        setMediaForm({ asset_type: 'video', url: '', title: '', thumbnail_url: '' });
        showToast('Attached new tutorial media asset.');
        return;
      }
    } catch {
      // Fallback local insert
    }

    const newAsset: MediaAsset = {
      id: Date.now(),
      exercise_id: selectedExercise.id,
      asset_type: mediaForm.asset_type,
      url: mediaForm.url.trim(),
      title: mediaForm.title.trim() || `${selectedExercise.name} (${mediaForm.asset_type})`,
      thumbnail_url: mediaForm.thumbnail_url.trim() || undefined,
    };

    setCatalog(prev =>
      prev.map(ex =>
        ex.id === selectedExercise.id
          ? { ...ex, media_assets: [...ex.media_assets, newAsset] }
          : ex
      )
    );
    setShowAddMediaForm(false);
    setMediaForm({ asset_type: 'video', url: '', title: '', thumbnail_url: '' });
    showToast('Attached new tutorial media asset.');
  };

  const postureCues = getPostureCues(selectedExercise?.target_body_part || '');

  const getDifficultyStyle = (diff: string) => {
    if (diff === 'easy') return { background: '#dcfce7', color: '#15803d' };
    if (diff === 'medium') return { background: '#fef3c7', color: '#b45309' };
    return { background: '#fee2e2', color: '#b91c1c' };
  };

  // YouTube Embed URL if active media is YouTube
  const ytEmbedUrl = activeMedia ? getYouTubeEmbedUrl(activeMedia.url) : null;

  return (
    <div>
      {/* Module Header & Role Mode Bar */}
      <div
        className="module-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span className="module-badge">Module 3 • Patient Guidance & Video Library</span>
          <h2>Rehabilitation Video Library & Daily Patient Guide</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Official physical therapy video tutorials, step-by-step technique guides, and daily prescribed exercise routines.
          </p>
        </div>

        {/* Role View Switcher or Locked Patient Badge */}
        {currentUser?.role === 'patient' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ecfdf5',
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <span>🏃 Patient Guidance Mode</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '0.3rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => setRoleMode('patient')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: roleMode === 'patient' ? '#0284c7' : 'transparent',
                color: roleMode === 'patient' ? '#ffffff' : '#475569',
                transition: 'all 0.15s',
              }}
            >
              {currentUser?.role === 'doctor' ? '👁️ Preview Patient View' : '👤 Patient Guidance Mode'}
            </button>
            <button
              type="button"
              onClick={() => setRoleMode('physio')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: roleMode === 'physio' ? '#0f172a' : 'transparent',
                color: roleMode === 'physio' ? '#ffffff' : '#475569',
                transition: 'all 0.15s',
              }}
            >
              🩺 Physiotherapist Manager
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification Banner */}
      {statusBanner && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            background: statusBanner.type === 'success' ? '#ecfdf5' : '#f0f9ff',
            border: `1px solid ${statusBanner.type === 'success' ? '#6ee7b7' : '#bae6fd'}`,
            color: statusBanner.type === 'success' ? '#065f46' : '#0369a1',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>✓ {statusBanner.text}</span>
          <button
            onClick={() => setStatusBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          ROLE PANEL 1: PATIENT EXERCISE CHECKLIST
         ===================================================================== */}
      {roleMode === 'patient' && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid #0284c7',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0 }}>📋 Exercise Checklist</h3>
                <span
                  className="tag"
                  style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  {completedCount} of {guidedItems.length} Exercises Completed
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                Diagnosis: <strong>{activePatient.injury_diagnosis}</strong>
                {activePatient.notes ? ` • Clinical Note: ${activePatient.notes}` : ''}
              </p>
            </div>

            {/* Profile info: Patient only sees own record; Doctor/Clinician can select patient */}
            {currentUser?.role === 'patient' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.45rem 0.85rem',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              >
                {currentUser.avatar_url && (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                    Assigned Patient:
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                    {currentUser.full_name}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Viewing Patient:
                </label>
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(Number(e.target.value))}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#fff',
                  }}
                >
                  {patients.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.full_name} ({p.injury_diagnosis.split('(')[0].trim()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: '8px',
              background: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                width: `${guidedItems.length > 0 ? (completedCount / guidedItems.length) * 100 : 0}%`,
                height: '100%',
                background: '#16a34a',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Prescribed Exercises Sequence */}
          {guidedItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No active prescribed exercises found for this patient. Browse the video catalog below!
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
                gap: '1rem',
              }}
            >
              {guidedItems.map((item, idx) => {
                const isDone = !!completedChecklistIds[item.prescribed_id];
                const isSelected = selectedExercise?.id === item.exercise_id;

                return (
                  <div
                    key={item.prescribed_id}
                    onClick={() => handleSelectExercise(item.exercise_id, true)}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: isSelected ? '2.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: isSelected ? '#f0f9ff' : isDone ? '#f0fdf4' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(2, 132, 199, 0.18)'
                        : isDone
                        ? 'none'
                        : '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      {/* Checkbox & Exercise Title */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleChecklistComplete(item.prescribed_id)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: '24px',
                              height: '24px',
                              accentColor: '#16a34a',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '1rem',
                              textDecoration: isDone ? 'line-through' : 'none',
                              color: isSelected ? '#0369a1' : isDone ? '#166534' : '#0f172a',
                            }}
                          >
                            Exercise {idx + 1}: {item.exercise_name}
                          </span>
                        </div>
                        <span className="tag" style={getDifficultyStyle(item.difficulty)}>
                          {item.difficulty.toUpperCase()}
                        </span>
                      </div>

                      {/* Prominently Highlighted Prescription Targets */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.45rem',
                          marginTop: '0.75rem',
                        }}
                      >
                        <span
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            background: '#e0f2fe',
                            border: '1px solid #bae6fd',
                            color: '#0369a1',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          🎯 Sets & Reps: {item.sets} Sets × {item.reps} Reps
                        </span>

                        <span
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            color: '#92400e',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          🔄 Frequency: {item.daily_frequency}x Every Day
                        </span>

                        {item.hold_seconds > 0 && (
                          <span
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              background: '#ede9fe',
                              border: '1px solid #ddd6fe',
                              color: '#6d28d9',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                            }}
                          >
                            ⏱️ Hold Time: {item.hold_seconds}s
                          </span>
                        )}
                      </div>

                      {/* Doctor Safety Warning */}
                      {item.safety_notes && (
                        <div
                          style={{
                            marginTop: '0.65rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            color: '#92400e',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                          }}
                        >
                          ⚠️ <strong>Doctor's Safety Note:</strong> {item.safety_notes}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.25rem',
                        paddingTop: '0.6rem',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Plan: {item.plan_title} ({item.doctor_name})
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectExercise(item.exercise_id, true);
                        }}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? '#0f172a' : '#0284c7',
                          color: 'white',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {isSelected ? '▶ Viewing Video Below' : '🎬 Watch Official Video'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ROLE PANEL 2: PHYSIOTHERAPIST LIBRARY MANAGER BAR
         ===================================================================== */}
      {roleMode === 'physio' && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid #0f172a',
            background: '#f8fafc',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>🩺 Physiotherapist Exercise & Media Manager</h3>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                Curate clinical rehabilitation exercises, posture instructions, and YouTube tutorial videos for prescriptions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={openCreateForm}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0284c7',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                + Add New Exercise to Catalog
              </button>
              {selectedExercise && (
                <button
                  type="button"
                  onClick={() => setShowAddMediaForm(prev => !prev)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #0f172a',
                    background: 'white',
                    color: '#0f172a',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  🎬 Attach YouTube Video to "{selectedExercise.name}"
                </button>
              )}
            </div>
          </div>

          {/* Create / Edit Exercise Form */}
          {showExerciseForm && (
            <form
              onSubmit={handleSaveExercise}
              style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #cbd5e1',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.85rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Exercise Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Seated Knee Extension"
                  value={exForm.name}
                  onChange={e => setExForm({ ...exForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Target Body Part *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Knee / Quadriceps, Shoulder, Back"
                  value={exForm.target_body_part}
                  onChange={e => setExForm({ ...exForm, target_body_part: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Difficulty Level
                </label>
                <select
                  value={exForm.difficulty}
                  onChange={e =>
                    setExForm({ ...exForm, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })
                  }
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="easy">Easy (Early Rehab)</option>
                  <option value="medium">Medium (Progressive Mobility)</option>
                  <option value="hard">Hard (Advanced Strength)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Recommended Routine Frequency
                </label>
                <input
                  type="text"
                  placeholder="e.g., 3x daily"
                  value={exForm.recommended_frequency}
                  onChange={e => setExForm({ ...exForm, recommended_frequency: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Step-by-Step Patient Instructions (Separate each step with a period .) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Step 1: Sit flat with leg straight. Step 2: Tighten thigh muscle. Step 3: Hold 5 seconds. Step 4: Slowly release."
                  value={exForm.description}
                  onChange={e => setExForm({ ...exForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {editingExerciseId === null && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Initial Media Type
                    </label>
                    <select
                      value={exForm.initial_media_type}
                      onChange={e =>
                        setExForm({
                          ...exForm,
                          initial_media_type: e.target.value as 'video' | 'image' | 'diagram',
                        })
                      }
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="video">YouTube Video URL</option>
                      <option value="diagram">Anatomical Diagram URL</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      YouTube Video URL (e.g. https://youtu.be/HscSsKwohoQ)
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtu.be/HscSsKwohoQ"
                      value={exForm.initial_media_url}
                      onChange={e => setExForm({ ...exForm, initial_media_url: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowExerciseForm(false)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.45rem 1.1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0284c7',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {editingExerciseId !== null ? 'Save Changes' : 'Create Exercise'}
                </button>
              </div>
            </form>
          )}

          {/* Attach Media Asset Form */}
          {showAddMediaForm && selectedExercise && (
            <form
              onSubmit={handleAddMediaAsset}
              style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #cbd5e1',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Asset Type
                </label>
                <select
                  value={mediaForm.asset_type}
                  onChange={e =>
                    setMediaForm({
                      ...mediaForm,
                      asset_type: e.target.value as 'video' | 'image' | 'diagram',
                    })
                  }
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="video">YouTube Video</option>
                  <option value="diagram">Anatomical Diagram</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Video Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Clinical Technique Walkthrough"
                  value={mediaForm.title}
                  onChange={e => setMediaForm({ ...mediaForm, title: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  YouTube Link (e.g., https://youtu.be/...) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://youtu.be/..."
                  value={mediaForm.url}
                  onChange={e => setMediaForm({ ...mediaForm, url: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMediaForm(false)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f172a',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Attach to "{selectedExercise.name}"
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* =====================================================================
          MAIN SPLIT VIEW: LEFT = FILTERABLE EXERCISE CATALOG, RIGHT = VIDEO & CAROUSEL PLAYER
         ===================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.45fr)',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Filterable Exercise Catalog */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>📚 Exercise Catalog ({filteredCatalog.length})</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              SQLite <code>exercises</code>
            </span>
          </div>

          {/* Search Input */}
          <div style={{ marginTop: '0.75rem' }}>
            <input
              type="text"
              placeholder="🔍 Search exercise name, muscle, or instruction..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Category Filter Pills (Target Body Part) */}
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>
              Filter by Target Body Part:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {['All', 'Knee', 'Shoulder', 'Back'].map(part => (
                <button
                  key={part}
                  type="button"
                  onClick={() => setBodyPartFilter(part)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: bodyPartFilter === part ? '#0284c7' : '#cbd5e1',
                    background: bodyPartFilter === part ? '#e0f2fe' : '#ffffff',
                    color: bodyPartFilter === part ? '#0369a1' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {part}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter Pills */}
          <div style={{ marginTop: '0.6rem', marginBottom: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>
              Filter by Difficulty:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {['All', 'Easy', 'Medium', 'Hard'].map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: difficultyFilter === diff ? '#0f172a' : '#e2e8f0',
                    background: difficultyFilter === diff ? '#0f172a' : '#f8fafc',
                    color: difficultyFilter === diff ? '#ffffff' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              maxHeight: '540px',
              overflowY: 'auto',
              paddingRight: '0.2rem',
            }}
          >
            {filteredCatalog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No exercises match your current filter.
              </div>
            ) : (
              filteredCatalog.map(ex => {
                const isSelected = selectedExercise?.id === ex.id;
                return (
                  <div
                    key={ex.id}
                    onClick={() => handleSelectExercise(ex.id)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ color: isSelected ? '#0369a1' : '#0f172a', fontSize: '0.95rem' }}>
                        {ex.name}
                      </strong>
                      <span className="tag" style={getDifficultyStyle(ex.difficulty)}>
                        {ex.difficulty}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: '#475569',
                        margin: '0.4rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ex.description}
                    </p>

                    {/* Prominent Routine Frequency & Muscle Target */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginTop: '0.45rem',
                      }}
                    >
                      <span style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.78rem' }}>
                        🎯 {ex.target_body_part}
                      </span>
                      <span
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid #bae6fd',
                        }}
                      >
                        🔄 Routine: {ex.recommended_frequency || '1x daily'}
                      </span>
                    </div>

                    {/* Explicit Media Breakdown (e.g. 🎬 1 Video • 🎮 5 Game Steps) */}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                      {getMediaBreakdown(ex.media_assets)}
                    </div>

                    {/* Physiotherapist Quick Edit / Delete Controls */}
                    {roleMode === 'physio' && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginTop: '0.6rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid #e2e8f0',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditForm(ex)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          ✏️ Edit Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExercise(ex.id, ex.name)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Professional Clinical Video Tutorial & Step-by-Step Exercise Checklist */}
        {selectedExercise && (
          <div ref={playerCardRef} className="card" style={{ marginBottom: 0 }}>
            {/* Header with Exercise Title and Clinical Prescription Match Badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.85rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{selectedExercise.name}</h3>
                  <span className="tag" style={getDifficultyStyle(selectedExercise.difficulty)}>
                    {selectedExercise.difficulty.toUpperCase()}
                  </span>
                  {matchingPrescription && (
                    <span
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span>📋</span>
                      <span>Prescribed to {activePatient.full_name}</span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600, marginTop: '0.25rem' }}>
                  🎯 Target Anatomy: {selectedExercise.target_body_part} • 🔄 Recommended Routine:{' '}
                  {selectedExercise.recommended_frequency || '1x daily'}
                </div>
              </div>

              {/* YouTube External Link Pill */}
              {activeMedia?.url && (
                <a
                  href={activeMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    border: '1px solid #bae6fd',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>📺 Open in YouTube</span>
                  <span>↗</span>
                </a>
              )}
            </div>

            {/* Video Sub-Header: Playback Controls & Video Title */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                <span>📹</span>
                <span>Clinical Video Demonstration (Official Tutorial)</span>
              </div>

              {/* Playback Speed Controls for Clinical Inspection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>⚡ Speed:</span>
                {[0.5, 0.75, 1.0, 1.25].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: playbackRate === rate ? '#0284c7' : '#ffffff',
                      color: playbackRate === rate ? '#ffffff' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Hero Clinical Video Player Container */}
            <div
              style={{
                background: '#000000',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
                minHeight: '280px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
            >
              {ytEmbedUrl ? (
                <iframe
                  key={ytEmbedUrl}
                  src={ytEmbedUrl}
                  title={activeMedia?.title || selectedExercise.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    width: '100%',
                    height: '380px',
                    border: 'none',
                    display: 'block',
                    background: '#000',
                  }}
                />
              ) : activeMedia?.asset_type === 'video' ? (
                <video
                  key={activeMedia.url}
                  ref={videoRef}
                  src={activeMedia.url}
                  poster={activeMedia.thumbnail_url}
                  controls
                  playsInline
                  preload="auto"
                  style={{ width: '100%', maxHeight: '380px', display: 'block', background: '#000' }}
                />
              ) : (
                <div
                  style={{
                    height: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🎬</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Clinical Video Loading...</span>
                </div>
              )}

              {/* Caption Bar */}
              <div
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  padding: '0.55rem 0.95rem',
                  fontSize: '0.82rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <span>
                  <strong>🎬 Tutorial:</strong> {activeMedia?.title || `${selectedExercise.name} Clinical Guide`}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                  Licensed Physiotherapy Demonstration
                </span>
              </div>
            </div>

            {/* High-Visibility Clinical Prescription & Dosage Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem',
                marginTop: '0.85rem',
                marginBottom: '0.85rem',
              }}
            >
              {/* Target Sets */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target Sets
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0c4a6e', marginTop: '0.15rem' }}>
                  {prescribedSets} Sets
                </div>
                <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '0.1rem' }}>
                  Per Session
                </div>
              </div>

              {/* Repetitions */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Repetitions
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#14532d', marginTop: '0.15rem' }}>
                  {prescribedReps} Reps
                </div>
                <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.1rem' }}>
                  Each Set
                </div>
              </div>

              {/* Hold Duration */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Hold Duration
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#78350f', marginTop: '0.15rem' }}>
                  {prescribedHold > 0 ? `${prescribedHold}s Hold` : 'Fluid Flow'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.1rem' }}>
                  {prescribedHold > 0 ? 'Peak Contraction' : 'Continuous Tempo'}
                </div>
              </div>

              {/* Daily Frequency */}
              <div
                style={{
                  background: '#faf5ff',
                  border: '1.5px solid #e9d5ff',
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Daily Routine
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#581c87', marginTop: '0.15rem' }}>
                  {prescribedFrequency}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9333ea', marginTop: '0.1rem' }}>
                  Recommended
                </div>
              </div>
            </div>

            {/* Doctor's Safety Alert Callout if Prescribed */}
            {matchingPrescription?.safety_notes && (
              <div
                style={{
                  marginBottom: '0.85rem',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <div style={{ fontSize: '0.82rem', color: '#b45309' }}>
                  <strong>Physiotherapist Safety Note:</strong> {matchingPrescription.safety_notes}
                </div>
              </div>
            )}

            {/* Step-by-Step Clinical Technique Checklist */}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '1rem',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Checklist Header & Progress Bar */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📋</span>
                    <span>Step-by-Step Clinical Technique Checklist</span>
                  </h4>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: stepsProgressPct === 100 ? '#15803d' : '#0369a1',
                      background: stepsProgressPct === 100 ? '#dcfce7' : '#e0f2fe',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                    }}
                  >
                    {completedStepsCount} of {currentStepGuides.length} Steps Done ({stepsProgressPct}%)
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${stepsProgressPct}%`,
                      height: '100%',
                      background: stepsProgressPct === 100 ? '#22c55e' : '#0284c7',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Step Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {currentStepGuides.map(guide => {
                  const isDone = !!completedSteps[`${selectedExercise.id}_${guide.stepNumber}`];
                  return (
                    <div
                      key={guide.stepNumber}
                      onClick={() => toggleStep(guide.stepNumber)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.85rem',
                        padding: '0.75rem 0.95rem',
                        background: isDone ? '#f0fdf4' : '#ffffff',
                        borderRadius: '8px',
                        border: isDone ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Large 24px x 24px Checkbox */}
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleStep(guide.stepNumber)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          marginTop: '0.15rem',
                          flexShrink: 0,
                          accentColor: '#16a34a',
                        }}
                      />

                      {/* Number Badge */}
                      <span
                        style={{
                          minWidth: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: isDone ? '#16a34a' : '#0284c7',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          flexShrink: 0,
                          marginTop: '0.1rem',
                        }}
                      >
                        {guide.stepNumber}
                      </span>

                      {/* Step Text & Form Cue */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            color: isDone ? '#166534' : '#0f172a',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          Step {guide.stepNumber}: {guide.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.84rem',
                            color: isDone ? '#15803d' : '#334155',
                            marginTop: '0.2rem',
                            lineHeight: 1.4,
                          }}
                        >
                          {guide.instruction}
                        </div>

                        {/* Form Cue */}
                        {guide.postureTip && (
                          <div
                            style={{
                              marginTop: '0.4rem',
                              fontSize: '0.78rem',
                              color: '#0369a1',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px',
                              padding: '0.3rem 0.55rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <span>💡</span>
                            <span>
                              <strong>Form Cue:</strong> {guide.postureTip}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Posture Self-Check Cues (Normal Sensations vs Common Red Flags) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
                marginTop: '0.85rem',
              }}
            >
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.8rem',
                  color: '#166534',
                }}
              >
                <strong>✅ Correct Posture Cue:</strong>
                <div style={{ marginTop: '0.25rem', lineHeight: 1.45 }}>{postureCues.doCue}</div>
              </div>
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                }}
              >
                <strong>❌ Common Mistake to Avoid:</strong>
                <div style={{ marginTop: '0.25rem', lineHeight: 1.45 }}>{postureCues.dontCue}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
