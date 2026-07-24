import { apiClient } from "./client";
import type { ListMeta } from "./types";

export interface ContractListItem {
  id: string;
  tenant: { id: string; businessName: string };
  roomNumber: string;
  buildingName: string;
  startDate: string;
  endDate: string;
  basicRent: string;
  status: string;
  rawStatus: string;
}

export interface ContractInvoiceRow {
  id: string;
  periodMonth: string;
  netReceivable: string;
  dueDate: string;
  status: string;
}

export interface ContractDetail {
  id: string;
  tenant: { id: string; businessName: string };
  room: { id: string; roomNumber: string; building: { id: string; name: string } };
  startDate: string;
  endDate: string;
  basicRent: string;
  escalationRate: string;
  escalationAnchorDate: string;
  securityDeposit: string;
  advancePayment: string;
  paymentDueDay: number;
  status: string;
  rawStatus: string;
  parentContractId: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  invoices: ContractInvoiceRow[];
}

export interface CreateContractInput {
  tenantId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  basicRent: string;
  escalationRate?: string;
  escalationAnchorDate?: string;
  securityDeposit: string;
  advancePayment: string;
  paymentDueDay: number;
}

export async function listContracts(params: {
  status?: string;
  buildingId?: string;
  tenantId?: string;
  page?: number;
}): Promise<{ data: ContractListItem[]; meta: ListMeta }> {
  const res = await apiClient.get("/contracts", { params: { pageSize: 100, ...params } });
  return res.data;
}

export async function getContract(id: string): Promise<ContractDetail> {
  const res = await apiClient.get(`/contracts/${id}`);
  return res.data.data;
}

export async function createContract(input: CreateContractInput): Promise<ContractDetail> {
  const res = await apiClient.post("/contracts", input);
  return res.data.data;
}

export async function activateContract(id: string): Promise<ContractDetail> {
  const res = await apiClient.post(`/contracts/${id}/activate`);
  return res.data.data;
}

export async function renewContract(
  id: string,
  input: { startDate: string; endDate: string; basicRent?: string; escalationRate?: string },
): Promise<ContractDetail> {
  const res = await apiClient.post(`/contracts/${id}/renew`, input);
  return res.data.data;
}

export async function terminateContract(
  id: string,
  input: { effectiveDate: string; reason: string },
): Promise<ContractDetail> {
  const res = await apiClient.post(`/contracts/${id}/terminate`, input);
  return res.data.data;
}
