import { apiClient } from "./client";

export interface DashboardSummary {
  buildings: number;
  rooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  activeTenants: number;
  activeContracts: number;
  outstandingTotal: string;
}

export interface IncomePoint {
  month: string;
  billed: string;
  collected: string;
}

export interface OccupancyData {
  portfolio: { occupied: number; total: number; rate: number };
  perBuilding: { buildingName: string; occupied: number; total: number; rate: number }[];
}

export interface Receivables {
  current: string;
  days30: string;
  days60: string;
  days90Plus: string;
  total: string;
}

export interface ExpiringContract {
  id: string;
  tenantName: string;
  buildingName: string;
  roomNumber: string;
  endDate: string;
  daysLeft: number;
}

export interface TopTenant {
  tenantId: string;
  tenantName: string;
  revenue: string;
}

const get = async <T>(path: string): Promise<T> => (await apiClient.get(path)).data.data;

export const getSummary = () => get<DashboardSummary>("/dashboard/summary");
export const getIncomeTrend = (months = 12) =>
  get<IncomePoint[]>(`/dashboard/income-trend?months=${months}`);
export const getOccupancy = () => get<OccupancyData>("/dashboard/occupancy");
export const getReceivables = () => get<Receivables>("/dashboard/receivables");
export const getExpiring = (days = 90) =>
  get<ExpiringContract[]>(`/dashboard/expiring?days=${days}`);
export const getTopTenants = (limit = 10) =>
  get<TopTenant[]>(`/dashboard/top-tenants?limit=${limit}`);
