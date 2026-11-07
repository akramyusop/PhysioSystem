import {
  ApiResponse,
  User,
  TreatmentPlan,
  Exercise,
  GameSession,
  ActivityLog,
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

export const api = {
  // Module 1
  getUsers: () => fetchJson<User[]>('/auth/users'),
  // Module 2
  getTreatmentPlans: () => fetchJson<TreatmentPlan[]>('/prescription/plans'),
  // Module 3
  getExercises: () => fetchJson<Exercise[]>('/library/exercises'),
  // Module 4
  getGameSessions: () => fetchJson<GameSession[]>('/game/sessions'),
  // Module 5
  getActivityLogs: () => fetchJson<ActivityLog[]>('/logger/logs'),
  // Module 6
  getRecoverySummary: () => fetchJson<PatientRecoverySummary[]>('/analytics/summary'),
};
