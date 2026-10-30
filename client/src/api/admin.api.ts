import type {
    AdminCustomer,
    AdminImportExecutionResponse,
    AdminImportPreviewResponse,
    AdminInventoryResponse,
    AdminOverviewResponse,
} from "../types/admin.types";
import { apiClient } from "./client";

export function fetchAdminOverview(
    token: string,
    range: string = "30d"
): Promise<AdminOverviewResponse> {
    return apiClient<AdminOverviewResponse>(`/api/admin/overview?range=${encodeURIComponent(range)}`, {
        token,
    });
}

export function fetchAdminCustomers(token: string): Promise<AdminCustomer[]> {
    return apiClient<{ customers: AdminCustomer[]; total: number }>("/api/admin/customers", {
        token,
    }).then((response) => response.customers);
}

export function fetchAdminInventory(token: string, search = ""): Promise<AdminInventoryResponse> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiClient<AdminInventoryResponse>(`/api/admin/inventory${query}`, {
        token,
    });
}

export function fetchAdminImportSources(token: string): Promise<{ sources: string[] }> {
    return apiClient<{ sources: string[] }>("/api/admin/import/sources", { token });
}

export function previewAdminImport(
    token: string,
    payload: { source: string; limit?: number; items?: Record<string, unknown>[] }
): Promise<AdminImportPreviewResponse> {
    return apiClient<AdminImportPreviewResponse>("/api/admin/import/preview", {
        method: "POST",
        token,
        body: payload,
    });
}

export function executeAdminImport(
    token: string,
    payload: { source: string; limit?: number; items?: Record<string, unknown>[]; dryRun?: boolean }
): Promise<AdminImportExecutionResponse> {
    return apiClient<AdminImportExecutionResponse>("/api/admin/import/execute", {
        method: "POST",
        token,
        body: payload,
    });
}
