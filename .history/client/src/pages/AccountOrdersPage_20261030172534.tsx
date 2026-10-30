import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, Spinner, Text } from "../design-system";
import { useAuth } from "../context/AuthContext";
import { fetchMyOrders } from "../api/orders.api";
import type { Order } from "../types/order.types";
import styles from "./AccountOrdersPage.module.css";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "delivered":
      return "success";
    case "cancelled":
      return "danger";
    case "processing":
    case "shipped":
      return "neutral";
    default:
      return "neutral";
  }
}

export default function AccountOrdersPage() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/login", { replace: true, state: { from: { pathname: "/account/orders" } } });
      return;
    }

    const authToken = token as string;
    let cancelled = false;

    async function loadOrders() {
      try {
        const response = await fetchMyOrders(authToken);
        if (!cancelled) {
          setOrders(response.orders);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load your orders.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, token]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Text variant="headline-xl" as="h1">
          My Orders
        </Text>
      </header>

      {isLoading ? (
        <div className={styles.state}>
          <Spinner />
        </div>
      ) : error ? (
        <Card variant="bordered" className={styles.card}>
          <Text variant="body-md" color="danger">
            {error}
          </Text>
        </Card>
      ) : orders.length === 0 ? (
        <Card variant="bordered" className={styles.emptyState}>
          <Text variant="headline-md" as="h2">
            No orders yet
          </Text>
          <Text variant="body-md" color="secondary">
            Your completed purchases will appear here.
          </Text>
          <Button variant="primary" size="md" onClick={() => navigate("/")}>
            Continue shopping
          </Button>
        </Card>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <Card key={order.id} variant="bordered" className={styles.orderCard}>
              <div className={styles.row}>
                <div>
                  <Text variant="label-md" color="secondary">
                    Order #{order.orderNumber}
                  </Text>
                  <Text variant="headline-sm" as="h2">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>

              <div className={styles.metaRow}>
                <Text variant="body-md" color="secondary">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                </Text>
                <Text variant="headline-sm">
                  {formatCurrency(order.totalAmount)}
                </Text>
              </div>

              <div className={styles.footerRow}>
                <Text variant="label-md" color="secondary">
                  Payment: {order.paymentStatus}
                </Text>
                <Link to={`/account/orders/${order.id}`} className={styles.link}>
                  View Details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
