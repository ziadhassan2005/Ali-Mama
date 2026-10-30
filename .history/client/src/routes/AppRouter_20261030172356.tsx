import { Route, Routes } from "react-router-dom";
import Layout from "../components/Layout/Layout";
import AccountOrderDetailPage from "../pages/AccountOrderDetailPage";
import AccountOrdersPage from "../pages/AccountOrdersPage";
import CheckoutPage from "../pages/CheckoutPage";
import CreateProductPage from "../pages/CreateProductPage";
import EditProductPage from "../pages/EditProductPage";
import LoginPage from "../pages/LoginPage";
import ProductDetailPage from "../pages/ProductDetailPage";
import ProductsPage from "../pages/ProductsPage";
import RegisterPage from "../pages/RegisterPage";
import { AdminRoute } from "./AdminRoute";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<ProductsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="products/new" element={<CreateProductPage />} />
            <Route
              path="products/:productId/edit"
              element={<EditProductPage />}
            />
          </Route>
          <Route path="products/:productId" element={<ProductDetailPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account/orders" element={<AccountOrdersPage />} />
          <Route path="account/orders/:orderId" element={<AccountOrderDetailPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
