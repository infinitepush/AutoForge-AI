import { VehicleConfiguration, VehicleProject } from "./types";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error((await response.json()).detail ?? "Request failed");
  return response.json();
}

export const generateVehicle = (prompt: string) =>
  request<VehicleProject>("/generate", { method: "POST", body: JSON.stringify({ prompt }) });

export const getVehicle = (id: string) => request<VehicleProject>(`/vehicle/${id}`);

export const updateVehicle = (id: string, configuration: VehicleConfiguration) =>
  request<VehicleProject>("/vehicle/update", {
    method: "POST",
    body: JSON.stringify({ id, configuration }),
  });

