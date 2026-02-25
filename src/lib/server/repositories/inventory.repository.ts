import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type {
	InventoryCustomerRecord,
	InventoryMovementListItem,
	InventoryOverviewItem,
	InventoryOverviewSummary,
	InventoryPagination,
	InventoryPurchaseLineItem,
	InventoryPurchaseListItem,
	InventoryPurchaseRecord,
	InventorySaleLineItem,
	InventorySaleListItem,
	InventorySaleRecord
} from '$lib/types/inventory';
import type {
	InventoryListFilterState,
	InventoryMovementDirection,
	InventoryMovementReason,
	InventoryPurchaseEntryType,
	InventoryPurchaseOrigin,
	InventoryPurchaseState,
	InventorySaleChannel,
	InventorySaleFulfillmentType,
	InventorySaleShippingState,
	InventorySaleStatusFilter
} from '$lib/utils/inventory';

interface PaginationParams {
	page?: number;
	pageSize?: number;
	maxPageSize?: number;
}

interface PaginationResult {
	page: number;
	pageSize: number;
	offset: number;
}

export interface PagedListResult<T> {
	items: T[];
	pagination: InventoryPagination;
}

export interface InventoryOverviewFilters extends PaginationParams {
	branchCode?: string;
	categoryCode?: string;
	search?: string;
	stock?: InventoryListFilterState;
	includeInactive?: boolean;
}

export interface CreateInventoryPurchaseItemInput {
	productCode: string;
	quantity: number;
	unitCost: number | null;
}

export interface CreateInventoryPurchaseInput {
	branchCode: string;
	userCode: string;
	origin: InventoryPurchaseOrigin;
	entryType: InventoryPurchaseEntryType;
	trackingNumber: string | null;
	state: InventoryPurchaseState;
	orderedAt: Date | string;
	note: string | null;
	items: CreateInventoryPurchaseItemInput[];
}

export interface UpdateInventoryPurchaseStateInput {
	purchaseCode: string;
	userCode: string;
	state: InventoryPurchaseState;
	note?: string | null;
}

export interface CreateInventorySaleItemInput {
	productCode: string;
	quantity: number;
	unitPrice: number;
}

export interface CreateInventorySaleInput {
	branchCode: string;
	userCode: string;
	saleChannel: InventorySaleChannel;
	fulfillmentType: InventorySaleFulfillmentType;
	shippingState: InventorySaleShippingState;
	deliveryAddress: string | null;
	orderReference: string | null;
	customerCode?: string | null;
	customerName?: string | null;
	customerPhone?: string | null;
	soldAt: Date | string;
	note: string | null;
	items: CreateInventorySaleItemInput[];
}

export interface UpdateInventorySaleShippingInput {
	saleCode: string;
	shippingState: InventorySaleShippingState;
	deliveryAddress?: string | null;
	orderReference?: string | null;
}

export interface VoidInventorySaleInput {
	saleCode: string;
	userCode: string;
	note?: string | null;
}

export interface UpdateInventoryThresholdsInput {
	productCode: string;
	branchCode: string;
	reorderPoint: number;
	emergencyPoint: number;
}

export interface InventoryPurchaseListFilters extends PaginationParams {
	branchCode?: string;
	productCode?: string;
	state?: InventoryPurchaseState;
	origin?: InventoryPurchaseOrigin;
	entryType?: InventoryPurchaseEntryType;
	search?: string;
}

export interface InventorySaleListFilters extends PaginationParams {
	branchCode?: string;
	productCode?: string;
	customerCode?: string;
	shippingState?: InventorySaleShippingState;
	saleChannel?: InventorySaleChannel;
	status?: InventorySaleStatusFilter;
	search?: string;
}

export interface InventoryCustomerListFilters extends PaginationParams {
	search?: string;
}

export interface InventoryMovementListFilters {
	branchCode?: string;
	productCode?: string;
	reason?: InventoryMovementReason;
	direction?: InventoryMovementDirection;
	limit?: number;
}

export interface CreateInventoryCustomerInput {
	fullName: string;
	phone?: string | null;
	note?: string | null;
}

export interface UpdateInventoryCustomerInput {
	customerCode: string;
	fullName: string;
	phone?: string | null;
	note?: string | null;
}

export interface DeleteInventoryCustomerResult {
	customer: InventoryCustomerRecord;
	linkedSalesCount: number;
}

