export type OrderStatus =
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ShippingAddress {
    fullName?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
}

export interface OrderItemSnapshot {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
}

export interface Order {
    id: string;
    userId: string;
    orderNumber: string;
    items: OrderItemSnapshot[];
    totalAmount: number;
    status: OrderStatus;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    shippingAddress?: ShippingAddress;
    createdAt: string;
    updatedAt: string;
}

export interface OrdersListResponse {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateOrderRequest {
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod?: string;
    shippingAddress?: ShippingAddress;
}
