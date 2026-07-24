import { apiClient } from "./client";

export interface SearchResult {
  type: "tenant" | "building" | "contract" | "invoice";
  label: string;
  sublabel: string;
  href: string;
}

export async function searchAll(q: string): Promise<SearchResult[]> {
  const res = await apiClient.get<{ data: SearchResult[] }>("/search", {
    params: { q },
  });
  return res.data.data;
}
