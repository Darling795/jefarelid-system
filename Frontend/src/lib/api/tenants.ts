import { apiClient } from "./client";
import type { ListMeta } from "./types";

export type TenantStatus = "active" | "inactive";

export interface TenantActiveLease {
  contractId: string;
  buildingName: string;
  roomNumbers: string[];
}

export interface TenantListItem {
  id: string;
  businessName: string;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  tin: string | null;
  status: TenantStatus;
  activeContracts: number;
  activeLeases: TenantActiveLease[];
}

export interface TenantContractRow {
  id: string;
  roomNumber: string;
  buildingName: string;
  startDate: string;
  endDate: string;
  basicRent: string;
  status: string;
}

export interface TenantDetail {
  id: string;
  businessName: string;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  tin: string | null;
  address: string | null;
  notes: string | null;
  status: TenantStatus;
  outstandingBalance: string;
  contracts: TenantContractRow[];
}

export interface TenantPayment {
  id: string;
  invoiceId: string;
  periodMonth: string;
  amountPaid: string;
  paymentDate: string;
  orNumber: string | null;
  paymentMethod: string | null;
  remarks: string | null;
}

export interface TenantInput {
  businessName: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  tin?: string;
  address?: string;
  notes?: string;
  status?: TenantStatus;
}

export async function listTenants(
  search?: string,
  status?: TenantStatus | "all",
): Promise<{ data: TenantListItem[]; meta: ListMeta }> {
  const res = await apiClient.get<{ data: TenantListItem[]; meta: ListMeta }>(
    "/tenants",
    {
      params: {
        search: search || undefined,
        status: status && status !== "all" ? status : undefined,
        pageSize: 100,
      },
    },
  );
  return res.data;
}

export async function getTenant(id: string): Promise<TenantDetail> {
  const res = await apiClient.get<{ data: TenantDetail }>(`/tenants/${id}`);
  return res.data.data;
}

export async function createTenant(input: TenantInput): Promise<TenantDetail> {
  const res = await apiClient.post<{ data: TenantDetail }>("/tenants", input);
  return res.data.data;
}

export async function updateTenant(
  id: string,
  input: TenantInput,
): Promise<TenantDetail> {
  const res = await apiClient.patch<{ data: TenantDetail }>(`/tenants/${id}`, input);
  return res.data.data;
}

export async function deleteTenant(id: string): Promise<void> {
  await apiClient.delete(`/tenants/${id}`);
}

export async function getTenantPayments(id: string): Promise<TenantPayment[]> {
  const res = await apiClient.get<{ data: TenantPayment[] }>(
    `/tenants/${id}/payments`,
  );
  return res.data.data;
}

export interface TenantCredit {
  id: string;
  amount: string;
  remaining: string;
  sourceInvoiceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface TenantCredits {
  totalRemaining: string;
  credits: TenantCredit[];
}

export async function getTenantCredits(id: string): Promise<TenantCredits> {
  const res = await apiClient.get<{ data: TenantCredits }>(
    `/tenants/${id}/credits`,
  );
  return res.data.data;
}

export async function applyTenantCredit(
  id: string,
  input: { invoiceId: string; amount: string },
): Promise<TenantCredits> {
  const res = await apiClient.post<{ data: TenantCredits }>(
    `/tenants/${id}/credits/apply`,
    input,
  );
  return res.data.data;
}