interface InventoryOverviewSummaryRow {
	total_products: number | string;
	healthy_count: number | string;
	low_count: number | string;
	emergency_count: number | string;
	out_of_stock_count: number | string;
	in_transit_only_count: number | string;
	total_available: number | string;
	total_inbound: number | string;
}

interface RowWithTotalCount {
	total_count: number | string;
}

interface InventoryOverviewListRow extends InventoryOverviewItem, RowWithTotalCount {}

interface InventoryPurchaseFeedRow {
	code: string;
	branch_code: string;
	user_code: string;
	origin: string;
	entry_type: string;
	tracking_number: string | null;
	state: string;
	ordered_at: string | Date;
	received_at: string | Date | null;
	refunded_at: string | Date | null;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	item_count: number | string;
	total_quantity: number | string;
	total_amount: number | string;
	products_summary: string;
	primary_product_code: string | null;
	primary_product_name: string | null;
	primary_product_sku: string | null;
	items: unknown;
	branch_name: string;
	can_refund: boolean;
}

interface InventoryPurchaseListRow extends InventoryPurchaseFeedRow, RowWithTotalCount {}

interface InventorySaleFeedRow {
	code: string;
	branch_code: string;
	user_code: string;
	customer_code: string | null;
	sale_channel: string;
	fulfillment_type: string;
	shipping_state: string;
	delivery_address: string | null;
	order_reference: string | null;
	customer_name: string;
	customer_phone: string | null;
	sold_at: string | Date;
	note: string | null;
	voided_at: string | Date | null;
	voided_by_user_code: string | null;
	void_note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	item_count: number | string;
	total_quantity: number | string;
	total_amount: number | string;
	profit_amount: number | string;
	products_summary: string;
	primary_product_code: string | null;
	primary_product_name: string | null;
	primary_product_sku: string | null;
	items: unknown;
	branch_name: string;
	customer_full_name: string | null;
	voided_by_name: string | null;
}

interface InventorySaleListRow extends InventorySaleFeedRow, RowWithTotalCount {}
interface InventoryCustomerListRow extends InventoryCustomerRecord, RowWithTotalCount {}

function toNumber(value: number | string | null | undefined): number {
	if (value === null || value === undefined) return 0;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function toStringMoney(value: number | string | null | undefined): string {
	if (value === null || value === undefined) return '0';
	if (typeof value === 'string') return value;
	return String(value);
}

function normalizePagination({
	page = 1,
	pageSize = 25,
	maxPageSize = 100
}: PaginationParams): PaginationResult {
	const normalizedPage = Number.isInteger(page) ? Math.max(Number(page), 1) : 1;
	const normalizedPageSize = Number.isInteger(pageSize)
		? Math.min(Math.max(Number(pageSize), 1), maxPageSize)
		: 25;

	return {
		page: normalizedPage,
		pageSize: normalizedPageSize,
		offset: (normalizedPage - 1) * normalizedPageSize
	};
}

function toPagination(total: number, page: number, pageSize: number): InventoryPagination {
	const safeTotal = Math.max(total, 0);
	return {
		page,
		page_size: pageSize,
		total: safeTotal,
		total_pages: safeTotal === 0 ? 1 : Math.ceil(safeTotal / pageSize)
	};
}

function toDateOnly(value: Date | string): string {
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}

	return String(value);
}

function parseJsonArray(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
	}

	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value) as unknown;
			if (Array.isArray(parsed)) {
				return parsed.filter(
					(item): item is Record<string, unknown> => !!item && typeof item === 'object'
				);
			}
		} catch {
			return [];
		}
	}

	return [];
}

function toPurchaseLineItems(value: unknown): InventoryPurchaseLineItem[] {
	return parseJsonArray(value).map((item) => ({
		code: String(item.code ?? ''),
		purchase_code: String(item.purchase_code ?? ''),
		product_code: String(item.product_code ?? ''),
		product_name: String(item.product_name ?? ''),
		product_sku: item.product_sku === null || item.product_sku === undefined ? null : String(item.product_sku),
		quantity: toNumber(item.quantity as number | string | null | undefined),
		unit_cost:
			item.unit_cost === null || item.unit_cost === undefined ? null : toStringMoney(item.unit_cost as number | string),
		total_amount: toStringMoney(item.total_amount as number | string | null | undefined),
		created_at: String(item.created_at ?? ''),
		updated_at: String(item.updated_at ?? '')
	}));
}

