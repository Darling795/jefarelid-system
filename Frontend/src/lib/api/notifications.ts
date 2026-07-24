import { apiClient } from "./client";

export type AlertSeverity = "danger" | "warning" | "info";

export interface AlertItem {
  id: string;
  type:
    | "rent_overdue"
    | "rent_due"
    | "contract_expiring"
    | "utility_overdue"
    | "utility_due";
  severity: AlertSeverity;
  title: string;
  message: string;
  href: string;
  date: string;
}

export async function getAlerts(): Promise<AlertItem[]> {
  const res = await apiClient.get<{ data: AlertItem[] }>("/notifications/alerts");
  return res.data.data;
}
