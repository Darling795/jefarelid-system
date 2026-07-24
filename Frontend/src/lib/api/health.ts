import { apiClient } from "./client";

export interface HealthResponse {
  status: string;
  timestamp: string;
}

/**
 * GET /api/health — used in step 0 to confirm the two servers are talking.
 * The health endpoint is not wrapped in the standard { data } envelope.
 */
export async function getHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}
