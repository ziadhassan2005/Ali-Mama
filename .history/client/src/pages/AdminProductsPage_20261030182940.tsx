import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, fetchProducts } from "../api/products.api";
import { useAuth } from "../context/AuthContext";
import type { Product } from "../types/product.types";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import pageStyles from "./AdminPages.module.css";

const emptyFilters = {
  search: "",
  categories: [],
  maxPrice: 1000,
  inStockOnly: false,
  sort: "newest" as const,
  page: 1,
  view: "grid" as const,
};

export default function AdminProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetchProducts(emptyFilters, token);
      setProducts(response.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [token]);

  const handleDelete = async (productId: string) => {
    if (!token) return;

    await deleteProduct(productId, token);
    await loadProducts();
  };

  if (!token) {
    return (
      <AdminLayout title="Products">
        <div className={pageStyles.emptyState}>Sign in to manage products.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Products">
      <div className={pageStyles.toolbarWrap}>
        <Link to="/products/new" className={pageStyles.primaryAction}>
          Add product
        </Link>
      </div>

      {loading ? (
        <div className={pageStyles.emptyState}>Loading products…</div>
      ) : (
        <section className={pageStyles.tablePanel}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Popularity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className={pageStyles.productCell}>
                      <span className={pageStyles.productThumb}>{product.name.charAt(0)}</span>
                      <div>
                        <strong>{product.name}</strong>
                        <small>{product.description.slice(0, 40)}{product.description.length > 40 ? "…" : ""}</small>
                      </div>
                    </div>
                  </td>
                  <td>{product.category ?? "Uncategorized"}</td>
                  <td>${product.price.toFixed(2)}</td>
                  <td>{product.stock}</td>
                  <td>{product.popularity}</td>
                  <td>
                    <div className={pageStyles.inlineActions}>
                      <Link to={`/products/${product.id}/edit`} className={pageStyles.secondaryAction}>
                        Edit
                      </Link>
                      <button type="button" className={pageStyles.deleteAction} onClick={() => void handleDelete(product.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminLayout>
  );
}
