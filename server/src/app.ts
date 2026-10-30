import cors, { type CorsOptions } from "cors";
import express, { Application } from "express";
import adminRoutes from "./admin/admin.routes";
import authRoutes from "./auth/auth.routes";
import cartRoutes from "./cart/cart.routes";
import ordersRoutes from "./orders/orders.routes";
import productsRoutes from "./products/products.routes";
import usersRoutes from "./users/users.routes";

function getCorsOptions(): CorsOptions {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins?.length) {
    return { origin: allowedOrigins };
  }

  // Allow all origins — required for S3-hosted frontend → EC2 API (no credentials/cookies).
  return {};
}

export function createApp(): Application {
  const app = express();

  app.use(cors(getCorsOptions()));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/users", usersRoutes);

  return app;
}
