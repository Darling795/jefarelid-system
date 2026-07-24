import { apiClient } from "./client";
import type { ListMeta } from "./types";

export interface InvoiceListItem {
  id: string;
  contractId: string;
  tenantName: string;
  roomNumber: string;
  buildingName: string;
  periodMonth: string;
  netReceivable: string;
  amountPaid: string;
  balance: string;
  dueDate: string;
  status: string;
}

export interface InvoicePaymentRow {
  id: string;
  amountPaid: string;
  paymentDate: string;
  orNumber: string | null;
  paymentMethod: string | null;
  remarks: string | null;
}

export interface InvoiceDetail {
  id: string;
  contractId: string;
  tenant: { id: string; businessName: string };
  roomNumber: string;
  buildingName: string;
  periodMonth: string;
  basicRentApplied: string;
  vatAmount: string;
  grossRent: string;
  whtAmount: string;
  netReceivable: string;
  amountPaid: string;
  balance: string;
  dueDate: string;
  status: string;
  generatedAt: string;
  payments: InvoicePaymentRow[];
}

export async function listInvoices(params: {
  tenantId?: string;
  buildingId?: string;
  status?: string;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
}): Promise<{ data: InvoiceListItem[]; meta: ListMeta }> {
  const res = await apiClient.get("/invoices", { params: { pageSize: 100, ...params } });
  return res.data;
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const res = await apiClient.get(`/invoices/${id}`);
  return res.data.data;
}

export async function generateInvoices(
  periodMonth: string,
  contractId?: string,
): Promise<InvoiceListItem[]> {
  const res = await apiClient.post("/invoices/generate", { periodMonth, contractId });
  return res.data.data;
}

export async function voidInvoice(id: string, reason: string): Promise<InvoiceDetail> {
  const res = await apiClient.post(`/invoices/${id}/void`, { reason });
  return res.data.data;
}
