// lib/api.ts — typed fetch helpers for all backend + ML endpoints

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ems_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string; email: string; companyName: string; customerId: number;
}
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export interface BranchSummary {
  branchId: number; city: string | null; deviceCount: number;
  totalEnergyUsage: number; budgetAlert: number;
}
export interface DashboardInfo {
  customerId: number; companyName: string; branches: BranchSummary[];
}
export async function getDashboardInfo(): Promise<DashboardInfo> {
  return apiFetch('/api/dashboard/information');
}

export interface TimeSeriesPoint { time: string; energyKwh: number; }
export interface BranchDetail { branchId: number; city: string; days: number; data: TimeSeriesPoint[]; }
export async function getBranchDetail(branchId: number, days = 7): Promise<BranchDetail> {
  return apiFetch(`/api/dashboard/information/${branchId}?days=${days}`);
}

// ─── Inventory ──────────────────────────────────────────────────────────────
export interface DeviceDto {
  id: number; branchId: number; city: string | null; deviceType: string;
  modelName: string | null; installDate: string; isActive: boolean; serialNumber: string | null;
}
export async function getDevices(): Promise<DeviceDto[]> {
  return apiFetch('/api/inventory/getdevices');
}
export async function addDevice(data: {
  branchId: number; deviceType: string; modelName?: string;
  installDate: string; serialNumber?: string;
}): Promise<DeviceDto> {
  return apiFetch('/api/inventory/adddevice', { method: 'POST', body: JSON.stringify(data) });
}

// ─── ML Service ─────────────────────────────────────────────────────────────
export interface AnomalyPoint { timestamp: string; value: number; anomaly: boolean; score: number; }
export interface AnomalyResult {
  branch_id: number; total_points: number; anomaly_count: number;
  anomaly_rate: number; anomalies: AnomalyPoint[]; detail: AnomalyPoint[];
}
export async function analyzeAnomalies(branchId: number, days = 30): Promise<AnomalyResult> {
  return apiFetch(`/api/dashboard/information/${branchId}/analytics?days=${days}`);
}

export interface ForecastPoint { timestamp: string; forecast_kwh: number; lower: number; upper: number; method: string; }
export interface ForecastResult { branch_id: number; predictions: ForecastPoint[]; }
export async function getForecast(branchId: number, horizon = 7): Promise<ForecastResult> {
  // We bundled predictions with analytics in the backend
  return apiFetch(`/api/dashboard/information/${branchId}/analytics`);
}
