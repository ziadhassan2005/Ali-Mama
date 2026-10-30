export type AdminRangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export interface AdminOverviewResponse {
  range: {
    key: AdminRangeKey;
    start: string;
    end: string;
  };
  metrics: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    lowStock: number;
    avgOrderValue: number;
    pendingOrders: number;
  };
  deltas: {
    revenue: { value: number; direction: "up" | "down" | "flat" };
    orders: { value: number; direction: "up" | "down" | "flat" };
    customers: { value: number; direction: "up" | "down" | "flat" };
  };
  revenueTrend: Array<{ label: string; revenue: number; orders: number }>;
  categoryBreakdown: Array<{ name: string; value: number; share: number }>;
  statusBreakdown: Array<{ status: string; count: number; share: number }>;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  joinedAt: string | Date;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
}

export interface AdminInventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
  popularity: number;
  imageUrl?: string;
  createdAt: string | Date;
}

export interface AdminInventoryResponse {
  products: AdminInventoryItem[];
  total: number;
  lowStock: number;
  outOfStock: number;
}
