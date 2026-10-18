import { apiClient } from "./client";
import type { ListMeta } from "./types";

export type PaymentMethod = "cash" | "postdated_check";

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  postdated_check: "Postdated check",
  advance_credit: "Advance credit",
};

export interface PaymentListItem {
  id: string;
  invoiceId: string;
  tenantName: string;
  periodMonth: string;
  amountPaid: string;
  paymentDate: string;
  orNumber: string | null;
  paymentMethod: string | null;
  checkNumber: string | null;
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
  paymentMethod: PaymentMethod;
  checkNumber?: string;
  remarks?: string;
}

export async function listPayments(params: {
  tenantId?: string;
  buildingId?: string;
  periodMonth?: string;
  orNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}): Promise<{ data: PaymentListItem[]; meta: ListMeta }> {
  const res = await apiClient.get("/payments", { params: { pageSize: 100, ...params } });
  return res.data;
}

export interface CreatePaymentResult {
  id: string;
  amountPaid: string;
  /** Portion applied to the invoice (may be less than the cash received). */
  appliedAmount: string;
  /** Excess captured as a tenant advance credit, if any. */
  advanceCredit: string | null;
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const res = await apiClient.post("/payments", input);
  return res.data.data;
}

export interface UpdatePaymentInput {
  amountPaid?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  checkNumber?: string;
  remarks?: string;
}

export async function updatePayment(id: string, input: UpdatePaymentInput) {
  const res = await apiClient.patch(`/payments/${id}`, input);
  return res.data.data;
}

export async function getOutstanding(params: {
  tenantId?: string;
  buildingId?: string;
}): Promise<Outstanding> {
  const res = await apiClient.get("/payments/outstanding", { params });
  return res.data.data;
}
