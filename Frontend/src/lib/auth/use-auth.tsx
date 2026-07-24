"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import type { AuthUser } from "@/lib/api/types";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMe,
    retry: (count, error) => {
      // Don't retry an expected "not logged in" response.
      if (error instanceof ApiError && error.status === 401) return false;
      return count < 1;
    },
    staleTime: 60_000,
  });

  return (
    <AuthContext.Provider value={{ user: data ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
