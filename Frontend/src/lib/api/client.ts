import axios, { AxiosError } from "axios";

import { ApiError } from "./types";

/**
 * Shared Axios instance. Every request sends credentials so the httpOnly
 * session cookie flows to the backend (API-CONTRACT.md → Conventions).
 * The base URL comes from the environment, never hardcoded in components.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Normalize the backend error envelope { error: { code, message, details } }
// into an ApiError so callers can switch on a stable `code`.
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: { code: string; message: string; details?: unknown } }>) => {
    const envelope = error.response?.data?.error;
    if (envelope) {
      return Promise.reject(
        new ApiError(
          envelope.code,
          envelope.message,
          error.response?.status ?? 0,
          envelope.details,
        ),
      );
    }
    return Promise.reject(
      new ApiError(
        "NETWORK_ERROR",
        error.message || "Unable to reach the server.",
        error.response?.status ?? 0,
      ),
    );
  },
);

/** Unwrap the standard { data } success envelope. */
export function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data;
}
