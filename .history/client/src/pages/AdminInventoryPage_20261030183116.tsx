import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAdminInventory } from "../api/admin.api";
import { updateProduct } from "../api/products.api";
import type { AdminInventoryItem } from "../types/admin.types";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import pageStyles from "./AdminPages.module.css";

export default function AdminInventoryPage() {
    const { token } = useAuth();
    const [products, setProducts] = useState<AdminInventoryItem[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetchAdminInventory(token, search)
            .then((response) => {
                if (!cancelled) {
                    setProducts(response.products);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token, search]);

    const restockProduct = async (product: AdminInventoryItem, quantity = 10) => {
        if (!token) return;
        await updateProduct(product.id, { stock: Math.max(product.stock + quantity, 0) }, token);
        setSearch((current) => current);
        const response = await fetchAdminInventory(token, search);
        setProducts(response.products);
    };

    if (!token) {
        return (
            <AdminLayout title="Inventory">
                <div className={pageStyles.emptyState}>Sign in to manage inventory.</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Inventory">
            <div className={pageStyles.searchRow}>
                <input
                    type="search"
                    className={pageStyles.searchInput}
                    placeholder="Search inventory"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            {loading ? (
                <div className={pageStyles.emptyState}>Loading inventory…</div>
            ) : (
                <section className={pageStyles.tablePanel}>
                    <table className={pageStyles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Action</th>
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
                                                <small>{product.popularity} popularity</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{product.category}</td>
                                    <td>${product.price.toFixed(2)}</td>
                                    <td>{product.stock}</td>
                                    <td>
                                        <span className={pageStyles.statusBadge} data-status={product.status}>
                                            {product.status.replace("-", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        <button type="button" className={pageStyles.secondaryAction} onClick={() => void restockProduct(product)}>
                                            Restock 10
                                        </button>
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