function toSaleLineItems(value: unknown): InventorySaleLineItem[] {
	return parseJsonArray(value).map((item) => ({
		code: String(item.code ?? ''),
		sale_code: String(item.sale_code ?? ''),
		product_code: String(item.product_code ?? ''),
		product_name: String(item.product_name ?? ''),
		product_sku: item.product_sku === null || item.product_sku === undefined ? null : String(item.product_sku),
		quantity: toNumber(item.quantity as number | string | null | undefined),
		unit_price: toStringMoney(item.unit_price as number | string | null | undefined),
		unit_cost: toStringMoney(item.unit_cost as number | string | null | undefined),
		total_amount: toStringMoney(item.total_amount as number | string | null | undefined),
		profit_amount: toStringMoney(item.profit_amount as number | string | null | undefined),
		created_at: String(item.created_at ?? ''),
		updated_at: String(item.updated_at ?? '')
	}));
}

function mapPurchaseFeedRow(row: InventoryPurchaseFeedRow): InventoryPurchaseRecord {
	return {
		code: row.code,
		branch_code: row.branch_code,
		user_code: row.user_code,
		origin: row.origin as InventoryPurchaseOrigin,
		entry_type: row.entry_type as InventoryPurchaseEntryType,
		tracking_number: row.tracking_number,
		state: row.state as InventoryPurchaseState,
		ordered_at: row.ordered_at,
		received_at: row.received_at,
		refunded_at: row.refunded_at,
		note: row.note,
		created_at: row.created_at,
		updated_at: row.updated_at,
		item_count: toNumber(row.item_count),
		total_quantity: toNumber(row.total_quantity),
		total_amount: toStringMoney(row.total_amount),
		products_summary: row.products_summary || '',
		primary_product_code: row.primary_product_code,
		primary_product_name: row.primary_product_name,
		primary_product_sku: row.primary_product_sku,
		items: toPurchaseLineItems(row.items),
		branch_name: row.branch_name,
		can_refund: row.can_refund === true
	};
}

function mapSaleFeedRow(row: InventorySaleFeedRow): InventorySaleRecord {
	return {
		code: row.code,
		branch_code: row.branch_code,
		user_code: row.user_code,
		customer_code: row.customer_code,
		sale_channel: row.sale_channel as InventorySaleChannel,
		fulfillment_type: row.fulfillment_type as InventorySaleFulfillmentType,
		shipping_state: row.shipping_state as InventorySaleShippingState,
		delivery_address: row.delivery_address,
		order_reference: row.order_reference,
		customer_name: row.customer_name,
		customer_phone: row.customer_phone,
		sold_at: row.sold_at,
		note: row.note,
		voided_at: row.voided_at,
		voided_by_user_code: row.voided_by_user_code,
		void_note: row.void_note,
		created_at: row.created_at,
		updated_at: row.updated_at,
		item_count: toNumber(row.item_count),
		total_quantity: toNumber(row.total_quantity),
		total_amount: toStringMoney(row.total_amount),
		profit_amount: toStringMoney(row.profit_amount),
		products_summary: row.products_summary || '',
		primary_product_code: row.primary_product_code,
		primary_product_name: row.primary_product_name,
		primary_product_sku: row.primary_product_sku,
		items: toSaleLineItems(row.items),
		branch_name: row.branch_name,
		customer_full_name: row.customer_full_name,
		voided_by_name: row.voided_by_name
	};
}

function unpackPagedRows<T extends RowWithTotalCount>(
	rows: T[]
): {
	items: Omit<T, 'total_count'>[];
	total: number;
} {
	const total = toNumber(rows[0]?.total_count);
	const items = rows.map(({ total_count: _totalCount, ...item }) => item as Omit<T, 'total_count'>);
	return { items, total };
}

