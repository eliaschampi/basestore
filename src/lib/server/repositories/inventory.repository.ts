import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type {
	InventoryCustomerRecord,
	InventoryMovementListItem,
	InventoryOverviewItem,
	InventoryOverviewSummary,
	InventoryPagination,
	InventoryPurchaseListItem,
	InventoryPurchaseRecord,
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

export interface CreateInventoryPurchaseInput {
	productCode: string;
	branchCode: string;
	userCode: string;
	origin: InventoryPurchaseOrigin;
	entryType: InventoryPurchaseEntryType;
	trackingNumber: string | null;
	quantity: number;
	state: InventoryPurchaseState;
	orderedAt: Date | string;
	unitCost: number | null;
	note: string | null;
}

export interface UpdateInventoryPurchaseStateInput {
	purchaseCode: string;
	userCode: string;
	state: InventoryPurchaseState;
	note?: string | null;
}

export interface CreateInventorySaleInput {
	productCode: string;
	branchCode: string;
	userCode: string;
	quantity: number;
	unitPrice: number;
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
interface InventoryPurchaseListRow extends InventoryPurchaseListItem, RowWithTotalCount {}
interface InventorySaleListRow extends InventorySaleListItem, RowWithTotalCount {}
interface InventoryCustomerListRow extends InventoryCustomerRecord, RowWithTotalCount {}

function toNumber(value: number | string | null | undefined): number {
	if (value === null || value === undefined) return 0;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
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
			items: items as InventoryPurchaseListItem[],
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
			items: items as InventorySaleListItem[],
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
		const result = await sql<InventoryPurchaseRecord>`
			SELECT *
			FROM public.inventory_create_purchase(
				${input.productCode},
				${input.branchCode},
				${input.userCode},
				${input.origin},
				${input.entryType},
				${input.trackingNumber},
				${input.quantity},
				${input.state},
				${orderedAt},
				${input.unitCost},
				${input.note}
			)
		`.execute(db);

		const purchase = result.rows[0];
		if (!purchase) {
			throw new Error('No se pudo crear la compra');
		}

		return purchase;
	}

	static async updatePurchaseState(
		db: Database,
		input: UpdateInventoryPurchaseStateInput
	): Promise<InventoryPurchaseRecord | null> {
		const result = await sql<InventoryPurchaseRecord>`
			SELECT *
			FROM public.inventory_update_purchase_state(
				${input.purchaseCode},
				${input.userCode},
				${input.state},
				${input.note !== undefined},
				${input.note ?? null}
			)
		`.execute(db);

		return result.rows[0] ?? null;
	}

	static async createSale(
		db: Database,
		input: CreateInventorySaleInput
	): Promise<InventorySaleRecord> {
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

		const result = await sql<InventorySaleRecord>`
			SELECT *
			FROM public.inventory_create_sale(
				${input.productCode},
				${input.branchCode},
				${input.userCode},
				${resolvedCustomer.customer_code},
				${customerName},
				${customerPhone},
				${input.quantity},
				${input.unitPrice},
				${input.saleChannel},
				${input.fulfillmentType},
				${input.shippingState},
				${input.deliveryAddress},
				${input.orderReference},
				${input.soldAt},
				${input.note}
			)
		`.execute(db);

		const sale = result.rows[0];
		if (!sale) {
			throw new Error('No se pudo registrar la venta');
		}

		return sale;
	}

	static async updateSaleShippingState(
		db: Database,
		input: UpdateInventorySaleShippingInput
	): Promise<InventorySaleRecord | null> {
		const result = await sql<InventorySaleRecord>`
			SELECT *
			FROM public.inventory_update_sale_shipping_state(
				${input.saleCode},
				${input.shippingState},
				${input.deliveryAddress !== undefined},
				${input.deliveryAddress ?? null},
				${input.orderReference !== undefined},
				${input.orderReference ?? null}
			)
		`.execute(db);

		return result.rows[0] ?? null;
	}

	static async voidSale(
		db: Database,
		input: VoidInventorySaleInput
	): Promise<InventorySaleRecord | null> {
		const result = await sql<InventorySaleRecord>`
			SELECT *
			FROM public.inventory_void_sale(
				${input.saleCode},
				${input.userCode},
				${input.note ?? null}
			)
		`.execute(db);

		return result.rows[0] ?? null;
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
				FROM public.inventory_sales
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
