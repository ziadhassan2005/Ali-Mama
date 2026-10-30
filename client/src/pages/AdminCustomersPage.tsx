import { useEffect, useState } from "react";
import { fetchAdminCustomers } from "../api/admin.api";
import { useAuth } from "../context/AuthContext";
import type { AdminCustomer } from "../types/admin.types";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import pageStyles from "./AdminPages.module.css";

export default function AdminCustomersPage() {
    const { token } = useAuth();
    const [customers, setCustomers] = useState<AdminCustomer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        fetchAdminCustomers(token)
            .then((data) => {
                if (!cancelled) {
                    setCustomers(data);
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
    }, [token]);

    if (!token) {
        return (
            <AdminLayout title="Customers">
                <div className={pageStyles.emptyState}>Sign in to view customers.</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Customers">
            {loading ? (
                <div className={pageStyles.emptyState}>Loading customers…</div>
            ) : (
                <section className={pageStyles.tablePanel}>
                    <table className={pageStyles.table}>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Email</th>
                                <th>Orders</th>
                                <th>Spend</th>
                                <th>Joined</th>
                                <th>Last order</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>
                                        <strong>{customer.name}</strong>
                                    </td>
                                    <td>{customer.email}</td>
                                    <td>{customer.orderCount}</td>
                                    <td>${customer.totalSpend.toFixed(2)}</td>
                                    <td>{new Date(customer.joinedAt).toLocaleDateString()}</td>
                                    <td>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </AdminLayout>
    );
}
