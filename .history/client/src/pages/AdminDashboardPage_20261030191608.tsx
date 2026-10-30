import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
    executeAdminImport,
    fetchAdminImportSources,
    fetchAdminOverview,
    previewAdminImport,
} from "../api/admin.api";
import type {
    AdminImportExecutionResponse,
    AdminImportPreviewResponse,
    AdminOverviewResponse,
    AdminRangeKey,
} from "../types/admin.types";
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

function parseCsvRecords(text: string): Record<string, unknown>[] {
    const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0]
        .split(",")
        .map((header) => header.trim().replace(/^"|"$/g, ""));

    return rows.slice(1).map((row) => {
        const values = row.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
        const record: Record<string, unknown> = {};

        headers.forEach((header, index) => {
            record[header] = values[index] ?? "";
        });

        return record;
    });
}

function CatalogImportPanel({ token }: { token: string }) {
    const [sources, setSources] = useState<string[]>(["escuela"]);
    const [source, setSource] = useState("escuela");
    const [limit, setLimit] = useState("25");
    const [fileName, setFileName] = useState("");
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [preview, setPreview] = useState<AdminImportPreviewResponse | null>(null);
    const [summary, setSummary] = useState<AdminImportExecutionResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchAdminImportSources(token)
            .then((response) => {
                if (response.sources.length > 0) {
                    setSources(response.sources);
                    setSource(response.sources[0]);
                }
            })
            .catch(() => undefined);
    }, [token]);

    async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const text = await file.text();

        try {
            if (file.name.toLowerCase().endsWith(".json")) {
                const parsed = JSON.parse(text) as unknown;
                const values = Array.isArray(parsed)
                    ? parsed
                    : Array.isArray((parsed as { products?: unknown[] })?.products)
                        ? (parsed as { products: unknown[] }).products
                        : [];
                setItems(values as Record<string, unknown>[]);
                return;
            }

            setItems(parseCsvRecords(text));
        } catch {
            setItems([]);
        }
    }

    async function handlePreview() {
        setIsLoading(true);
        try {
            const response = await previewAdminImport(token, {
                source,
                limit: Number(limit) || 25,
                items: items.length > 0 ? items : undefined,
            });
            setPreview(response);
            setSummary(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleImport() {
        setIsLoading(true);
        try {
            const response = await executeAdminImport(token, {
                source,
                limit: Number(limit) || 25,
                items: items.length > 0 ? items : undefined,
                dryRun: false,
            });
            setSummary(response);
            setPreview({
                source: response.source,
                total: response.preview.length,
                valid: response.valid,
                invalid: response.invalid,
                preview: response.preview,
                maxAllowed: Number(limit) || 25,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section className={pageStyles.panel} style={{ marginTop: "1.25rem" }}>
            <div className={pageStyles.panelHeader}>
                <h2>Catalog Import</h2>
                <span>{fileName || "EscuelaJS import ready"}</span>
            </div>

            <div className={pageStyles.searchRow}>
                <select
                    className={pageStyles.selectInput}
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                >
                    {sources.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    min="1"
                    max="5000"
                    step="1"
                    className={pageStyles.searchInput}
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                    aria-label="Import quantity"
                />
            </div>

            <div className={pageStyles.searchRow} style={{ gridTemplateColumns: "1fr auto auto" }}>
                <input
                    type="file"
                    accept=".json,.csv"
                    onChange={(event) => void handleFiles(event)}
                    className={pageStyles.searchInput}
                />
                <button type="button" className={pageStyles.secondaryAction} onClick={() => void handlePreview()} disabled={isLoading}>
                    Preview
                </button>
                <button type="button" className={pageStyles.primaryAction} onClick={() => void handleImport()} disabled={isLoading}>
                    Import
                </button>
            </div>

            {preview ? (
                <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                    <div className={pageStyles.kpiGrid}>
                        <article className={pageStyles.metricCard}>
                            <div className={pageStyles.metricMeta}><span>Valid</span></div>
                            <strong>{preview.valid}</strong>
                        </article>
                        <article className={pageStyles.metricCard}>
                            <div className={pageStyles.metricMeta}><span>Invalid</span></div>
                            <strong>{preview.invalid}</strong>
                        </article>
                        <article className={pageStyles.metricCard}>
                            <div className={pageStyles.metricMeta}><span>Records</span></div>
                            <strong>{preview.total}</strong>
                        </article>
                    </div>

                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        {preview.preview.slice(0, 5).map((product) => (
                            <div key={`${product.sku}-${product.name}`} className={pageStyles.listRowSplit}>
                                <div>
                                    <strong>{product.name}</strong>
                                    <span>{product.category}</span>
                                </div>
                                <strong>${product.price.toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {summary ? (
                <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                    <div className={pageStyles.kpiGrid}>
                        <article className={pageStyles.metricCard}>
                            <div className={pageStyles.metricMeta}><span>Inserted</span></div>
                            <strong>{summary.inserted}</strong>
                        </article>
                        <article className={pageStyles.metricCard}>
                            <div className={pageStyles.metricMeta}><span>Skipped</span></div>
                            <strong>{summary.skipped}</strong>
                        </article>
                        <article className={pageStyles.metricCard}>
                            <div className={pageStyles.metricMeta}><span>Failed</span></div>
                            <strong>{summary.failed}</strong>
                        </article>
                    </div>
                    <span className={pageStyles.emptyState} style={{ padding: "0.75rem" }}>
                        Batch {summary.batchId}: {summary.totalAfter} total products in database.
                    </span>
                </div>
            ) : null}
        </section>
    );
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
                    <CatalogImportPanel token={token} />

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
