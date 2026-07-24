export type Role = "super_admin" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastLoginAt: string | null;
}

export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
}

/** Normalized error thrown by the API client. UI switches on `code`. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
