import {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
  TreatmentPlan,
  Exercise,
  GameSession,
  CreateGameSessionInput,
  HighScore,
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

async function postJson<T, P>(endpoint: string, payload: P): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.warn(`[API Client] Failed posting ${endpoint}:`, err);
    return null;
  }
}

export const api = {
  // Module 1
  register: (payload: RegisterPayload) => postJson<AuthUser, RegisterPayload>("/auth/register", payload),
  login: (payload: LoginPayload) => postJson<AuthUser, LoginPayload>('/auth/login', payload),
  getUsers: () => fetchJson<AuthUser[]>('/auth/users'),
  // Module 2
  getTreatmentPlans: () => fetchJson<TreatmentPlan[]>('/prescription/plans'),
  // Module 3
  getExercises: () => fetchJson<Exercise[]>('/library/exercises'),
  // Module 4
  getGameSessions: () => fetchJson<GameSession[]>('/game/sessions'),
  getHighScores: () => fetchJson<HighScore[]>('/game/high-scores'),
  createGameSession: (payload: CreateGameSessionInput) =>
    postJson<GameSession, CreateGameSessionInput>('/game/sessions', payload),
  // Module 5
  getActivityLogs: () => fetchJson<ActivityLog[]>('/logger/logs'),
  // Module 6
  getRecoverySummary: () => fetchJson<PatientRecoverySummary[]>('/analytics/summary'),
};