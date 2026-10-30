import mongoose from "mongoose";
import { HttpError } from "../common/errors/http-error";
import { Product } from "../products/models/product.model";
import { Order, IOrder, OrderStatus, PaymentStatus } from "./orders.model";

export interface OrderLineItemInput {
    productId: string;
    quantity: number;
}

export interface OrderCreateInput {
    items: OrderLineItemInput[];
    paymentMethod?: string;
    shippingAddress?: Record<string, unknown>;
}

export interface OrderListResult {
    orders: IOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function getOrderId(order: Partial<IOrder> & { _id?: unknown }): string {
    const rawId = "_id" in order ? order._id : order.id;
    return rawId ? String(rawId) : "";
}

function normalizeShippingAddress(
    shippingAddress: Record<string, unknown> | undefined
): Record<string, string> | undefined {
    if (!shippingAddress || typeof shippingAddress !== "object") {
        return undefined;
    }

    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(shippingAddress)) {
        if (typeof value === "string" && value.trim()) {
            normalized[key] = value.trim();
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function serializeOrder(order: IOrder) {
    return {
        id: order.id,
        userId: order.userId,
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}

export class OrdersService {
    async create(userId: string, dto: OrderCreateInput) {
        const items = Array.isArray(dto.items) ? dto.items : [];
        if (items.length === 0) {
            throw new HttpError(400, "Order items are required");
        }

        const normalizedItems: OrderLineItemInput[] = [];
        const productIds: string[] = [];

        for (const [index, entry] of items.entries()) {
            if (!entry || typeof entry !== "object") {
                throw new HttpError(400, `Invalid item at index ${index}`);
            }

            const record = entry as unknown as Record<string, unknown>;
            const productId = typeof record.productId === "string" ? record.productId.trim() : "";
            const quantity = Number(record.quantity);

            if (!productId) {
                throw new HttpError(400, `Invalid product ID at index ${index}`);
            }

            if (!Number.isInteger(quantity) || quantity < 1) {
                throw new HttpError(400, `Invalid quantity for product ${productId}`);
            }

            normalizedItems.push({ productId, quantity });
            productIds.push(productId);
        }

        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((product) => [product.id, product]));

        let totalAmount = 0;
        const snapshots = [] as Array<{
            productId: string;
            name: string;
            imageUrl?: string;
            quantity: number;
            unitPrice: number;
        }>;

        for (const item of normalizedItems) {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new HttpError(400, `Product ${item.productId} not found`);
            }

            if (product.stock < item.quantity) {
                throw new HttpError(400, `Insufficient stock for ${product.name}`);
            }

            const unitPrice = Number(product.price);
            totalAmount += unitPrice * item.quantity;
            snapshots.push({
                productId: String(product.id),
                name: product.name,
                imageUrl: product.imageUrl,
                quantity: item.quantity,
                unitPrice,
            });
        }

        const paymentMethod =
            typeof dto.paymentMethod === "string" && dto.paymentMethod.trim()
                ? dto.paymentMethod.trim()
                : "card";

        const shippingAddress = normalizeShippingAddress(dto.shippingAddress);

        const orderNumber = `ORD-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`;

        const session = await mongoose.startSession();

        let createdOrder: IOrder | null = null;

        await session.withTransaction(async () => {
            for (const item of normalizedItems) {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new HttpError(400, `Product ${item.productId} not found`);
                }

                product.stock -= item.quantity;
                await product.save({ session });
            }

            createdOrder = await Order.create(
                [
                    {
                        userId,
                        orderNumber,
                        items: snapshots,
                        totalAmount,
                        status: "pending",
                        paymentMethod,
                        paymentStatus: "paid",
                        shippingAddress,
                    },
                ],
                { session }
            ).then((records) => records[0]);
        });

        await session.endSession();

        if (!createdOrder) {
            throw new HttpError(500, "Unable to create order");
        }

        return serializeOrder(createdOrder);
    }

    async findMyOrders(
        userId: string,
        page = DEFAULT_PAGE,
        limit = DEFAULT_LIMIT,
        status?: OrderStatus
    ): Promise<OrderListResult> {
        const safePage = Math.max(page, 1);
        const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        const filter: Record<string, unknown> = { userId };

        if (status) {
            filter.status = status;
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit)
                .lean(),
            Order.countDocuments(filter),
        ]);

        const normalizedOrders = orders.map((order) => ({
            ...order,
            id: getOrderId(order as Partial<IOrder> & { _id?: unknown }),
        })) as unknown as IOrder[];

        const totalPages = Math.max(Math.ceil(total / safeLimit), 1);

        return {
            orders: normalizedOrders,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages,
        };
    }

    async findById(id: string): Promise<IOrder | null> {
        if (!id || id === "undefined" || id === "null") {
            throw new HttpError(400, "Invalid order ID");
        }

        if (!mongoose.isValidObjectId(id)) {
            throw new HttpError(400, "Invalid order ID");
        }

        return Order.findById(id);
    }

    async findAllAdmin(
        page = DEFAULT_PAGE,
        limit = DEFAULT_LIMIT,
        status?: OrderStatus
    ): Promise<OrderListResult> {
        const safePage = Math.max(page, 1);
        const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        const filter: Record<string, unknown> = {};

        if (status) {
            filter.status = status;
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit)
                .lean(),
            Order.countDocuments(filter),
        ]);

        const normalizedOrders = orders.map((order) => ({
            ...order,
            id: getOrderId(order as Partial<IOrder> & { _id?: unknown }),
        })) as unknown as IOrder[];

        return {
            orders: normalizedOrders,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.max(Math.ceil(total / safeLimit), 1),
        };
    }

    async updateStatus(
        orderId: string,
        status: OrderStatus,
        paymentStatus?: PaymentStatus
    ): Promise<IOrder | null> {
        if (!orderId || orderId === "undefined" || orderId === "null") {
            throw new HttpError(400, "Invalid order ID");
        }

        if (!mongoose.isValidObjectId(orderId)) {
            throw new HttpError(400, "Invalid order ID");
        }

        const order = await Order.findById(orderId);
        if (!order) {
            throw new HttpError(404, "Order not found");
        }

        if (status) {
            order.status = status;
        }
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        await order.save();
        return order;
    }
}

export const ordersService = new OrdersService();
