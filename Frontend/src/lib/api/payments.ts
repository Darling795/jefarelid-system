import { apiClient } from "./client";
import type { ListMeta } from "./types";

export interface PaymentListItem {
  id: string;
  invoiceId: string;
  tenantName: string;
  periodMonth: string;
  amountPaid: string;
  paymentDate: string;
  orNumber: string | null;
  paymentMethod: string | null;
}

export interface Outstanding {
  current: string;
  days30: string;
  days60: string;
  days90Plus: string;
  total: string;
}

export interface CreatePaymentInput {
  invoiceId: string;
  amountPaid: string;
  paymentDate: string;
  orNumber?: string;
  paymentMethod?: string;
  remarks?: string;
}

export async function listPayments(params: {
  tenantId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}): Promise<{ data: PaymentListItem[]; meta: ListMeta }> {
  const res = await apiClient.get("/payments", { params: { pageSize: 100, ...params } });
  return res.data;
}

export async function createPayment(input: CreatePaymentInput) {
  const res = await apiClient.post("/payments", input);
  return res.data.data;
}

export async function getOutstanding(params: {
  tenantId?: string;
  buildingId?: string;
}): Promise<Outstanding> {
  const res = await apiClient.get("/payments/outstanding", { params });
  return res.data.data;
}
