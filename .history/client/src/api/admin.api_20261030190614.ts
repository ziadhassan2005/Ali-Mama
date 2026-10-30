import type { AdminCustomer, AdminInventoryResponse, AdminOverviewResponse } from "../types/admin.types";
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
