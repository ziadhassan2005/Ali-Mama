import { Order } from "../orders/orders.model";
import { Product } from "../products/models/product.model";
import { User } from "../users/models/user.model";

export type AdminRangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export interface RangeBounds {
    start: Date;
    end: Date;
    key: AdminRangeKey;
}

export interface OverviewMetricDelta {
    value: number;
    direction: "up" | "down" | "flat";
}

export interface AdminOverviewResponse {
    range: {
        key: AdminRangeKey;
        start: string;
        end: string;
    };
    metrics: {
        revenue: number;
        orders: number;
        customers: number;
        products: number;
        lowStock: number;
        avgOrderValue: number;
        pendingOrders: number;
    };
    deltas: {
        revenue: OverviewMetricDelta;
        orders: OverviewMetricDelta;
        customers: OverviewMetricDelta;
    };
    revenueTrend: Array<{ label: string; revenue: number; orders: number }>;
    categoryBreakdown: Array<{ name: string; value: number; share: number }>;
    statusBreakdown: Array<{ status: string; count: number; share: number }>;
    topProducts: Array<{ name: string; units: number; revenue: number }>;
    recentOrders: Array<{
        id: string;
        orderNumber: string;
        customerName: string;
        totalAmount: number;
        status: string;
        createdAt: string;
    }>;
}

export const SUPPORTED_IMPORT_SOURCES = ["escuela", "dummyjson", "json", "csv"] as const;
export type SupportedImportSource = (typeof SUPPORTED_IMPORT_SOURCES)[number];

export interface CatalogImportItem {
    name: string;
    description: string;
    brand: string;
    category: string;
    imageUrl?: string;
    imageUrls?: string[];
    source?: string;
    sourceProductId?: string;
    sourceImageUrl?: string;
    needsImageCorrection?: boolean;
    sku: string;
    price: number;
    originalPrice?: number;
    stock: number;
    productType?: string;
    color?: string;
    rating: number;
    reviewCount: number;
    active: boolean;
    createdAt: string;
}

export interface CatalogImportPreviewResponse {
    source: SupportedImportSource | string;
    total: number;
    valid: number;
    invalid: number;
    preview: CatalogImportItem[];
    maxAllowed: number;
}

export interface CatalogImportExecutionResponse {
    batchId: string;
    source: SupportedImportSource | string;
    dryRun: boolean;
    totalRequested: number;
    valid: number;
    invalid: number;
    duplicateSkus: number;
    inserted: number;
    skipped: number;
    failed: number;
    totalBefore: number;
    totalAfter: number;
    preview: CatalogImportItem[];
}

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const MAX_IMPORT_COUNT = 5000;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80";

function roundNumber(value: number): number {
    return Number(value.toFixed(2));
}

function toPercentDelta(current: number, previous: number): number {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }

    return roundNumber(((current - previous) / previous) * 100);
}

function getDelta(current: number, previous: number): OverviewMetricDelta {
    const value = toPercentDelta(current, previous);

    if (value > 0) {
        return { value, direction: "up" };
    }

    if (value < 0) {
        return { value: Math.abs(value), direction: "down" };
    }

    return { value: 0, direction: "flat" };
}

function formatLabel(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function resolveRange(rangeKey: string | undefined, from?: string, to?: string): RangeBounds {
    const key = (rangeKey === "today" || rangeKey === "7d" || rangeKey === "30d" || rangeKey === "90d" || rangeKey === "custom")
        ? rangeKey
        : "30d";

    const end = to ? new Date(to) : new Date();
    const now = new Date(end);

    if (key === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { key, start, end: now };
    }

    if (key === "custom") {
        const parsedFrom = from ? new Date(from) : null;
        const parsedTo = to ? new Date(to) : null;

        if (parsedFrom && parsedTo && !Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
            return { key, start: parsedFrom, end: parsedTo };
        }

        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        return { key: "30d", start, end: now };
    }

    const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    return { key, start, end: now };
}

function normalizeText(value: unknown, fallback = ""): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number") {
        return `${value}`;
    }

    return fallback;
}

