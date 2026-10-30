import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Card, Spinner, Text } from "../design-system";
import { useAuth } from "../context/AuthContext";
import { fetchOrderById } from "../api/orders.api";
import type { Order } from "../types/order.types";
import styles from "./AccountOrderDetailPage.module.css";

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

export default function AccountOrderDetailPage() {
  const { token } = useAuth();
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !orderId) {
      setIsLoading(false);
      return;
    }

    const authToken = token as string;
    const orderIdentifier = orderId as string;
    let cancelled = false;

    async function loadOrder() {
      try {
        const response = await fetchOrderById(authToken, orderIdentifier);
        if (!cancelled) {
          setOrder(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load this order.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  if (isLoading) {
    return (
      <div className={styles.state}>
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <Card variant="bordered" className={styles.card}>
          <Text variant="body-md" color="danger">
            {error || "Order not found."}
          </Text>
        </Card>
      </div>
    );
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <Text variant="headline-xl" as="h1">
          Order #{order.orderNumber}
        </Text>
        <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
      </div>

      <Card variant="bordered" className={styles.summaryCard}>
        <div className={styles.summaryGrid}>
          <div>
            <Text variant="label-md" color="secondary">
              Order date
            </Text>
            <Text variant="body-md">{new Date(order.createdAt).toLocaleString()}</Text>
          </div>
          <div>
            <Text variant="label-md" color="secondary">
              Payment status
            </Text>
            <Text variant="body-md">{order.paymentStatus}</Text>
          </div>
          <div>
            <Text variant="label-md" color="secondary">
              Payment method
            </Text>
            <Text variant="body-md">{order.paymentMethod}</Text>
          </div>
          <div>
            <Text variant="label-md" color="secondary">
              Total
            </Text>
            <Text variant="headline-sm">{formatCurrency(order.totalAmount)}</Text>
          </div>
        </div>
      </Card>

      <div className={styles.section}>
        <Text variant="headline-md" as="h2">
          Purchased items
        </Text>
        <div className={styles.itemList}>
          {order.items.map((item) => (
            <div key={`${order.id}-${item.productId}`} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className={styles.image} />
                ) : null}
                <div>
                  <Text variant="body-md">{item.name}</Text>
                  <Text variant="label-md" color="secondary">
                    Qty: {item.quantity}
                  </Text>
                </div>
              </div>

              <div className={styles.itemTotals}>
                <Text variant="body-md" color="secondary">
                  {formatCurrency(item.unitPrice)} each
                </Text>
                <Text variant="body-md">{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <Text variant="headline-md" as="h2">
          Order summary
        </Text>
        <Card variant="bordered" className={styles.summaryCard}>
          <div className={styles.totalRow}>
            <Text variant="body-md" color="secondary">
              Subtotal
            </Text>
            <Text variant="body-md">{formatCurrency(subtotal)}</Text>
          </div>
          <div className={styles.totalRow}>
            <Text variant="body-md" color="secondary">
              Shipping
            </Text>
            <Text variant="body-md">Free</Text>
          </div>
          <div className={styles.totalRow}>
            <Text variant="headline-sm">Total</Text>
            <Text variant="headline-sm">{formatCurrency(order.totalAmount)}</Text>
          </div>
        </Card>
      </div>

      {order.shippingAddress ? (
        <div className={styles.section}>
          <Text variant="headline-md" as="h2">
            Shipping address
          </Text>
          <Card variant="bordered" className={styles.summaryCard}>
            <Text variant="body-md">{order.shippingAddress.fullName}</Text>
            <Text variant="body-md">{order.shippingAddress.addressLine1}</Text>
            <Text variant="body-md">
              {order.shippingAddress.city}, {order.shippingAddress.postalCode}
            </Text>
            <Text variant="body-md">{order.shippingAddress.country}</Text>
          </Card>
        </div>
      ) : null}

      <Link to="/account/orders" className={styles.backLink}>
        ← Back to My Orders
      </Link>
    </div>
  );
}
