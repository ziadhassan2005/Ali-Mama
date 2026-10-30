import { Document, Schema, model } from "mongoose";

export const ORDER_STATUS_VALUES = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
] as const;

export const PAYMENT_STATUS_VALUES = [
    "pending",
    "paid",
    "failed",
    "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export interface OrderItemSnapshot {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
}

export interface ShippingAddress {
    fullName?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
}

export interface IOrder extends Document {
    userId: string;
    orderNumber: string;
    items: OrderItemSnapshot[];
    totalAmount: number;
    status: OrderStatus;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    shippingAddress?: ShippingAddress;
    createdAt: Date;
    updatedAt: Date;
    id: string;
}

const orderItemSchema = new Schema<OrderItemSnapshot>(
    {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        imageUrl: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const shippingAddressSchema = new Schema<ShippingAddress>(
    {
        fullName: { type: String },
        addressLine1: { type: String },
        city: { type: String },
        postalCode: { type: String },
        country: { type: String },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        userId: { type: String, required: true, index: true },
        orderNumber: { type: String, required: true, unique: true },
        items: { type: [orderItemSchema], required: true },
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ORDER_STATUS_VALUES,
            default: "pending",
            required: true,
        },
        paymentMethod: { type: String, default: "card" },
        paymentStatus: {
            type: String,
            enum: PAYMENT_STATUS_VALUES,
            default: "paid",
            required: true,
        },
        shippingAddress: { type: shippingAddressSchema },
    },
    { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);
