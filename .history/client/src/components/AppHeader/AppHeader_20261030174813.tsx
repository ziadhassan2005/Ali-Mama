import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  BrandLogo,
  Button,
  Divider,
  Icon,
  Link,
  SearchInput,
  cx,
} from "../../design-system";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useProductFiltersContext } from "../../features/products/context/ProductFiltersContext";
import { isAdmin } from "../../features/products/utils/isAdmin";
import { HeaderCartButton } from "./HeaderCartButton";
import { HeaderNavLink } from "./HeaderNavLink";
import styles from "./AppHeader.module.css";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleNavigate(path: string) {
    setIsOpen(false);
    navigate(path);
  }

  function handleLogout() {
    setIsOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  if (!user) {
    return null;
  }

  const displayName = user.name?.trim() || user.email.split("@")[0];

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.userButton}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="shopflow-user-menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Avatar initials={getInitials(user.name)} className={styles.userAvatar} />
        <span className={styles.userName}>{displayName}</span>
        <Icon
          name={isOpen ? "expand_less" : "expand_more"}
          size="sm"
          className={cx(styles.userChevron, isOpen && styles.userChevronOpen)}
        />
      </button>

      {isOpen ? (
        <div
          id="shopflow-user-menu"
          className={styles.menu}
          role="menu"
          aria-label="User account menu"
        >
          <div className={styles.menuHeader}>
            <Avatar initials={getInitials(user.name)} className={styles.menuAvatar} />
            <div className={styles.menuUserMeta}>
              <span className={styles.menuUserName}>{user.name}</span>
              <span className={styles.menuUserEmail}>{user.email}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => handleNavigate("/account/orders")}
          >
            <Icon name="person" size="sm" className={styles.menuItemIcon} />
            <span>My Account</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => handleNavigate("/account/orders")}
          >
            <Icon name="receipt_long" size="sm" className={styles.menuItemIcon} />
            <span>My Orders</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            aria-label={`Shopping cart with ${itemCount} items`}
            onClick={() => handleNavigate("/checkout")}
          >
            <Icon name="shopping_cart" size="sm" className={styles.menuItemIcon} />
            <span>Shopping Cart</span>
            {itemCount > 0 ? <span className={styles.menuItemBadge}>{itemCount}</span> : null}
          </button>

          <Divider className={styles.menuDivider} />

          <button
            type="button"
            className={cx(styles.menuItem, styles.logoutMenuItem)}
            role="menuitem"
            onClick={handleLogout}
          >
            <Icon name="logout" size="sm" className={styles.menuItemIcon} />
            <span>Logout</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { filters, setSearch } = useProductFiltersContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isProductsActive =
    location.pathname === "/" || location.pathname.startsWith("/products/");
  const isCheckoutActive = location.pathname === "/checkout";
  const isOrdersActive = location.pathname.startsWith("/account/orders");

  return (
    <header className={styles.header}>
      <Link to="/" variant="default" className={styles.brandLink}>
        <BrandLogo size="compact" />
      </Link>

      <nav className={styles.nav} aria-label="Main navigation">
        <HeaderNavLink to="/" active={isProductsActive}>
          Products
        </HeaderNavLink>
        <HeaderNavLink to="/checkout" active={isCheckoutActive}>
          Checkout
        </HeaderNavLink>
        {user ? (
          <HeaderNavLink to="/account/orders" active={isOrdersActive}>
            My Orders
          </HeaderNavLink>
        ) : null}
      </nav>

      <div className={styles.center}>
        <div className={styles.searchSlot}>
          <SearchInput
            variant="navbar"
            placeholder="Search products..."
            value={filters.search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products"
          />
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.searchDesktop}>
          <SearchInput
            variant="navbar"
            placeholder="Search products..."
            value={filters.search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products"
          />
        </div>

        <HeaderCartButton itemCount={itemCount} />

        {user ? (
          <>
            {isAdmin(user) ? (
              <Badge variant="success" className={styles.adminBadge}>
                Admin
              </Badge>
            ) : null}
            <UserMenu />
          </>
        ) : (
          <div className={styles.authActions}>
            <Button variant="secondary" size="sm" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate("/register")}>
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
