import {
  ApiResponse,
  User,
  TreatmentPlan,
  TreatmentPlanDetail,
  CreatePlanPayload,
  UpdatePlanPayload,
  PatientOption,
  CreatePatientPayload,
  UpdatePatientPayload,
  Exercise,
  GameSession,
  ActivityLog,
  PatientRecoverySummary,
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    const json: ApiResponse<T> = JSON.parse(text);
    return json.data ?? null;
  } catch (err) {
    console.warn(`[API Client] Failed fetching ${endpoint}:`, err);
    return null;
  }
}

async function sendJson<T>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!text || text.trim() === '') {
      return {
        success: false,
        message: 'Backend server is offline (no response from http://127.0.0.1:3001).',
      };
    }
    try {
      const json: ApiResponse<T> = JSON.parse(text);
      return json;
    } catch {
      return {
        success: false,
        message: 'Backend returned non-JSON response. Please check backend server status.',
      };
    }
  } catch (err: any) {
    console.warn(`[API Client] Failed ${method} ${endpoint}:`, err);
    return {
      success: false,
      message: err?.message?.includes('JSON')
        ? 'Backend server is offline (http://127.0.0.1:3001). Please run cargo run in backend.'
        : err?.message || 'Network request failed',
    };
  }
}

export const api = {
  // Module 1
  getUsers: () => fetchJson<User[]>('/auth/users'),

  // Module 2: Doctor Prescription
  getTreatmentPlans: () => fetchJson<TreatmentPlan[]>('/prescription/plans'),
  getTreatmentPlanDetail: (id: number) => fetchJson<TreatmentPlanDetail>(`/prescription/plans/${id}`),
  getPrescriptionPatients: () => fetchJson<PatientOption[]>('/prescription/patients'),
  createPrescriptionPatient: (payload: CreatePatientPayload) =>
    sendJson<number>('/prescription/patients', 'POST', payload),
  updatePrescriptionPatient: (id: number, payload: UpdatePatientPayload) =>
    sendJson<void>(`/prescription/patients/${id}`, 'PUT', payload),
  createTreatmentPlan: (payload: CreatePlanPayload) => sendJson<number>('/prescription/plans', 'POST', payload),
  updateTreatmentPlan: (id: number, payload: UpdatePlanPayload) =>
    sendJson<void>(`/prescription/plans/${id}`, 'PUT', payload),
  updatePlanStatus: (id: number, status: 'active' | 'completed' | 'paused') =>
    sendJson<void>(`/prescription/plans/${id}/status`, 'PATCH', { status }),
  deleteTreatmentPlan: (id: number) => sendJson<void>(`/prescription/plans/${id}`, 'DELETE'),
  deletePrescribedExercise: (exerciseId: number) => sendJson<void>(`/prescription/exercises/${exerciseId}`, 'DELETE'),

  // Module 3
  getExercises: () => fetchJson<Exercise[]>('/library/exercises'),
  // Module 4
  getGameSessions: () => fetchJson<GameSession[]>('/game/sessions'),
  // Module 5
  getActivityLogs: () => fetchJson<ActivityLog[]>('/logger/logs'),
  // Module 6
  getRecoverySummary: () => fetchJson<PatientRecoverySummary[]>('/analytics/summary'),
};
