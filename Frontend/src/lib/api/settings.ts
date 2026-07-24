import { apiClient } from "./client";

export interface Setting {
  key: string;
  value: string;
  description: string | null;
}

export async function listSettings(): Promise<Setting[]> {
  const res = await apiClient.get("/settings");
  return res.data.data;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await apiClient.patch(`/settings/${key}`, { value });
}
