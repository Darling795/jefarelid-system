import { apiClient } from "./client";
import type { ListMeta } from "./types";

export type UtilityType = "electric" | "phone" | "water" | "wifi";
export const UTILITY_TYPES: { value: UtilityType; label: string }[] = [
  { value: "electric", label: "Electric" },
  { value: "phone", label: "Phone" },
  { value: "water", label: "Water" },
  { value: "wifi", label: "WiFi" },
];

export interface UtilityBillListItem {
  id: string;
  buildingId: string;
  buildingName: string;
  utilityType: UtilityType;
  billingPeriod: string;
  amount: string;
  amountPaid: string;
  balance: string;
  dueDate: string;
  status: string;
}

export interface UtilityBillDetail {
  id: string;
  building: { id: string; name: string };
  utilityType: UtilityType;
  billingPeriod: string;
  amount: string;
  amountPaid: string;
  balance: string;
  dueDate: string;
  status: string;
  payments: {
    id: string;
    amountPaid: string;
    paymentDate: string;
    voucherNumber: string | null;
    orNumber: string | null;
  }[];
}

export async function listUtilityBills(params: {
  buildingId?: string;
  utilityType?: string;
  status?: string;
  page?: number;
}): Promise<{ data: UtilityBillListItem[]; meta: ListMeta }> {
  const res = await apiClient.get("/utility-bills", { params: { pageSize: 100, ...params } });
  return res.data;
}

export async function getUtilityBill(id: string): Promise<UtilityBillDetail> {
  const res = await apiClient.get(`/utility-bills/${id}`);
  return res.data.data;
}

export async function createUtilityBill(input: {
  buildingId: string;
  utilityType: UtilityType;
  billingPeriod: string;
  amount: string;
  dueDate: string;
}): Promise<UtilityBillDetail> {
  const res = await apiClient.post("/utility-bills", input);
  return res.data.data;
}

export async function recordUtilityPayment(
  id: string,
  input: { amountPaid: string; paymentDate: string; voucherNumber?: string; orNumber?: string },
): Promise<UtilityBillDetail> {
  const res = await apiClient.post(`/utility-bills/${id}/payments`, input);
  return res.data.data;
}
