import { apiClient } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface DocumentItem {
  id: string;
  label: string;
  category: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export async function listTenantDocuments(tenantId: string): Promise<DocumentItem[]> {
  const res = await apiClient.get<{ data: DocumentItem[] }>(
    `/tenants/${tenantId}/documents`,
  );
  return res.data.data;
}

export async function listContractDocuments(contractId: string): Promise<DocumentItem[]> {
  const res = await apiClient.get<{ data: DocumentItem[] }>(
    `/contracts/${contractId}/documents`,
  );
  return res.data.data;
}

async function upload(
  path: string,
  file: File,
  meta: { label?: string; category?: string },
): Promise<DocumentItem> {
  const form = new FormData();
  form.append("file", file);
  if (meta.label) form.append("label", meta.label);
  if (meta.category) form.append("category", meta.category);
  // Unset the client's default JSON content-type so the browser sets
  // multipart/form-data with the correct boundary.
  const res = await apiClient.post<{ data: DocumentItem }>(path, form, {
    headers: { "Content-Type": null },
  });
  return res.data.data;
}

export function uploadTenantDocument(
  tenantId: string,
  file: File,
  meta: { label?: string; category?: string },
) {
  return upload(`/tenants/${tenantId}/documents`, file, meta);
}

export function uploadContractDocument(
  contractId: string,
  file: File,
  meta: { label?: string; category?: string },
) {
  return upload(`/contracts/${contractId}/documents`, file, meta);
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

/** Direct URL to view/download a document (session cookie rides along). */
export function documentFileUrl(id: string): string {
  return `${API_URL}/documents/${id}/file`;
}