export class InventoryRepository {
	static async listOverview(
		db: Database,
		filters: InventoryOverviewFilters
	): Promise<{
		items: InventoryOverviewItem[];
		summary: InventoryOverviewSummary;
		pagination: InventoryPagination;
	}> {
		const { page, pageSize } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 120
		});
		const search = filters.search?.trim() || null;
		const stock = filters.stock ?? 'all';
		const includeInactive = filters.includeInactive === true;

		const [summaryResult, rowsResult] = await Promise.all([
			sql<InventoryOverviewSummaryRow>`
				SELECT *
				FROM public.inventory_overview_summary(
					${filters.branchCode ?? null},
					${filters.categoryCode ?? null},
					${search},
					${stock},
					${includeInactive}
				)
			`.execute(db),
			sql<InventoryOverviewListRow>`
				SELECT *
				FROM public.inventory_list_overview(
					${filters.branchCode ?? null},
					${filters.categoryCode ?? null},
					${search},
					${stock},
					${includeInactive},
					${page},
					${pageSize}
				)
			`.execute(db)
		]);

		const summaryRow = summaryResult.rows[0];
		const summary: InventoryOverviewSummary = {
			total_products: toNumber(summaryRow?.total_products),
			healthy_count: toNumber(summaryRow?.healthy_count),
			low_count: toNumber(summaryRow?.low_count),
			emergency_count: toNumber(summaryRow?.emergency_count),
			out_of_stock_count: toNumber(summaryRow?.out_of_stock_count),
			in_transit_only_count: toNumber(summaryRow?.in_transit_only_count),
			total_available: toNumber(summaryRow?.total_available),
			total_inbound: toNumber(summaryRow?.total_inbound)
		};

		const { items, total } = unpackPagedRows(rowsResult.rows);

		return {
			items: items as InventoryOverviewItem[],
			summary,
			pagination: toPagination(total, page, pageSize)
		};
	}

	static async listPurchases(
		db: Database,
		filters: InventoryPurchaseListFilters = {}
	): Promise<PagedListResult<InventoryPurchaseListItem>> {
		const { page, pageSize } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 120
		});
		const search = filters.search?.trim() || null;

		const rowsResult = await sql<InventoryPurchaseListRow>`
			SELECT *
			FROM public.inventory_list_purchases(
				${filters.branchCode ?? null},
				${filters.productCode ?? null},
				${filters.state ?? null},
				${filters.origin ?? null},
				${filters.entryType ?? null},
				${search},
				${page},
				${pageSize}
			)
		`.execute(db);

		const { items, total } = unpackPagedRows(rowsResult.rows);

		return {
			items: (items as InventoryPurchaseFeedRow[]).map((row) => mapPurchaseFeedRow(row)),
			pagination: toPagination(total, page, pageSize)
		};
	}

	static async listSales(
		db: Database,
		filters: InventorySaleListFilters = {}
	): Promise<PagedListResult<InventorySaleListItem>> {
		const { page, pageSize } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 120
		});
		const search = filters.search?.trim() || null;

		const rowsResult = await sql<InventorySaleListRow>`
			SELECT *
			FROM public.inventory_list_sales(
				${filters.branchCode ?? null},
				${filters.productCode ?? null},
				${filters.customerCode ?? null},
				${filters.shippingState ?? null},
				${filters.saleChannel ?? null},
				${filters.status ?? 'all'},
				${search},
				${page},
				${pageSize}
			)
		`.execute(db);

		const { items, total } = unpackPagedRows(rowsResult.rows);

		return {
			items: (items as InventorySaleFeedRow[]).map((row) => mapSaleFeedRow(row)),
			pagination: toPagination(total, page, pageSize)
		};
	}

	static async listCustomers(
		db: Database,
		filters: InventoryCustomerListFilters = {}
	): Promise<PagedListResult<InventoryCustomerRecord>> {
		const { page, pageSize } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 100
		});
		const search = filters.search?.trim() || null;

		const rowsResult = await sql<InventoryCustomerListRow>`
			SELECT *
			FROM public.inventory_list_customers(
				${search},
				${page},
				${pageSize}
			)
		`.execute(db);

		const { items, total } = unpackPagedRows(rowsResult.rows);

		return {
			items: items as InventoryCustomerRecord[],
			pagination: toPagination(total, page, pageSize)
		};
	}

	static async listMovements(
		db: Database,
		filters: InventoryMovementListFilters = {}
	): Promise<InventoryMovementListItem[]> {
		const limit = Number.isInteger(filters.limit)
			? Math.min(Math.max(Number(filters.limit), 1), 300)
			: 120;

		const result = await sql<InventoryMovementListItem>`
			SELECT *
			FROM public.inventory_list_movements(
				${filters.branchCode ?? null},
				${filters.productCode ?? null},
				${filters.reason ?? null},
				${filters.direction ?? null},
				${limit}
			)
		`.execute(db);

		return result.rows;
	}

	static async createPurchase(
		db: Database,
		input: CreateInventoryPurchaseInput
	): Promise<InventoryPurchaseRecord> {
		const orderedAt = toDateOnly(input.orderedAt);
		const serializedItems = JSON.stringify(
			input.items.map((item) => ({
				product_code: item.productCode,
				quantity: item.quantity,
				unit_cost: item.unitCost
			}))
		);

		const createdResult = await sql<{ code: string }>`
			SELECT code
			FROM public.inventory_create_purchase(
				${input.branchCode},
				${input.userCode},
				${input.origin},
				${input.entryType},
				${input.trackingNumber},
				${input.state},
				${orderedAt},
				${input.note},
				${serializedItems}::jsonb
			)
		`.execute(db);

		const code = createdResult.rows[0]?.code;
		if (!code) {
			throw new Error('No se pudo crear la compra');
		}

		const purchaseRow = (await db
			.selectFrom('inventory_purchase_feed')
			.selectAll()
			.where('code', '=', code)
			.executeTakeFirst()) as unknown as InventoryPurchaseFeedRow | undefined;

		if (!purchaseRow) {
			throw new Error('No se pudo cargar la compra creada');
		}

		return mapPurchaseFeedRow(purchaseRow);
	}

	static async updatePurchaseState(
		db: Database,
		input: UpdateInventoryPurchaseStateInput
	): Promise<InventoryPurchaseRecord | null> {
		const updateResult = await sql<{ code: string }>`
			SELECT code
			FROM public.inventory_update_purchase_state(
				${input.purchaseCode},
				${input.userCode},
				${input.state},
				${input.note !== undefined},
				${input.note ?? null}
			)
		`.execute(db);

		const code = updateResult.rows[0]?.code;
		if (!code) {
			return null;
		}

		const purchaseRow = (await db
			.selectFrom('inventory_purchase_feed')
			.selectAll()
			.where('code', '=', code)
			.executeTakeFirst()) as unknown as InventoryPurchaseFeedRow | undefined;

		return purchaseRow ? mapPurchaseFeedRow(purchaseRow) : null;
	}

	static async createSale(db: Database, input: CreateInventorySaleInput): Promise<InventorySaleRecord> {
		const resolvedCustomer = await this.resolveSaleCustomer(db, {
			customerCode: input.customerCode,
			customerName: input.customerName,
			customerPhone: input.customerPhone
		});
		const customerName = (resolvedCustomer.customer_name ?? input.customerName ?? '').trim();
		const customerPhone =
			(resolvedCustomer.customer_phone ?? input.customerPhone ?? '').trim() || null;

		if (!customerName) {
			throw new Error('El nombre del cliente es obligatorio');
		}

		const serializedItems = JSON.stringify(
			input.items.map((item) => ({
				product_code: item.productCode,
				quantity: item.quantity,
				unit_price: item.unitPrice
			}))
		);

		const createdResult = await sql<{ code: string }>`
			SELECT code
			FROM public.inventory_create_sale(
				${input.branchCode},
				${input.userCode},
				${resolvedCustomer.customer_code},
				${customerName},
				${customerPhone},
				${input.saleChannel},
				${input.fulfillmentType},
				${input.shippingState},
				${input.deliveryAddress},
				${input.orderReference},
				${input.soldAt},
				${input.note},
				${serializedItems}::jsonb
			)
		`.execute(db);

		const code = createdResult.rows[0]?.code;
		if (!code) {
			throw new Error('No se pudo registrar la venta');
		}

		const saleRow = (await db
			.selectFrom('inventory_sale_feed')
			.selectAll()
			.where('code', '=', code)
			.executeTakeFirst()) as unknown as InventorySaleFeedRow | undefined;

		if (!saleRow) {
			throw new Error('No se pudo cargar la venta creada');
		}

		return mapSaleFeedRow(saleRow);
	}

	static async updateSaleShippingState(
		db: Database,
		input: UpdateInventorySaleShippingInput
	): Promise<InventorySaleRecord | null> {
		const updateResult = await sql<{ code: string }>`
			SELECT code
			FROM public.inventory_update_sale_shipping_state(
				${input.saleCode},
				${input.shippingState},
				${input.deliveryAddress !== undefined},
				${input.deliveryAddress ?? null},
				${input.orderReference !== undefined},
				${input.orderReference ?? null}
			)
		`.execute(db);

		const code = updateResult.rows[0]?.code;
		if (!code) {
			return null;
		}

		const saleRow = (await db
			.selectFrom('inventory_sale_feed')
			.selectAll()
			.where('code', '=', code)
			.executeTakeFirst()) as unknown as InventorySaleFeedRow | undefined;

		return saleRow ? mapSaleFeedRow(saleRow) : null;
	}

	static async voidSale(
		db: Database,
		input: VoidInventorySaleInput
	): Promise<InventorySaleRecord | null> {
		const updateResult = await sql<{ code: string }>`
			SELECT code
			FROM public.inventory_void_sale(
				${input.saleCode},
				${input.userCode},
				${input.note ?? null}
			)
		`.execute(db);

		const code = updateResult.rows[0]?.code;
		if (!code) {
			return null;
		}

		const saleRow = (await db
			.selectFrom('inventory_sale_feed')
			.selectAll()
			.where('code', '=', code)
			.executeTakeFirst()) as unknown as InventorySaleFeedRow | undefined;

		return saleRow ? mapSaleFeedRow(saleRow) : null;
	}

	static async createCustomer(
		db: Database,
		input: CreateInventoryCustomerInput
	): Promise<InventoryCustomerRecord> {
		const result = await sql<InventoryCustomerRecord>`
			SELECT *
			FROM public.inventory_create_customer(
				${input.fullName},
				${input.phone ?? null},
				${input.note ?? null}
			)
		`.execute(db);

		const customer = result.rows[0];
		if (!customer) {
			throw new Error('No se pudo crear el cliente');
		}

		return customer;
	}

	static async updateCustomer(
		db: Database,
		input: UpdateInventoryCustomerInput
	): Promise<InventoryCustomerRecord | null> {
		const result = await sql<InventoryCustomerRecord>`
			SELECT *
			FROM public.inventory_update_customer(
				${input.customerCode},
				${input.fullName},
				${input.phone ?? null},
				${input.note ?? null}
			)
		`.execute(db);

		return result.rows[0] ?? null;
	}

	static async deleteCustomer(
		db: Database,
		customerCode: string
	): Promise<DeleteInventoryCustomerResult | null> {
		return db.transaction().execute(async (trx) => {
			const linkedSales = await sql<{ linked_sales_count: number | string }>`
				SELECT COUNT(*)::int AS linked_sales_count
				FROM public.sales
				WHERE customer_code = ${customerCode}
			`.execute(trx);

			const deletedCustomer = await sql<InventoryCustomerRecord>`
				SELECT *
				FROM public.inventory_delete_customer(${customerCode})
			`.execute(trx);

			const customer = deletedCustomer.rows[0];
			if (!customer) {
				return null;
			}

			return {
				customer,
				linkedSalesCount: toNumber(linkedSales.rows[0]?.linked_sales_count)
			};
		});
	}

	static async updateThresholds(
		db: Database,
		input: UpdateInventoryThresholdsInput
	): Promise<InventoryOverviewItem | null> {
		const overview = await sql<InventoryOverviewItem>`
			SELECT *
			FROM public.inventory_update_thresholds(
				${input.productCode},
				${input.branchCode},
				${input.reorderPoint},
				${input.emergencyPoint}
			)
		`.execute(db);

		return overview.rows[0] ?? null;
	}

	private static async resolveSaleCustomer(
		db: Database,
		input: {
			customerCode?: string | null;
			customerName?: string | null;
			customerPhone?: string | null;
		}
	): Promise<{
		customer_code: string | null;
		customer_name: string;
		customer_phone: string | null;
	}> {
		if (input.customerCode) {
			const result = await sql<InventoryCustomerRecord>`
				SELECT *
				FROM public.inventory_get_customer(${input.customerCode})
			`.execute(db);

			const customer = result.rows[0];
			if (!customer) {
				throw new Error('Cliente no encontrado');
			}

			return {
				customer_code: customer.code,
				customer_name: customer.full_name,
				customer_phone: customer.phone
			};
		}

		const customerName = (input.customerName ?? '').trim();
		const customerPhone = (input.customerPhone ?? '').trim() || null;
		if (!customerName) {
			throw new Error('El nombre del cliente es obligatorio');
		}

		const existingResult = await sql<InventoryCustomerRecord>`
			SELECT *
			FROM public.inventory_find_customer_by_identity(
				${customerName},
				${customerPhone}
			)
		`.execute(db);

		let customer = existingResult.rows[0];
		if (!customer) {
			customer = await this.createCustomer(db, {
				fullName: customerName,
				phone: customerPhone
			});
		}

		return {
			customer_code: customer.code,
			customer_name: customer.full_name,
			customer_phone: customer.phone
		};
	}
}
