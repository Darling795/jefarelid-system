import { apiClient, unwrap } from "./client";
import type { AuthUser } from "./types";

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<{ data: { user: AuthUser } }>("/auth/login", {
    email,
    password,
  });
  return unwrap(res).user;
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiClient.get<{ data: { user: AuthUser } }>("/auth/me");
  return unwrap(res).user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post("/auth/change-password", { currentPassword, newPassword });
}
