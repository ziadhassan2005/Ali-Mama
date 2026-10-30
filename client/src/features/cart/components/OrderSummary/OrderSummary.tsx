import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Divider, Icon, Spinner, Text } from "../../../../design-system";
import { useAuth } from "../../../../context/AuthContext";
import { useCart } from "../../../../context/CartContext";
import { useToast } from "../../../../context/ToastContext";
import { formatPrice } from "../../../products/utils/formatPrice";
import { cx } from "../../../../design-system/utils/cx";
import { createOrderRequest } from "../../../../api/orders.api";
import styles from "./OrderSummary.module.css";

type CheckoutState = "idle" | "loading" | "success";

export function OrderSummary() {
  const { items, subtotal, clearCart } = useCart();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");

  const isProcessing = checkoutState !== "idle";

  async function handleCheckout() {
    if (isProcessing) return;

    if (!user || !token) {
      showToast("Please sign in to complete checkout.", "error");
      navigate("/login", { replace: false, state: { from: { pathname: "/checkout" } } });
      return;
    }

    if (items.length === 0) {
      showToast("Your cart is empty.", "error");
      return;
    }

    setCheckoutState("loading");

    try {
      await createOrderRequest(
        {
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
        token
      );

      setCheckoutState("success");
      clearCart();
      showToast("Order placed successfully.", "success");
      navigate("/account/orders", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to complete checkout.";
      showToast(message, "error");
      setCheckoutState("idle");
    }
  }

  return (
    <aside className={styles.summary}>
      <Text variant="headline-md" as="h2">
        Order summary
      </Text>

      <div className={styles.lines}>
        <div className={styles.line}>
          <Text variant="body-md" color="secondary">
            Subtotal
          </Text>
          <Text variant="body-md" color="secondary">
            {formatPrice(subtotal)}
          </Text>
        </div>
        <div className={styles.line}>
          <Text variant="body-md" color="secondary">
            Shipping
          </Text>
          <Text variant="body-md" color="secondary">
            Free
          </Text>
        </div>
        <div className={styles.line}>
          <Text variant="body-md" color="secondary">
            Estimated Tax
          </Text>
          <Text variant="body-md" color="secondary">
            {formatPrice(0)}
          </Text>
        </div>
      </div>

      <Divider />

      <div className={styles.line}>
        <Text variant="headline-sm">Total</Text>
        <Text variant="headline-sm">{formatPrice(subtotal)}</Text>
      </div>

      <div className={styles.checkout}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          className={cx(
            styles.checkoutButton,
            checkoutState === "success" && styles.success
          )}
          disabled={isProcessing && checkoutState === "loading"}
          onClick={handleCheckout}
        >
          {checkoutState === "loading" ? (
            <Spinner />
          ) : checkoutState === "success" ? (
            <Icon name="check_circle" size="sm" />
          ) : null}
          {checkoutState === "success"
            ? "Purchase complete"
            : "Proceed to checkout"}
        </Button>

        <div className={styles.secure}>
          <Icon name="lock" size="sm" />
          <Text variant="micro" color="secondary">
            Secure checkout powered by Ali-Mama
          </Text>
        </div>
      </div>

      <div className={styles.paymentIcons} aria-hidden="true">
        <Icon name="credit_card" />
        <Icon name="account_balance" />
        <Icon name="payments" />
      </div>
    </aside>
  );
}
