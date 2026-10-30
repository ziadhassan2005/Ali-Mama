import { useEffect, useState } from "react";
import { fetchAdminOrders, updateOrderStatus } from "../api/orders.api";
import { useAuth } from "../context/AuthContext";
import type { Order, OrderStatus } from "../types/order.types";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import pageStyles from "./AdminPages.module.css";

const statusOptions: Array<OrderStatus> = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetchAdminOrders(token, {
        limit: 50,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setOrders(response.orders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [token, statusFilter]);

  const handleStatusChange = async (orderId: string, value: OrderStatus) => {
    if (!token) return;

    await updateOrderStatus(token, orderId, { status: value });
    await loadOrders();
  };

  if (!token) {
    return (
      <AdminLayout title="Orders">
        <div className={pageStyles.emptyState}>Sign in to review orders.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders">
      <div className={pageStyles.searchRow}>
        <select
          className={pageStyles.selectInput}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
        >
          <option value="all">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={pageStyles.emptyState}>Loading orders…</div>
      ) : (
        <section className={pageStyles.tablePanel}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.orderNumber}</strong>
                  </td>
                  <td>{order.userId.slice(0, 8)}</td>
                  <td>${order.totalAmount.toFixed(2)}</td>
                  <td>
                    <select
                      className={pageStyles.selectInput}
                      value={order.status}
                      onChange={(event) => void handleStatusChange(order.id, event.target.value as OrderStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{order.paymentStatus}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminLayout>
  );
}
