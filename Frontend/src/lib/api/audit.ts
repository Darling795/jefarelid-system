import { apiClient } from "./client";
import type { ListMeta } from "./types";

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: { id: string; name: string } | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogItem {
  beforeJson: unknown;
  afterJson: unknown;
}

export async function listAuditLogs(params: {
  userId?: string;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}): Promise<{ data: AuditLogItem[]; meta: ListMeta }> {
  const res = await apiClient.get("/audit-logs", { params: { pageSize: 50, ...params } });
  return res.data;
}

export async function getAuditLog(id: string): Promise<AuditLogDetail> {
  const res = await apiClient.get(`/audit-logs/${id}`);
  return res.data.data;
}
