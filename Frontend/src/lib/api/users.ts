import { apiClient } from "./client";
import type { Role } from "./types";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
}

export async function listUsers(): Promise<UserItem[]> {
  const res = await apiClient.get("/users");
  return res.data.data;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<UserItem> {
  const res = await apiClient.post("/users", input);
  return res.data.data;
}

export async function updateUser(
  id: string,
  input: { name?: string; isActive?: boolean },
): Promise<UserItem> {
  const res = await apiClient.patch(`/users/${id}`, input);
  return res.data.data;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, { newPassword });
}

export async function unlockUser(id: string): Promise<void> {
  await apiClient.post(`/users/${id}/unlock`);
}
