import { Order } from "../orders/orders.model";
import { Product } from "../products/models/product.model";
import { User } from "../users/models/user.model";

export type AdminRangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export interface RangeBounds {
    start: Date;
    end: Date;
    key: AdminRangeKey;
}

export interface OverviewMetricDelta {
    value: number;
    direction: "up" | "down" | "flat";
}

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
        revenue: OverviewMetricDelta;
        orders: OverviewMetricDelta;
        customers: OverviewMetricDelta;
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

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

function roundNumber(value: number): number {
    return Number(value.toFixed(2));
}

function toPercentDelta(current: number, previous: number): number {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }

    return roundNumber(((current - previous) / previous) * 100);
}

function getDelta(current: number, previous: number): OverviewMetricDelta {
    const value = toPercentDelta(current, previous);

    if (value > 0) {
        return { value, direction: "up" };
    }

    if (value < 0) {
        return { value: Math.abs(value), direction: "down" };
    }

    return { value: 0, direction: "flat" };
}

function formatLabel(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function resolveRange(rangeKey: string | undefined, from?: string, to?: string): RangeBounds {
    const key = (rangeKey === "today" || rangeKey === "7d" || rangeKey === "30d" || rangeKey === "90d" || rangeKey === "custom")
        ? rangeKey
        : "30d";

    const end = to ? new Date(to) : new Date();
    const now = new Date(end);

    if (key === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { key, start, end: now };
    }

    if (key === "custom") {
        const parsedFrom = from ? new Date(from) : null;
        const parsedTo = to ? new Date(to) : null;

        if (parsedFrom && parsedTo && !Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
            return { key, start: parsedFrom, end: parsedTo };
        }

        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        return { key: "30d", start, end: now };
    }

    const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    return { key, start, end: now };
}

export async function getAdminOverview(rangeKey: string | undefined, from?: string, to?: string): Promise<AdminOverviewResponse> {
    const range = resolveRange(rangeKey, from, to);
    const currentWindowStart = range.start;
    const currentWindowEnd = range.end;

    const durationMs = Math.max(1, currentWindowEnd.getTime() - currentWindowStart.getTime());
    const previousWindowEnd = new Date(currentWindowStart);
    const previousWindowStart = new Date(currentWindowStart);
    previousWindowStart.setTime(previousWindowStart.getTime() - durationMs);

    const [orders, products, registeredUsers, previousOrders] = await Promise.all([
        Order.find({ createdAt: { $gte: currentWindowStart, $lte: currentWindowEnd } }).lean(),
        Product.find({}).lean(),
        User.find({ role: "shopper" }).lean(),
        Order.find({ createdAt: { $gte: previousWindowStart, $lt: previousWindowEnd } }).lean(),
    ]);

    const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
    const previousOrderCount = previousOrders.length;

    const customerCount = registeredUsers.length;
    const productCount = products.length;
    const lowStockCount = products.filter((product) => Number(product.stock ?? 0) <= 5).length;
    const pendingOrdersCount = orders.filter((order) => order.status === "pending").length;
    const avgOrderValue = orders.length ? revenue / orders.length : 0;

    const customerUsers = await User.find({ role: "shopper" }).select("_id name email createdAt").lean();
    const customerLookup = new Map<string, { name: string; email: string }>();
    for (const user of customerUsers) {
        customerLookup.set(String(user._id), {
            name: user.name,
            email: user.email,
        });
    }

    const orderByStatus = new Map<string, number>();
    for (const status of ORDER_STATUSES) {
        orderByStatus.set(status, 0);
    }

    for (const order of orders) {
        orderByStatus.set(order.status, (orderByStatus.get(order.status) ?? 0) + 1);
    }

    const statusBreakdown = ORDER_STATUSES.map((status) => {
        const count = orderByStatus.get(status) ?? 0;
        return {
            status,
            count,
            share: orders.length ? Number(((count / orders.length) * 100).toFixed(1)) : 0,
        };
    }).filter((value) => value.count > 0 || value.status === "pending");

    const revenueTrend: Array<{ label: string; revenue: number; orders: number }> = [];
    const totalDays = Math.max(1, Math.ceil((currentWindowEnd.getTime() - currentWindowStart.getTime()) / 86400000) + 1);

    for (let index = 0; index < totalDays; index += 1) {
        const date = new Date(currentWindowStart);
        date.setDate(date.getDate() + index);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const matchingOrders = orders.filter(
            (order) => new Date(order.createdAt) >= date && new Date(order.createdAt) < nextDate
        );

        const dayRevenue = matchingOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
        revenueTrend.push({
            label: formatLabel(date),
            revenue: roundNumber(dayRevenue),
            orders: matchingOrders.length,
        });
    }

    const categoryCounts = new Map<string, number>();
    for (const product of products) {
        const key = product.category?.trim() || "Uncategorized";
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }

    const categoryBreakdown = [...categoryCounts.entries()]
        .map(([name, value]) => ({
            name,
            value,
            share: productCount ? Number(((value / productCount) * 100).toFixed(1)) : 0,
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 5);

    const productSales = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of orders) {
        for (const item of order.items ?? []) {
            const productKey = String(item.productId ?? item.name);
            const current = productSales.get(productKey) ?? { name: item.name, units: 0, revenue: 0 };
            current.units += Number(item.quantity ?? 0);
            current.revenue += Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
            productSales.set(productKey, current);
        }
    }

    const topProducts = [...productSales.values()]
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 5)
        .map((entry) => ({
            name: entry.name,
            units: entry.units,
            revenue: roundNumber(entry.revenue),
        }));

    const recentOrders = [...orders]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6)
        .map((order) => {
            const userName = customerLookup.get(String(order.userId))?.name ?? "Customer";
            return {
                id: String((order as { _id?: unknown; id?: string })._id ?? order.id),
                orderNumber: order.orderNumber,
                customerName: userName,
                totalAmount: Number(order.totalAmount ?? 0),
                status: order.status,
                createdAt: new Date(order.createdAt).toISOString(),
            };
        });

    const overview: AdminOverviewResponse = {
        range: {
            key: range.key,
            start: currentWindowStart.toISOString(),
            end: currentWindowEnd.toISOString(),
        },
        metrics: {
            revenue: roundNumber(revenue),
            orders: orders.length,
            customers: customerCount,
            products: productCount,
            lowStock: lowStockCount,
            avgOrderValue: roundNumber(avgOrderValue),
            pendingOrders: pendingOrdersCount,
        },
        deltas: {
            revenue: getDelta(revenue, previousRevenue),
            orders: getDelta(orders.length, previousOrderCount),
            customers: getDelta(customerCount, customerCount),
        },
        revenueTrend,
        categoryBreakdown,
        statusBreakdown,
        topProducts,
        recentOrders,
    };

    return overview;
}
