import { Router } from "express";
import { adminMiddleware } from "../auth/admin.middleware";
import { AuthRequest, jwtMiddleware } from "../auth/jwt.middleware";
import { Order } from "../orders/orders.model";
import { Product } from "../products/models/product.model";
import { User } from "../users/models/user.model";
import { getAdminOverview } from "./admin.service";

const router = Router();

router.use(jwtMiddleware, adminMiddleware);

router.get("/overview", async (req: AuthRequest, res) => {
  try {
    const range = typeof req.query.range === "string" ? req.query.range : "30d";
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;

    const overview = await getAdminOverview(range, from, to);
    res.json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin overview";
    res.status(500).json({ message });
  }
});

router.get("/customers", async (_req, res) => {
  try {
    const shoppers = await User.find({ role: "shopper" }).sort({ createdAt: -1 }).lean();

    const customerSummaries = await Promise.all(
      shoppers.map(async (shopper) => {
        const userId = String(shopper._id);
        const orders = await Order.find({ userId }).lean();
        const totalSpend = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);

        return {
          id: userId,
          name: shopper.name,
          email: shopper.email,
          joinedAt: shopper.createdAt,
          orderCount: orders.length,
          totalSpend: Number(totalSpend.toFixed(2)),
          lastOrderAt: orders.length
            ? new Date(
                Math.max(...orders.map((order) => new Date(order.createdAt).getTime()))
              ).toISOString()
            : null,
        };
      })
    );

    res.json({
      customers: customerSummaries.sort((left, right) => right.totalSpend - left.totalSpend),
      total: customerSummaries.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load customers";
    res.status(500).json({ message });
  }
});

router.get("/inventory", async (req, res) => {
  try {
    const query = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter = query
      ? {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { category: { $regex: query, $options: "i" } },
          ],
        }
      : {};

    const products = await Product.find(filter).sort({ stock: 1, popularity: -1 }).lean();

    const inventory = products.map((product) => {
      const stock = Number(product.stock ?? 0);
      const status = stock <= 0 ? "out-of-stock" : stock <= 5 ? "low-stock" : "in-stock";

      return {
        id: String((product as { _id?: unknown; id?: string })._id ?? product.id),
        name: product.name,
        category: product.category ?? "Uncategorized",
        price: Number(product.price ?? 0),
        stock,
        status,
        popularity: Number(product.popularity ?? 0),
        imageUrl: product.imageUrl,
        createdAt: product.createdAt,
      };
    });

    res.json({
      products: inventory,
      total: inventory.length,
      lowStock: inventory.filter((product) => product.stock <= 5).length,
      outOfStock: inventory.filter((product) => product.stock <= 0).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load inventory";
    res.status(500).json({ message });
  }
});

export default router;
