import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
  stock: number;
  popularity: number;
  brand?: string;
  sku?: string;
  originalPrice?: number;
  productType?: string;
  color?: string;
  rating?: number;
  reviewCount?: number;
  active?: boolean;
  importBatchId?: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    category: { type: String },
    stock: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },
    brand: { type: String },
    sku: { type: String, unique: false, sparse: true },
    originalPrice: { type: Number },
    productType: { type: String },
    color: { type: String },
    rating: { type: Number },
    reviewCount: { type: Number },
    active: { type: Boolean, default: true },
    importBatchId: { type: String },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, price: 1, stock: 1, popularity: -1 });
productSchema.index({ sku: 1 }, { unique: false, sparse: true });

export const Product = model<IProduct>("Product", productSchema);
