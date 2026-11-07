import {
  ApiResponse,
  User,
  TreatmentPlan,
  Exercise,
  GameSession,
  ActivityLog,
  VitalNote,
  PatientRecoverySummary,
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.warn(`[API Client] Failed fetching ${endpoint}:`, err);
    return null;
  }
}

async function postJson<T, B = unknown>(endpoint: string, body: B): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.warn(`[API Client] Failed posting to ${endpoint}:`, err);
    return null;
  }
}

export const api = {
  // Module 1
  getUsers: () => fetchJson<User[]>('/auth/users'),
  // Module 2
  getTreatmentPlans: () => fetchJson<TreatmentPlan[]>('/prescription/plans'),
  // Module 3
  getExercises: () => fetchJson<Exercise[]>('/library/exercises'),
  // Module 4
  getGameSessions: () => fetchJson<GameSession[]>('/game/sessions'),
  // Module 5: Nurse & Activity Logger
  getActivityLogs: (patientId?: string) =>
    fetchJson<ActivityLog[]>(patientId ? `/logger/activities?patient_id=${encodeURIComponent(patientId)}` : '/logger/activities'),
  postActivityLog: (log: ActivityLog) => postJson<{ id: number }>('/logger/activities', log),
  getVitalNotes: (patientId?: string) =>
    fetchJson<VitalNote[]>(patientId ? `/logger/vitals?patient_id=${encodeURIComponent(patientId)}` : '/logger/vitals'),
  postVitalNote: (vital: VitalNote) => postJson<{ id: number }>('/logger/vitals', vital),
  voidRecord: (id: number, recordType: 'activity' | 'vitals', reason: string) =>
    postJson<{ success: boolean }>('/logger/void', { id, record_type: recordType, reason }),
  // Module 6
  getRecoverySummary: () => fetchJson<PatientRecoverySummary[]>('/analytics/summary'),
};
