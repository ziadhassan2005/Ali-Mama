import type { Order, OrderStatus, OrdersListResponse } from "../types/order.types";
import { apiClient } from "./client";

interface CreateOrderRequestPayload {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod?: string;
  shippingAddress?: Record<string, string>;
}

export function createOrderRequest(
  payload: CreateOrderRequestPayload,
  token: string
): Promise<Order> {
  return apiClient<Order>("/api/orders", {
    method: "POST",
    token,
    body: payload,
  });
}

export function fetchMyOrders(
  token: string,
  params: { page?: number; limit?: number; status?: OrderStatus } = {}
): Promise<OrdersListResponse> {
  const search = new URLSearchParams();

  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);

  const query = search.toString();
  return apiClient<OrdersListResponse>(`/api/orders/my-orders${query ? `?${query}` : ""}`, {
    token,
  });
}

export function fetchOrderById(token: string, orderId: string): Promise<Order> {
  return apiClient<Order>(`/api/orders/${orderId}`, { token });
}

export function fetchAdminOrders(
  token: string,
  params: { page?: number; limit?: number; status?: OrderStatus } = {}
): Promise<OrdersListResponse> {
  const search = new URLSearchParams();

  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);

  const query = search.toString();
  return apiClient<OrdersListResponse>(`/api/orders${query ? `?${query}` : ""}`, {
    token,
  });
}

export function updateOrderStatus(
  token: string,
  orderId: string,
  updates: { status?: OrderStatus; paymentStatus?: string }
): Promise<Order> {
  return apiClient<Order>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: updates,
  });
}
