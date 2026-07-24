import { apiClient, unwrap } from "./client";

export type RoomStatus = "vacant" | "occupied" | "reserved";

export interface RoomListItem {
  id: string;
  roomNumber: string;
  floor: string | null;
  areaSqm: string | null;
  baseRate: string;
  status: RoomStatus;
  isActive: boolean;
  currentTenantName: string | null;
  contractEndDate: string | null;
}

export interface RoomDetail {
  id: string;
  roomNumber: string;
  floor: string | null;
  areaSqm: string | null;
  baseRate: string;
  status: RoomStatus;
  isActive: boolean;
  building: { id: string; name: string };
  currentContract: {
    id: string;
    startDate: string;
    endDate: string;
    basicRent: string;
    status: string;
  } | null;
  tenant: { id: string; businessName: string } | null;
}

export interface RoomInput {
  roomNumber: string;
  floor?: string;
  areaSqm?: string;
  baseRate: string;
}

export async function listRooms(buildingId: string): Promise<RoomListItem[]> {
  const res = await apiClient.get<{ data: RoomListItem[] }>(
    `/buildings/${buildingId}/rooms`,
  );
  return unwrap(res);
}

export async function getRoom(id: string): Promise<RoomDetail> {
  const res = await apiClient.get<{ data: RoomDetail }>(`/rooms/${id}`);
  return unwrap(res);
}

export async function createRoom(
  buildingId: string,
  input: RoomInput,
): Promise<RoomDetail> {
  const res = await apiClient.post<{ data: RoomDetail }>(
    `/buildings/${buildingId}/rooms`,
    input,
  );
  return unwrap(res);
}

export async function updateRoom(
  id: string,
  input: Partial<RoomInput> & { status?: RoomStatus; isActive?: boolean },
): Promise<RoomDetail> {
  const res = await apiClient.patch<{ data: RoomDetail }>(`/rooms/${id}`, input);
  return unwrap(res);
}

export async function deleteRoom(id: string): Promise<void> {
  await apiClient.delete(`/rooms/${id}`);
}
