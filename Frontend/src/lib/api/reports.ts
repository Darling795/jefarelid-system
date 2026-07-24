import { apiClient } from "./client";

export interface ReportTable {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number | null>[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function fetchReport(
  type: string,
  params: Record<string, string | undefined>,
): Promise<ReportTable> {
  const res = await apiClient.get(`/reports/${type}`, {
    params: { ...params, format: "json" },
  });
  return res.data.data;
}

/** Trigger a file download (xlsx/pdf). The session cookie rides along on the navigation. */
export function downloadReport(
  type: string,
  params: Record<string, string | undefined>,
  format: "xlsx" | "pdf",
) {
  const qs = new URLSearchParams({ format });
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const a = document.createElement("a");
  a.href = `${API_URL}/reports/${type}?${qs.toString()}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
