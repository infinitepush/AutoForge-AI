import { VehicleConfiguration, VehicleProject } from "./types";
let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

if (typeof window !== "undefined") {
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.endsWith(".local")
  ) {
    baseUrl = "http://localhost:8000";
  }
}

export const API_URL = baseUrl;

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

