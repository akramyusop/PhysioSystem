import {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
  TreatmentPlan,
  TreatmentPlanDetail,
  PatientOption,
  CreatePatientPayload,
  UpdatePatientPayload,
  CreatePlanPayload,
  UpdatePlanPayload,
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

async function postApiResponse<T, P>(endpoint: string, payload: P): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch (err: any) {
    console.warn(`[API Client] Failed posting ${endpoint}:`, err);
    return { success: false, message: err?.message || 'Network request failed' };
  }
}

async function putApiResponse<T, P>(endpoint: string, payload: P): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch (err: any) {
    console.warn(`[API Client] Failed putting ${endpoint}:`, err);
    return { success: false, message: err?.message || 'Network request failed' };
  }
}

async function patchApiResponse<T, P>(endpoint: string, payload: P): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch (err: any) {
    console.warn(`[API Client] Failed patching ${endpoint}:`, err);
    return { success: false, message: err?.message || 'Network request failed' };
  }
}

async function deleteApiResponse<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch (err: any) {
    console.warn(`[API Client] Failed deleting ${endpoint}:`, err);
    return { success: false, message: err?.message || 'Network request failed' };
  }
}

export const api = {
  // Module 1: Auth
  register: (payload: RegisterPayload) => postJson<AuthUser, RegisterPayload>('/auth/register', payload),
  login: (payload: LoginPayload) => postJson<AuthUser, LoginPayload>('/auth/login', payload),
  getUsers: () => fetchJson<AuthUser[]>('/auth/users'),

  // Module 2: Doctor Prescription & Treatment Plans
  getTreatmentPlans: () => fetchJson<TreatmentPlan[]>('/prescription/plans'),
  getPrescriptionPatients: () => fetchJson<PatientOption[]>('/prescription/patients'),
  getTreatmentPlanDetail: (id: number) => fetchJson<TreatmentPlanDetail>(`/prescription/plans/${id}`),
  createTreatmentPlan: (payload: CreatePlanPayload) =>
    postApiResponse<TreatmentPlan, CreatePlanPayload>('/prescription/plans', payload),
  updateTreatmentPlan: (id: number, payload: UpdatePlanPayload) =>
    putApiResponse<TreatmentPlan, UpdatePlanPayload>(`/prescription/plans/${id}`, payload),
  updatePlanStatus: (id: number, status: string) =>
    patchApiResponse<{ id: number; status: string }, { status: string }>(`/prescription/plans/${id}/status`, { status }),
  deleteTreatmentPlan: (id: number) =>
    deleteApiResponse<{ deleted: boolean }>(`/prescription/plans/${id}`),
  createPrescriptionPatient: (payload: CreatePatientPayload) =>
    postApiResponse<any, CreatePatientPayload>('/prescription/patients', payload),
  updatePrescriptionPatient: (id: number, payload: UpdatePatientPayload) =>
    putApiResponse<PatientOption, UpdatePatientPayload>(`/prescription/patients/${id}`, payload),

  // Module 3: Exercise Library
  getExercises: () => fetchJson<Exercise[]>('/library/exercises'),

  // Module 4: Rehab Game
  getGameSessions: () => fetchJson<GameSession[]>('/game/sessions'),
  getHighScores: () => fetchJson<HighScore[]>('/game/high-scores'),
  createGameSession: (payload: CreateGameSessionInput) =>
    postJson<GameSession, CreateGameSessionInput>('/game/sessions', payload),

  // Module 5: Activity & Vitals Logger
  getActivityLogs: () => fetchJson<ActivityLog[]>('/logger/logs'),

  // Module 6: Analytics
  getRecoverySummary: () => fetchJson<PatientRecoverySummary[]>('/analytics/summary'),
};