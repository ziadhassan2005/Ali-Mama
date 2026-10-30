import { Router } from "express";
import { HttpError } from "../common/errors/http-error";
import { adminMiddleware } from "../auth/admin.middleware";
import { AuthRequest, jwtMiddleware } from "../auth/jwt.middleware";
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES } from "./orders.model";
import { ordersService } from "./orders.service";

const router = Router();

function parseNumericQuery(value: unknown): number | undefined {
    if (typeof value !== "string") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

router.use(jwtMiddleware);

router.get("/my-orders", async (req: AuthRequest, res) => {
    try {
        const page = parseNumericQuery(req.query.page) ?? 1;
        const limit = parseNumericQuery(req.query.limit) ?? 10;
        const status =
            typeof req.query.status === "string" && ORDER_STATUS_VALUES.includes(req.query.status as never)
                ? (req.query.status as (typeof ORDER_STATUS_VALUES)[number])
                : undefined;

        const result = await ordersService.findMyOrders(
            String(req.userId),
            page,
            limit,
            status
        );

        res.json({
            orders: result.orders.map((order) => ({
                id: order.id,
                userId: order.userId,
                orderNumber: order.orderNumber,
                items: order.items,
                totalAmount: order.totalAmount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            })),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to fetch order history";
        res.status(500).json({ message });
    }
});

router.get("/", adminMiddleware, async (req, res) => {
    try {
        const page = parseNumericQuery(req.query.page) ?? 1;
        const limit = parseNumericQuery(req.query.limit) ?? 10;
        const status =
            typeof req.query.status === "string" && ORDER_STATUS_VALUES.includes(req.query.status as never)
                ? (req.query.status as (typeof ORDER_STATUS_VALUES)[number])
                : undefined;

        const result = await ordersService.findAllAdmin(page, limit, status);
        res.json({
            orders: result.orders.map((order) => ({
                id: order.id,
                userId: order.userId,
                orderNumber: order.orderNumber,
                items: order.items,
                totalAmount: order.totalAmount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            })),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch orders";
        res.status(500).json({ message });
    }
});

router.post("/", async (req: AuthRequest, res) => {
    try {
        const order = await ordersService.create(String(req.userId), req.body);
        res.status(201).json(order);
    } catch (err) {
        if (err instanceof HttpError) {
            res.status(err.statusCode).json({ message: err.message });
            return;
        }

        const message = err instanceof Error ? err.message : "Failed to create order";
        res.status(500).json({ message });
    }
});

router.get("/:id", async (req: AuthRequest, res) => {
    try {
        const order = await ordersService.findById(String(req.params.id));
        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        if (order.userId !== String(req.userId) && req.userRole !== "admin") {
            res.status(403).json({ message: "You do not have access to this order" });
            return;
        }

        res.json({
            id: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            items: order.items,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to fetch order";
        res.status(500).json({ message });
    }
});

router.patch("/:id/status", adminMiddleware, async (req, res) => {
    try {
        const status =
            typeof req.body?.status === "string" &&
                ORDER_STATUS_VALUES.includes(req.body.status as never)
                ? (req.body.status as (typeof ORDER_STATUS_VALUES)[number])
                : undefined;

        const paymentStatus =
            typeof req.body?.paymentStatus === "string" &&
                PAYMENT_STATUS_VALUES.includes(req.body.paymentStatus as never)
                ? (req.body.paymentStatus as (typeof PAYMENT_STATUS_VALUES)[number])
                : undefined;

        if (!status && !paymentStatus) {
            res.status(400).json({ message: "No order update fields provided" });
            return;
        }

        const order = await ordersService.updateStatus(
            String(req.params.id),
            status ?? "pending",
            paymentStatus
        );

        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        res.json({
            id: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            items: order.items,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        });
    } catch (err) {
        if (err instanceof HttpError) {
            res.status(err.statusCode).json({ message: err.message });
            return;
        }

        const message =
            err instanceof Error ? err.message : "Failed to update order status";
        res.status(500).json({ message });
    }
});

export default router;