function normalizePrice(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    return roundNumber(parsed);
}

function normalizeInt(value: unknown, fallback = 0): number {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.max(0, Math.round(parsed));
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || "item";
}

function getNestedValue(record: Record<string, unknown>, keyPath: string[]): unknown {
    let current: unknown = record;
    for (const key of keyPath) {
        if (typeof current !== "object" || current === null || !(key in current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

function collectRenderableImageCandidates(input: unknown, seen = new Set<string>()): string[] {
    if (Array.isArray(input)) {
        for (const entry of input) {
            collectRenderableImageCandidates(entry, seen);
        }
        return Array.from(seen);
    }

    if (typeof input === "string") {
        const text = input.trim();
        if (!text) {
            return Array.from(seen);
        }

        try {
            const parsed = new URL(text);
            if (["http:", "https:"].includes(parsed.protocol) && isRenderableImageUrl(parsed.toString()) && !seen.has(parsed.toString())) {
                seen.add(parsed.toString());
            }
        } catch {
            // ignore invalid URL strings
        }
        return Array.from(seen);
    }

    if (typeof input === "object" && input !== null) {
        const record = input as Record<string, unknown>;
        const keys = ["url", "image", "src", "thumbnail", "original", "imageUrl", "image_url", "cover", "images"];
        for (const key of keys) {
            collectRenderableImageCandidates(record[key], seen);
        }

        for (const value of Object.values(record)) {
            if (typeof value === "object" && value !== null) {
                collectRenderableImageCandidates(value, seen);
            }
        }
    }

    return Array.from(seen);
}

export function isRenderableImageUrl(value: string | null | undefined): boolean {
    if (!value || typeof value !== "string") {
        return false;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }

    try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return false;
        }

        const host = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        if (host.includes("imgur")) {
            const hasDirectImageExtension = /\.(jpe?g|png|webp|gif|avif|bmp|svg)(?:[?#]|$)/i.test(pathname);
            return hasDirectImageExtension;
        }

        return true;
    } catch {
        return false;
    }
}

export function chooseImageUrl(input: unknown, fallback: string = FALLBACK_IMAGE): string | undefined {
    const candidates = collectRenderableImageCandidates(input);
    if (candidates.length > 0) {
        return candidates[0];
    }

    return fallback && isRenderableImageUrl(fallback) ? fallback : undefined;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}

function generateSku(rawName: string, brand: string, category: string): string {
    const slug = slugify(rawName).slice(0, 20);
    const brandSlug = slugify(brand).slice(0, 12) || "gen";
    const categorySlug = slugify(category).slice(0, 10) || "prod";
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `SF-${brandSlug}-${categorySlug}-${slug}-${suffix}`;
}

function normalizeImportedRecord(raw: Record<string, unknown>): CatalogImportItem | null {
    const name = normalizeText(raw.name ?? raw.title ?? raw.productName ?? raw.product_name ?? raw.label);
    const description = normalizeText(
        raw.description ?? raw.details ?? raw.summary ?? raw.longDescription ?? raw.long_description ?? raw.tagline ?? ""
    );
    const brand = normalizeText(raw.brand ?? raw.manufacturer ?? raw.vendor ?? getNestedValue(raw, ["category", "name"]) ?? "Generic");
    const categoryValue = raw.category ?? raw.productType ?? raw.type ?? raw.categoryName ?? raw.category_name ?? getNestedValue(raw, ["category", "name"]) ?? "Electronics";
    const category = typeof categoryValue === "object" && categoryValue !== null
        ? normalizeText((categoryValue as Record<string, unknown>).name ?? (categoryValue as Record<string, unknown>).title ?? "Electronics")
        : normalizeText(categoryValue, "Electronics");
    const price = normalizePrice(raw.price ?? raw.amount ?? raw.currentPrice ?? raw.salePrice ?? raw.cost);
    const originalPrice = raw.originalPrice !== undefined || raw.compareAtPrice !== undefined || raw.listPrice !== undefined
        ? Math.max(normalizePrice(raw.originalPrice ?? raw.compareAtPrice ?? raw.listPrice), price)
        : undefined;
    const stock = normalizeInt(raw.stock ?? raw.inventory ?? raw.quantity ?? 12, 12);
    const productType = normalizeText(raw.productType ?? raw.type ?? category);
    const color = normalizeText(raw.color ?? raw.colour ?? getNestedValue(raw, ["attributes", "color"]) ?? raw.variantColor);
    const rating = Number.isFinite(Number(raw.rating)) ? Math.min(Math.max(Number(raw.rating), 0), 5) : 4.4;
    const reviewCount = normalizeInt(raw.reviewCount ?? raw.reviews ?? raw.ratingCount, 0);
    const active = raw.active === false ? false : true;

    if (!name || !description || price <= 0) {
        return null;
    }

    const sourceProductId = normalizeText(String(raw.sourceProductId ?? raw.sourceId ?? raw.productId ?? raw.product_id ?? raw.id ?? raw.slug ?? raw.sku ?? ""));
    const rawImageSource: unknown = raw.imageUrl ?? raw.images ?? raw.thumbnail ?? raw.image ?? raw.url ?? raw.image_url ?? raw.cover ?? raw.original ?? raw.mainImage ?? raw.featuredImage ?? getNestedValue(raw, ["image", "url"]) ?? getNestedValue(raw, ["images", 0]);
    const sourceImageCandidates = collectRenderableImageCandidates(rawImageSource);
    const imageUrls = sourceImageCandidates.filter(Boolean);
    const imageUrl = imageUrls[0];

    if (!imageUrl) {
        return null;
    }

    const skuCandidate = normalizeText(raw.sku ?? raw.SKU ?? raw.code ?? raw.id);
    const sku = skuCandidate || generateSku(name, brand || "Generic", category || "Electronics");

    return {
        name,
        description,
        brand: brand || "Generic",
        category: category || "Electronics",
        imageUrl,
        imageUrls,
        source: normalizeText(String(raw.source ?? (typeof raw.id !== "undefined" && raw.category ? "dummyjson" : "unknown")), "unknown"),
        sourceProductId: sourceProductId || undefined,
        sourceImageUrl: imageUrl,
        needsImageCorrection: false,
        sku,
        price,
        originalPrice,
        stock,
        productType: productType || category || "general",
        color: color || undefined,
        rating: Number(rating.toFixed(1)),
        reviewCount,
        active,
        createdAt: normalizeText(raw.createdAt ?? raw.created_at ?? new Date().toISOString(), new Date().toISOString()),
    };
}

async function fetchEscuelaCatalog(limit = 25): Promise<Record<string, unknown>[]> {
    const resolvedLimit = Math.min(Math.max(Math.round(limit), 1), MAX_IMPORT_COUNT);
    const products: Record<string, unknown>[] = [];
    let offset = 0;

    while (products.length < resolvedLimit) {
        const response = await fetch(`https://api.escuelajs.co/api/v1/products?offset=${offset}&limit=${Math.min(100, resolvedLimit - products.length)}`);
        if (!response.ok) {
            throw new Error("Unable to fetch EscuelaJS catalog data");
        }

        const payload = (await response.json()) as Record<string, unknown>[];
        if (!Array.isArray(payload) || !payload.length) {
            break;
        }

        for (const item of payload) {
            products.push(item as Record<string, unknown>);
            if (products.length >= resolvedLimit) {
                break;
            }
        }

        if (payload.length < 100) {
            break;
        }

        offset += 100;
    }

    return products.slice(0, resolvedLimit);
}

async function fetchDummyJsonCatalog(limit = 25): Promise<Record<string, unknown>[]> {
    const resolvedLimit = Math.min(Math.max(Math.round(limit), 1), MAX_IMPORT_COUNT);
    const products: Record<string, unknown>[] = [];
    let skip = 0;

    while (products.length < resolvedLimit) {
        const response = await fetch(`https://dummyjson.com/products?limit=${Math.min(100, resolvedLimit - products.length)}&skip=${skip}`);
        if (!response.ok) {
            throw new Error("Unable to fetch DummyJSON catalog data");
        }

        const payload = (await response.json()) as { products?: Record<string, unknown>[] };
        const items = Array.isArray(payload.products) ? payload.products : [];
        if (!items.length) {
            break;
        }

        for (const item of items) {
            if (products.length >= resolvedLimit) {
                break;
            }
            products.push(item as Record<string, unknown>);
        }

        if (items.length < 100) {
            break;
        }

        skip += 100;
    }

    return products.slice(0, resolvedLimit);
}

async function resolveImportItems(source: string, limit: number, suppliedItems?: unknown[]): Promise<Record<string, unknown>[]> {
    if (source === "escuela") {
        return fetchEscuelaCatalog(limit);
    }

    if (source === "dummyjson") {
        return fetchDummyJsonCatalog(limit);
    }

    if (Array.isArray(suppliedItems) && suppliedItems.length > 0) {
        return suppliedItems as Record<string, unknown>[];
    }

    if (source === "json") {
        return [];
    }

    return [];
}

export async function getAdminImportSources(): Promise<{ sources: SupportedImportSource[] }> {
    return { sources: [...SUPPORTED_IMPORT_SOURCES] };
}

export async function previewCatalogImport(source: string, limit = 25, suppliedItems?: unknown[]): Promise<CatalogImportPreviewResponse> {
    const normalizedSource = SUPPORTED_IMPORT_SOURCES.includes(source as SupportedImportSource)
        ? (source as SupportedImportSource)
        : "json";
    const resolvedLimit = Math.min(Math.max(Math.round(limit), 1), MAX_IMPORT_COUNT);
    const rawItems = await resolveImportItems(normalizedSource, resolvedLimit, suppliedItems);
    const preview: CatalogImportItem[] = [];

    let valid = 0;
    let invalid = 0;
    for (const item of rawItems) {
        const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const normalized = normalizeImportedRecord(record);
        if (!normalized) {
            invalid += 1;
            continue;
        }
        valid += 1;
        preview.push(normalized);
    }

    return {
        source: normalizedSource,
        total: rawItems.length,
        valid,
        invalid,
        preview: preview.slice(0, 25),
        maxAllowed: MAX_IMPORT_COUNT,
    };
}

export async function executeCatalogImport(payload: {
    source?: string;
    limit?: number;
    items?: unknown[];
    dryRun?: boolean;
}): Promise<CatalogImportExecutionResponse> {
    const source = SUPPORTED_IMPORT_SOURCES.includes((payload.source ?? "escuela") as SupportedImportSource)
        ? (payload.source ?? "escuela") as SupportedImportSource
        : "json";
    const limit = Math.min(Math.max(Math.round(payload.limit ?? 25), 1), MAX_IMPORT_COUNT);
    const dryRun = Boolean(payload.dryRun);
    const batchId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const rawItems = await resolveImportItems(source, limit, payload.items);
    const preview: CatalogImportItem[] = [];
    const invalids: number[] = [];
    let validCount = 0;

    for (const item of rawItems) {
        const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const normalized = normalizeImportedRecord(record);
        if (!normalized) {
            invalids.push(1);
            continue;
        }

        validCount += 1;
        preview.push(normalized);
    }

    const uniqueBySku = new Map<string, CatalogImportItem>();
    for (const item of preview) {
        if (!uniqueBySku.has(item.sku)) {
            uniqueBySku.set(item.sku, item);
        }
    }

    const seenImageUrls = new Map<string, string>();
    const deduplicatedPreview: CatalogImportItem[] = [];
    for (const item of [...uniqueBySku.values()]) {
        if (!item.imageUrl) {
            continue;
        }
        const previous = seenImageUrls.get(item.imageUrl);
        if (previous && previous !== item.sourceProductId && previous !== item.name) {
            item.needsImageCorrection = true;
            item.imageUrl = undefined;
            item.imageUrls = [];
            continue;
        }
        seenImageUrls.set(item.imageUrl, item.sourceProductId ?? item.name);
        deduplicatedPreview.push(item);
    }

    const existingSkus = new Set(
        (await Product.find({ sku: { $in: [...uniqueBySku.keys()] } }, { sku: 1 }).lean()).map((product) => product.sku).filter(Boolean) as string[]
    );

    const insertable = deduplicatedPreview.filter((item) => !existingSkus.has(item.sku));
    const skipped = preview.length - insertable.length;
    const totalBefore = await Product.countDocuments();

    if (dryRun) {
        return {
            batchId,
            source,
            dryRun: true,
            totalRequested: rawItems.length,
            valid: validCount,
            invalid: invalids.length,
            duplicateSkus: skipped,
            inserted: 0,
            skipped,
            failed: 0,
            totalBefore,
            totalAfter: totalBefore,
            preview: insertable.slice(0, 25),
        };
    }

    const documents = insertable.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        imageUrls: item.imageUrls,
        source: item.source,
        sourceProductId: item.sourceProductId,
        sourceImageUrl: item.sourceImageUrl ?? item.imageUrl,
        needsImageCorrection: Boolean(item.needsImageCorrection),
        category: item.category,
        stock: item.stock,
        popularity: item.reviewCount > 0 ? Math.min(item.rating * 10 + item.reviewCount / 2, 99) : Math.max(item.rating * 10, 1),
        brand: item.brand,
        sku: item.sku,
        originalPrice: item.originalPrice,
        productType: item.productType,
        color: item.color,
        rating: item.rating,
        reviewCount: item.reviewCount,
        active: item.active,
        importBatchId: batchId,
        createdAt: new Date(item.createdAt),
    }));

    let inserted = 0;
    let failed = 0;

    try {
        if (documents.length) {
            await Product.insertMany(documents, { ordered: false });
            inserted = documents.length;
        }
    } catch (error) {
        const knownError = error as { writeErrors?: Array<{ err?: { code?: number; errmsg?: string } }> };
        failed = Math.max((knownError.writeErrors?.length ?? 0), 0);
        inserted = Math.max(documents.length - failed, 0);
    }

    const totalAfter = await Product.countDocuments();

    return {
        batchId,
        source,
        dryRun: false,
        totalRequested: rawItems.length,
        valid: validCount,
        invalid: invalids.length,
        duplicateSkus: skipped,
        inserted,
        skipped: skipped + failed,
        failed,
        totalBefore,
        totalAfter,
        preview: insertable.slice(0, 25),
    };
}

export async function getAdminOverview(rangeKey: string | undefined, from?: string, to?: string): Promise<AdminOverviewResponse> {
    const range = resolveRange(rangeKey, from, to);
    const currentWindowStart = range.start;
    const currentWindowEnd = range.end;

    const durationMs = Math.max(1, currentWindowEnd.getTime() - currentWindowStart.getTime());
    const previousWindowEnd = new Date(currentWindowStart);
    const previousWindowStart = new Date(currentWindowStart);
    previousWindowStart.setTime(previousWindowStart.getTime() - durationMs);

    const [orders, products, registeredUsers, previousOrders] = await Promise.all([
        Order.find({ createdAt: { $gte: currentWindowStart, $lte: currentWindowEnd } }).lean(),
        Product.find({}).lean(),
        User.find({ role: "shopper" }).lean(),
        Order.find({ createdAt: { $gte: previousWindowStart, $lt: previousWindowEnd } }).lean(),
    ]);

    const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
    const previousOrderCount = previousOrders.length;

    const customerCount = registeredUsers.length;
    const productCount = products.length;
    const lowStockCount = products.filter((product) => Number(product.stock ?? 0) <= 5).length;
    const pendingOrdersCount = orders.filter((order) => order.status === "pending").length;
    const avgOrderValue = orders.length ? revenue / orders.length : 0;

    const customerUsers = await User.find({ role: "shopper" }).select("_id name email createdAt").lean();
    const customerLookup = new Map<string, { name: string; email: string }>();
    for (const user of customerUsers) {
        customerLookup.set(String(user._id), {
            name: user.name,
            email: user.email,
        });
    }

    const orderByStatus = new Map<string, number>();
    for (const status of ORDER_STATUSES) {
        orderByStatus.set(status, 0);
    }

    for (const order of orders) {
        orderByStatus.set(order.status, (orderByStatus.get(order.status) ?? 0) + 1);
    }

    const statusBreakdown = ORDER_STATUSES.map((status) => {
        const count = orderByStatus.get(status) ?? 0;
        return {
            status,
            count,
            share: orders.length ? Number(((count / orders.length) * 100).toFixed(1)) : 0,
        };
    }).filter((value) => value.count > 0 || value.status === "pending");

    const revenueTrend: Array<{ label: string; revenue: number; orders: number }> = [];
    const totalDays = Math.max(1, Math.ceil((currentWindowEnd.getTime() - currentWindowStart.getTime()) / 86400000) + 1);

    for (let index = 0; index < totalDays; index += 1) {
        const date = new Date(currentWindowStart);
        date.setDate(date.getDate() + index);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const matchingOrders = orders.filter(
            (order) => new Date(order.createdAt) >= date && new Date(order.createdAt) < nextDate
        );

        const dayRevenue = matchingOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
        revenueTrend.push({
            label: formatLabel(date),
            revenue: roundNumber(dayRevenue),
            orders: matchingOrders.length,
        });
    }

    const categoryCounts = new Map<string, number>();
    for (const product of products) {
        const key = product.category?.trim() || "Uncategorized";
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }

    const categoryBreakdown = [...categoryCounts.entries()]
        .map(([name, value]) => ({
            name,
            value,
            share: productCount ? Number(((value / productCount) * 100).toFixed(1)) : 0,
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 5);

    const productSales = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of orders) {
        for (const item of order.items ?? []) {
            const productKey = String(item.productId ?? item.name);
            const current = productSales.get(productKey) ?? { name: item.name, units: 0, revenue: 0 };
            current.units += Number(item.quantity ?? 0);
            current.revenue += Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
            productSales.set(productKey, current);
        }
    }

    const topProducts = [...productSales.values()]
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 5)
        .map((entry) => ({
            name: entry.name,
            units: entry.units,
            revenue: roundNumber(entry.revenue),
        }));

    const recentOrders = [...orders]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6)
        .map((order) => {
            const userName = customerLookup.get(String(order.userId))?.name ?? "Customer";
            return {
                id: String((order as { _id?: unknown; id?: string })._id ?? order.id),
                orderNumber: order.orderNumber,
                customerName: userName,
                totalAmount: Number(order.totalAmount ?? 0),
                status: order.status,
                createdAt: new Date(order.createdAt).toISOString(),
            };
        });

    const overview: AdminOverviewResponse = {
        range: {
            key: range.key,
            start: currentWindowStart.toISOString(),
            end: currentWindowEnd.toISOString(),
        },
        metrics: {
            revenue: roundNumber(revenue),
            orders: orders.length,
            customers: customerCount,
            products: productCount,
            lowStock: lowStockCount,
            avgOrderValue: roundNumber(avgOrderValue),
            pendingOrders: pendingOrdersCount,
        },
        deltas: {
            revenue: getDelta(revenue, previousRevenue),
            orders: getDelta(orders.length, previousOrderCount),
            customers: getDelta(customerCount, customerCount),
        },
        revenueTrend,
        categoryBreakdown,
        statusBreakdown,
        topProducts,
        recentOrders,
    };

    return overview;
}
