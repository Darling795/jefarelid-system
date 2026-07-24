import { apiClient, unwrap } from "./client";
import type { RoomListItem } from "./rooms";

export interface Building {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  roomCount: number;
  occupiedCount: number;
}

export interface BuildingDetail {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rooms: RoomListItem[];
}

export interface BuildingInput {
  name: string;
  address?: string;
  notes?: string;
}

export async function listBuildings(): Promise<Building[]> {
  const res = await apiClient.get<{ data: Building[] }>("/buildings");
  return unwrap(res);
}

export async function getBuilding(id: string): Promise<BuildingDetail> {
  const res = await apiClient.get<{ data: BuildingDetail }>(`/buildings/${id}`);
  return unwrap(res);
}

export async function createBuilding(input: BuildingInput): Promise<BuildingDetail> {
  const res = await apiClient.post<{ data: BuildingDetail }>("/buildings", input);
  return unwrap(res);
}

export async function updateBuilding(
  id: string,
  input: BuildingInput,
): Promise<BuildingDetail> {
  const res = await apiClient.patch<{ data: BuildingDetail }>(
    `/buildings/${id}`,
    input,
  );
  return unwrap(res);
}

export async function deleteBuilding(id: string): Promise<void> {
  await apiClient.delete(`/buildings/${id}`);
}
