import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAdminOverview } from "../api/admin.api";
import type { AdminOverviewResponse, AdminRangeKey } from "../types/admin.types";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import pageStyles from "./AdminPages.module.css";

const rangeOptions: Array<{ value: AdminRangeKey; label: string }> = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
];

const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
    return currency.format(value);
}

export default function AdminDashboardPage() {
    const { token } = useAuth();
    const [range, setRange] = useState<AdminRangeKey>("30d");
    const [data, setData] = useState<AdminOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetchAdminOverview(token, range)
            .then((overview) => {
                if (!cancelled) {
                    setData(overview);
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
    }, [range, token]);

    const metricCards = useMemo(() => {
        if (!data) {
            return [];
        }

        return [
            {
                label: "Revenue",
                value: formatCurrency(data.metrics.revenue),
                delta: `${data.deltas.revenue.direction === "up" ? "+" : data.deltas.revenue.direction === "down" ? "-" : ""}${data.deltas.revenue.value}%`,
                tone: data.deltas.revenue.direction,
            },
            {
                label: "Orders",
                value: data.metrics.orders.toLocaleString(),
                delta: `${data.deltas.orders.direction === "up" ? "+" : data.deltas.orders.direction === "down" ? "-" : ""}${data.deltas.orders.value}%`,
                tone: data.deltas.orders.direction,
            },
            {
                label: "Customers",
                value: data.metrics.customers.toLocaleString(),
                delta: `${data.deltas.customers.direction === "up" ? "+" : data.deltas.customers.direction === "down" ? "-" : ""}${data.deltas.customers.value}%`,
                tone: data.deltas.customers.direction,
            },
            {
                label: "Avg. order",
                value: formatCurrency(data.metrics.avgOrderValue),
                delta: `${data.metrics.pendingOrders} pending`,
                tone: "flat",
            },
            {
                label: "Low stock",
                value: data.metrics.lowStock.toString(),
                delta: `${data.metrics.products} total products`,
                tone: data.metrics.lowStock > 0 ? "down" : "flat",
            },
        ];
    }, [data]);

    if (!token) {
        return (
            <AdminLayout title="Overview">
                <div className={pageStyles.emptyState}>Sign in to access the dashboard.</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Overview">
            <div className={pageStyles.toolbarWrap}>
                <div className={pageStyles.chipGroup}>
                    {rangeOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`${pageStyles.chip} ${range === option.value ? pageStyles.chipActive : ""}`}
                            onClick={() => setRange(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading || !data ? (
                <div className={pageStyles.emptyState}>Loading dashboard…</div>
            ) : (
                <>
                    <div className={pageStyles.kpiGrid}>
                        {metricCards.map((card) => (
                            <article className={pageStyles.metricCard} key={card.label}>
                                <div className={pageStyles.metricMeta}>
                                    <span>{card.label}</span>
                                    <b className={pageStyles[`tone${card.tone}`]}>{card.delta}</b>
                                </div>
                                <strong>{card.value}</strong>
                            </article>
                        ))}
                    </div>

                    <div className={pageStyles.cardGrid}>
                        <section className={pageStyles.panel}>
                            <div className={pageStyles.panelHeader}>
                                <h2>Revenue trend</h2>
                                <span>{data.range.start.slice(0, 10)} → {data.range.end.slice(0, 10)}</span>
                            </div>
                            <div className={pageStyles.barChart}>
                                {(() => {
                                    const max = Math.max(...data.revenueTrend.map((item) => item.revenue), 1);
                                    return data.revenueTrend.map((item) => (
                                        <div key={`${item.label}-${item.revenue}`} className={pageStyles.barColumn}>
                                            <div
                                                className={pageStyles.barFill}
                                                style={{ height: `${Math.max((item.revenue / max) * 100, 8)}%` }}
                                                title={`${item.label}: ${formatCurrency(item.revenue)}`}
                                            />
                                            <span>{item.label}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </section>

                        <section className={pageStyles.panel}>
                            <div className={pageStyles.panelHeader}>
                                <h2>Order status</h2>
                            </div>
                            <div className={pageStyles.stackList}>
                                {data.statusBreakdown.map((item) => (
                                    <div key={item.status} className={pageStyles.listRow}>
                                        <div className={pageStyles.labelWrap}>
                                            <span className={pageStyles.statusDot} data-status={item.status} />
                                            <span className={pageStyles.capitalize}>{item.status}</span>
                                        </div>
                                        <div className={pageStyles.progressTrack}>
                                            <div className={pageStyles.progressFill} style={{ width: `${item.share}%` }} />
                                        </div>
                                        <strong>{item.count}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className={pageStyles.cardGridThree}>
                        <section className={pageStyles.panel}>
                            <div className={pageStyles.panelHeader}>
                                <h2>Category mix</h2>
                            </div>
                            <div className={pageStyles.stackList}>
                                {data.categoryBreakdown.map((item) => (
                                    <div key={item.name} className={pageStyles.listRow}>
                                        <span>{item.name}</span>
                                        <div className={pageStyles.progressTrack}>
                                            <div className={pageStyles.progressFill} style={{ width: `${item.share}%` }} />
                                        </div>
                                        <strong>{item.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={pageStyles.panel}>
                            <div className={pageStyles.panelHeader}>
                                <h2>Top products</h2>
                            </div>
                            <div className={pageStyles.stackList}>
                                {data.topProducts.map((product) => (
                                    <div key={product.name} className={pageStyles.listRowSplit}>
                                        <div>
                                            <strong>{product.name}</strong>
                                            <span>{product.units} units</span>
                                        </div>
                                        <strong>{formatCurrency(product.revenue)}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={pageStyles.panel}>
                            <div className={pageStyles.panelHeader}>
                                <h2>Recent orders</h2>
                            </div>
                            <div className={pageStyles.stackList}>
                                {data.recentOrders.map((order) => (
                                    <div key={order.id} className={pageStyles.listRowSplit}>
                                        <div>
                                            <strong>{order.orderNumber}</strong>
                                            <span>{order.customerName}</span>
                                        </div>
                                        <div className={pageStyles.textAlignRight}>
                                            <strong>{formatCurrency(order.totalAmount)}</strong>
                                            <span>{order.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
