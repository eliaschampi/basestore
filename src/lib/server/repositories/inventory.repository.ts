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
import {
	canTransitionPurchaseState,
	canTransitionSaleShippingState,
	type InventoryListFilterState,
	type InventoryMovementDirection,
	type InventoryMovementReason,
	type InventoryPurchaseEntryType,
	type InventoryPurchaseOrigin,
	type InventoryPurchaseState,
	type InventorySaleChannel,
	type InventorySaleFulfillmentType,
	type InventorySaleShippingState
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
	markCustomerFavorite?: boolean;
	soldAt: Date | string;
	note: string | null;
}

export interface UpdateInventorySaleShippingInput {
	saleCode: string;
	shippingState: InventorySaleShippingState;
	deliveryAddress?: string | null;
	orderReference?: string | null;
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
	search?: string;
}

export interface InventoryCustomerListFilters extends PaginationParams {
	search?: string;
	favoritesOnly?: boolean;
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
	isFavorite?: boolean;
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

interface CountRow {
	total: number | string;
}

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

export class InventoryRepository {
	static async listOverview(
		db: Database,
		filters: InventoryOverviewFilters
	): Promise<{
		items: InventoryOverviewItem[];
		summary: InventoryOverviewSummary;
		pagination: InventoryPagination;
	}> {
		const { page, pageSize, offset } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 120
		});

		const predicates = [sql`1 = 1`];

		if (filters.branchCode) {
			predicates.push(sql`io.branch_code = ${filters.branchCode}`);
		}

		if (filters.categoryCode) {
			predicates.push(sql`io.category_code = ${filters.categoryCode}`);
		}

		if (filters.search) {
			const searchTerm = `%${filters.search}%`;
			predicates.push(
				sql`(io.product_name ILIKE ${searchTerm} OR COALESCE(io.sku, '') ILIKE ${searchTerm})`
			);
		}

		if (!filters.includeInactive) {
			predicates.push(sql`io.product_is_active = true`);
		}

		switch (filters.stock) {
			case 'healthy':
			case 'low':
			case 'emergency':
			case 'out_of_stock':
			case 'in_transit_only':
				predicates.push(sql`io.stock_state = ${filters.stock}`);
				break;
			case 'critical':
				predicates.push(sql`io.stock_state IN ('out_of_stock', 'emergency')`);
				break;
			case 'all':
			default:
				break;
		}

		const whereClause = sql.join(predicates, sql` AND `);
		const [countResult, summaryResult, rowsResult] = await Promise.all([
			sql<CountRow>`
				SELECT COUNT(*)::int AS total
				FROM public.inventory_overview io
				WHERE ${whereClause}
			`.execute(db),
			sql<InventoryOverviewSummaryRow>`
				SELECT
					COUNT(*)::int AS total_products,
					COUNT(*) FILTER (WHERE io.stock_state = 'healthy')::int AS healthy_count,
					COUNT(*) FILTER (WHERE io.stock_state = 'low')::int AS low_count,
					COUNT(*) FILTER (WHERE io.stock_state = 'emergency')::int AS emergency_count,
					COUNT(*) FILTER (WHERE io.stock_state = 'out_of_stock')::int AS out_of_stock_count,
					COUNT(*) FILTER (WHERE io.stock_state = 'in_transit_only')::int AS in_transit_only_count,
					COALESCE(SUM(io.available), 0)::int AS total_available,
					COALESCE(SUM(io.inbound), 0)::int AS total_inbound
				FROM public.inventory_overview io
				WHERE ${whereClause}
			`.execute(db),
			sql<InventoryOverviewItem>`
				SELECT
					io.product_code,
					io.product_name,
					io.sku,
					io.product_is_active,
					io.category_code,
					io.category_name,
					io.branch_code,
					io.branch_name,
					io.on_hand,
					io.reserved,
					io.available,
					io.inbound,
					io.reorder_point,
					io.emergency_point,
					io.last_movement_at,
					io.created_at,
					io.updated_at,
					io.stock_state,
					io.stock_health_pct,
					io.awaiting_first_stock
				FROM public.inventory_overview io
				WHERE ${whereClause}
				ORDER BY
					CASE io.stock_state
						WHEN 'out_of_stock' THEN 1
						WHEN 'emergency' THEN 2
						WHEN 'low' THEN 3
						WHEN 'in_transit_only' THEN 4
						ELSE 5
					END,
					io.product_name ASC,
					io.branch_name ASC
				LIMIT ${pageSize}
				OFFSET ${offset}
			`.execute(db)
		]);

		const countRow = countResult.rows[0];
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

		return {
			items: rowsResult.rows,
			summary,
			pagination: toPagination(toNumber(countRow?.total), page, pageSize)
		};
	}

	static async listPurchases(
		db: Database,
		filters: InventoryPurchaseListFilters = {}
	): Promise<PagedListResult<InventoryPurchaseListItem>> {
		const { page, pageSize, offset } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 120
		});

		const predicates = [sql`1 = 1`];

		if (filters.branchCode) {
			predicates.push(sql`ip.branch_code = ${filters.branchCode}`);
		}

		if (filters.productCode) {
			predicates.push(sql`ip.product_code = ${filters.productCode}`);
		}

		if (filters.state) {
			predicates.push(sql`ip.state = ${filters.state}`);
		}

		if (filters.origin) {
			predicates.push(sql`ip.origin = ${filters.origin}`);
		}

		if (filters.entryType) {
			predicates.push(sql`ip.entry_type = ${filters.entryType}`);
		}

		if (filters.search) {
			const searchTerm = `%${filters.search}%`;
			predicates.push(
				sql`(
					p.name ILIKE ${searchTerm}
					OR COALESCE(p.sku, '') ILIKE ${searchTerm}
					OR COALESCE(ip.tracking_number, '') ILIKE ${searchTerm}
				)`
			);
		}

		const whereClause = sql.join(predicates, sql` AND `);
		const [countResult, rowsResult] = await Promise.all([
			sql<CountRow>`
				SELECT COUNT(*)::int AS total
				FROM public.inventory_purchases ip
				INNER JOIN public.products p ON p.code = ip.product_code
				WHERE ${whereClause}
			`.execute(db),
			sql<InventoryPurchaseListItem>`
				SELECT
					ip.code,
					ip.product_code,
					ip.branch_code,
					ip.user_code,
					ip.origin,
					ip.entry_type,
					ip.tracking_number,
					ip.quantity,
					ip.state,
					ip.ordered_at,
					ip.received_at,
					ip.refunded_at,
					ip.unit_cost,
					ip.note,
					ip.created_at,
					ip.updated_at,
					p.name AS product_name,
					p.sku AS product_sku,
					b.name AS branch_name
				FROM public.inventory_purchases ip
				INNER JOIN public.products p ON p.code = ip.product_code
				INNER JOIN public.branches b ON b.code = ip.branch_code
				WHERE ${whereClause}
				ORDER BY ip.ordered_at DESC, ip.created_at DESC
				LIMIT ${pageSize}
				OFFSET ${offset}
			`.execute(db)
		]);

		return {
			items: rowsResult.rows,
			pagination: toPagination(toNumber(countResult.rows[0]?.total), page, pageSize)
		};
	}

	static async listSales(
		db: Database,
		filters: InventorySaleListFilters = {}
	): Promise<PagedListResult<InventorySaleListItem>> {
		const { page, pageSize, offset } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 120
		});

		const predicates = [sql`1 = 1`];

		if (filters.branchCode) {
			predicates.push(sql`s.branch_code = ${filters.branchCode}`);
		}

		if (filters.productCode) {
			predicates.push(sql`s.product_code = ${filters.productCode}`);
		}

		if (filters.customerCode) {
			predicates.push(sql`s.customer_code = ${filters.customerCode}`);
		}

		if (filters.shippingState) {
			predicates.push(sql`s.shipping_state = ${filters.shippingState}`);
		}

		if (filters.saleChannel) {
			predicates.push(sql`s.sale_channel = ${filters.saleChannel}`);
		}

		if (filters.search) {
			const searchTerm = `%${filters.search}%`;
			predicates.push(
				sql`(
					p.name ILIKE ${searchTerm}
					OR COALESCE(p.sku, '') ILIKE ${searchTerm}
					OR s.customer_name ILIKE ${searchTerm}
					OR COALESCE(s.customer_phone, '') ILIKE ${searchTerm}
					OR COALESCE(s.order_reference, '') ILIKE ${searchTerm}
				)`
			);
		}

		const whereClause = sql.join(predicates, sql` AND `);
		const [countResult, rowsResult] = await Promise.all([
			sql<CountRow>`
				SELECT COUNT(*)::int AS total
				FROM public.inventory_sales s
				INNER JOIN public.products p ON p.code = s.product_code
				WHERE ${whereClause}
			`.execute(db),
			sql<InventorySaleListItem>`
				SELECT
					s.code,
					s.product_code,
					s.branch_code,
					s.user_code,
					s.customer_code,
					s.quantity,
					s.unit_price,
					s.total_amount,
					s.sale_channel,
					s.fulfillment_type,
					s.shipping_state,
					s.delivery_address,
					s.order_reference,
					s.customer_name,
					s.customer_phone,
					s.sold_at,
					s.note,
					s.created_at,
					s.updated_at,
					p.name AS product_name,
					p.sku AS product_sku,
					b.name AS branch_name,
					c.full_name AS customer_full_name,
					c.is_favorite AS customer_is_favorite
				FROM public.inventory_sales s
				INNER JOIN public.products p ON p.code = s.product_code
				INNER JOIN public.branches b ON b.code = s.branch_code
				LEFT JOIN public.inventory_customers c ON c.code = s.customer_code
				WHERE ${whereClause}
				ORDER BY s.sold_at DESC, s.created_at DESC
				LIMIT ${pageSize}
				OFFSET ${offset}
			`.execute(db)
		]);

		return {
			items: rowsResult.rows,
			pagination: toPagination(toNumber(countResult.rows[0]?.total), page, pageSize)
		};
	}

	static async listCustomers(
		db: Database,
		filters: InventoryCustomerListFilters = {}
	): Promise<PagedListResult<InventoryCustomerRecord>> {
		const { page, pageSize, offset } = normalizePagination({
			page: filters.page,
			pageSize: filters.pageSize,
			maxPageSize: 100
		});

		const predicates = [sql`1 = 1`];

		if (filters.favoritesOnly) {
			predicates.push(sql`c.is_favorite = true`);
		}

		if (filters.search) {
			const searchTerm = `%${filters.search}%`;
			predicates.push(
				sql`(
					c.full_name ILIKE ${searchTerm}
					OR COALESCE(c.phone, '') ILIKE ${searchTerm}
				)`
			);
		}

		const whereClause = sql.join(predicates, sql` AND `);
		const [countResult, rowsResult] = await Promise.all([
			sql<CountRow>`
				SELECT COUNT(*)::int AS total
				FROM public.inventory_customers c
				WHERE ${whereClause}
			`.execute(db),
			sql<InventoryCustomerRecord>`
				SELECT
					c.code,
					c.full_name,
					c.phone,
					c.is_favorite,
					c.note,
					c.created_at,
					c.updated_at
				FROM public.inventory_customers c
				WHERE ${whereClause}
				ORDER BY c.is_favorite DESC, c.updated_at DESC, c.full_name ASC
				LIMIT ${pageSize}
				OFFSET ${offset}
			`.execute(db)
		]);

		return {
			items: rowsResult.rows,
			pagination: toPagination(toNumber(countResult.rows[0]?.total), page, pageSize)
		};
	}

	static async listMovements(
		db: Database,
		filters: InventoryMovementListFilters = {}
	): Promise<InventoryMovementListItem[]> {
		const limit = Number.isInteger(filters.limit)
			? Math.min(Math.max(Number(filters.limit), 1), 300)
			: 120;
		const predicates = [sql`1 = 1`];

		if (filters.branchCode) {
			predicates.push(sql`m.branch_code = ${filters.branchCode}`);
		}

		if (filters.productCode) {
			predicates.push(sql`m.product_code = ${filters.productCode}`);
		}

		if (filters.reason) {
			predicates.push(sql`m.reason = ${filters.reason}`);
		}

		if (filters.direction) {
			predicates.push(sql`m.direction = ${filters.direction}`);
		}

		const whereClause = sql.join(predicates, sql` AND `);
		const result = await sql<InventoryMovementListItem>`
			SELECT
				m.code,
				m.product_code,
				m.branch_code,
				m.user_code,
				m.quantity,
				m.direction,
				m.reason,
				m.purchase_code,
				m.sale_code,
				m.occurred_at,
				m.note,
				m.created_at,
				m.updated_at,
				p.name AS product_name,
				p.sku AS product_sku,
				b.name AS branch_name
			FROM public.inventory_movements m
			INNER JOIN public.products p ON p.code = m.product_code
			INNER JOIN public.branches b ON b.code = m.branch_code
			WHERE ${whereClause}
			ORDER BY m.occurred_at DESC, m.created_at DESC
			LIMIT ${limit}
		`.execute(db);

		return result.rows;
	}

	static async createPurchase(
		db: Database,
		input: CreateInventoryPurchaseInput
	): Promise<InventoryPurchaseRecord> {
		return db.transaction().execute(async (trx) => {
			const now = new Date();
			const receivedAt = input.state === 'received' ? now : null;
			const refundedAt = input.state === 'refunded' ? now : null;

			const purchaseInsert = await sql<InventoryPurchaseRecord>`
				INSERT INTO public.inventory_purchases (
					product_code,
					branch_code,
					user_code,
					origin,
					entry_type,
					tracking_number,
					quantity,
					state,
					ordered_at,
					received_at,
					refunded_at,
					unit_cost,
					note
				) VALUES (
					${input.productCode},
					${input.branchCode},
					${input.userCode},
					${input.origin},
					${input.entryType},
					${input.trackingNumber},
					${input.quantity},
					${input.state},
					${input.orderedAt},
					${receivedAt},
					${refundedAt},
					${input.unitCost},
					${input.note}
				)
				RETURNING
					code,
					product_code,
					branch_code,
					user_code,
					origin,
					entry_type,
					tracking_number,
					quantity,
					state,
					ordered_at,
					received_at,
					refunded_at,
					unit_cost,
					note,
					created_at,
					updated_at
			`.execute(trx);

			const purchase = purchaseInsert.rows[0];
			if (!purchase) {
				throw new Error('No se pudo crear la compra');
			}

			if (input.state === 'received') {
				await sql`
					INSERT INTO public.inventory_movements (
						product_code,
						branch_code,
						user_code,
						quantity,
						direction,
						reason,
						purchase_code,
						sale_code,
						occurred_at,
						note
					) VALUES (
						${input.productCode},
						${input.branchCode},
						${input.userCode},
						${input.quantity},
						'in',
						'purchase',
						${purchase.code},
						NULL,
						${receivedAt ?? now},
						${input.note}
					)
				`.execute(trx);
			}

			return purchase;
		});
	}

	static async updatePurchaseState(
		db: Database,
		input: UpdateInventoryPurchaseStateInput
	): Promise<InventoryPurchaseRecord | null> {
		return db.transaction().execute(async (trx) => {
			const purchaseQuery = await sql<InventoryPurchaseRecord>`
				SELECT
					code,
					product_code,
					branch_code,
					user_code,
					origin,
					entry_type,
					tracking_number,
					quantity,
					state,
					ordered_at,
					received_at,
					refunded_at,
					unit_cost,
					note,
					created_at,
					updated_at
				FROM public.inventory_purchases
				WHERE code = ${input.purchaseCode}
				LIMIT 1
			`.execute(trx);

			const purchase = purchaseQuery.rows[0];
			if (!purchase) {
				return null;
			}

			if (!canTransitionPurchaseState(purchase.state, input.state)) {
				throw new Error('Transición de estado inválida para esta compra');
			}

			const now = new Date();
			const nextNote = input.note === undefined ? purchase.note : input.note;
			let nextReceivedAt = purchase.received_at;
			let nextRefundedAt = purchase.refunded_at;

			if (purchase.state !== input.state) {
				if (purchase.state === 'in_transit' && input.state === 'received') {
					nextReceivedAt = now;
					nextRefundedAt = null;

					await sql`
						INSERT INTO public.inventory_movements (
							product_code,
							branch_code,
							user_code,
							quantity,
							direction,
							reason,
							purchase_code,
							sale_code,
							occurred_at,
							note
						) VALUES (
							${purchase.product_code},
							${purchase.branch_code},
							${input.userCode},
							${purchase.quantity},
							'in',
							'purchase',
							${purchase.code},
							NULL,
							${now},
							${nextNote}
						)
					`.execute(trx);
				}

				if (purchase.state === 'in_transit' && input.state === 'refunded') {
					nextReceivedAt = null;
					nextRefundedAt = now;
				}

				if (purchase.state === 'received' && input.state === 'refunded') {
					nextRefundedAt = now;
					await sql`
						INSERT INTO public.inventory_movements (
							product_code,
							branch_code,
							user_code,
							quantity,
							direction,
							reason,
							purchase_code,
							sale_code,
							occurred_at,
							note
						) VALUES (
							${purchase.product_code},
							${purchase.branch_code},
							${input.userCode},
							${purchase.quantity},
							'out',
							'purchase_refund',
							${purchase.code},
							NULL,
							${now},
							${nextNote}
						)
					`.execute(trx);
				}
			}

			const purchaseUpdate = await sql<InventoryPurchaseRecord>`
				UPDATE public.inventory_purchases
				SET
					state = ${input.state},
					received_at = ${nextReceivedAt},
					refunded_at = ${nextRefundedAt},
					note = ${nextNote}
				WHERE code = ${purchase.code}
				RETURNING
					code,
					product_code,
					branch_code,
					user_code,
					origin,
					entry_type,
					tracking_number,
					quantity,
					state,
					ordered_at,
					received_at,
					refunded_at,
					unit_cost,
					note,
					created_at,
					updated_at
			`.execute(trx);

			return purchaseUpdate.rows[0] ?? null;
		});
	}

	static async createSale(
		db: Database,
		input: CreateInventorySaleInput
	): Promise<InventorySaleRecord> {
		return db.transaction().execute(async (trx) => {
			const resolvedCustomer = await this.resolveSaleCustomer(trx, {
				customerCode: input.customerCode,
				customerName: input.customerName,
				customerPhone: input.customerPhone,
				markFavorite: input.markCustomerFavorite ?? false
			});

			const saleInsert = await sql<InventorySaleRecord>`
				INSERT INTO public.inventory_sales (
					product_code,
					branch_code,
					user_code,
					customer_code,
					quantity,
					unit_price,
					sale_channel,
					fulfillment_type,
					shipping_state,
					delivery_address,
					order_reference,
					customer_name,
					customer_phone,
					sold_at,
					note
				) VALUES (
					${input.productCode},
					${input.branchCode},
					${input.userCode},
					${resolvedCustomer.customer_code},
					${input.quantity},
					${input.unitPrice},
					${input.saleChannel},
					${input.fulfillmentType},
					${input.shippingState},
					${input.deliveryAddress},
					${input.orderReference},
					${resolvedCustomer.customer_name},
					${resolvedCustomer.customer_phone},
					${input.soldAt},
					${input.note}
				)
				RETURNING
					code,
					product_code,
					branch_code,
					user_code,
					customer_code,
					quantity,
					unit_price,
					total_amount,
					sale_channel,
					fulfillment_type,
					shipping_state,
					delivery_address,
					order_reference,
					customer_name,
					customer_phone,
					sold_at,
					note,
					created_at,
					updated_at
			`.execute(trx);

			const sale = saleInsert.rows[0];
			if (!sale) {
				throw new Error('No se pudo registrar la venta');
			}

			await sql`
				INSERT INTO public.inventory_movements (
					product_code,
					branch_code,
					user_code,
					quantity,
					direction,
					reason,
					purchase_code,
					sale_code,
					occurred_at,
					note
				) VALUES (
					${input.productCode},
					${input.branchCode},
					${input.userCode},
					${input.quantity},
					'out',
					'sale',
					NULL,
					${sale.code},
					${input.soldAt},
					${input.note}
				)
			`.execute(trx);

			return sale;
		});
	}

	static async updateSaleShippingState(
		db: Database,
		input: UpdateInventorySaleShippingInput
	): Promise<InventorySaleRecord | null> {
		return db.transaction().execute(async (trx) => {
			const saleQuery = await sql<InventorySaleRecord>`
				SELECT
					code,
					product_code,
					branch_code,
					user_code,
					customer_code,
					quantity,
					unit_price,
					total_amount,
					sale_channel,
					fulfillment_type,
					shipping_state,
					delivery_address,
					order_reference,
					customer_name,
					customer_phone,
					sold_at,
					note,
					created_at,
					updated_at
				FROM public.inventory_sales
				WHERE code = ${input.saleCode}
				LIMIT 1
			`.execute(trx);

			const sale = saleQuery.rows[0];
			if (!sale) {
				return null;
			}

			if (sale.fulfillment_type === 'pickup') {
				if (input.shippingState !== 'na') {
					throw new Error('Los pedidos en tienda no pueden tener estado de envío');
				}
			} else if (!canTransitionSaleShippingState(sale.shipping_state, input.shippingState)) {
				throw new Error('Transición de estado de envío inválida');
			}

			const nextDeliveryAddress =
				input.deliveryAddress === undefined ? sale.delivery_address : input.deliveryAddress;
			const nextOrderReference =
				input.orderReference === undefined ? sale.order_reference : input.orderReference;

			const updateResult = await sql<InventorySaleRecord>`
				UPDATE public.inventory_sales
				SET
					shipping_state = ${input.shippingState},
					delivery_address = ${nextDeliveryAddress},
					order_reference = ${nextOrderReference}
				WHERE code = ${input.saleCode}
				RETURNING
					code,
					product_code,
					branch_code,
					user_code,
					customer_code,
					quantity,
					unit_price,
					total_amount,
					sale_channel,
					fulfillment_type,
					shipping_state,
					delivery_address,
					order_reference,
					customer_name,
					customer_phone,
					sold_at,
					note,
					created_at,
					updated_at
			`.execute(trx);

			return updateResult.rows[0] ?? null;
		});
	}

	static async createCustomer(
		db: Database,
		input: CreateInventoryCustomerInput
	): Promise<InventoryCustomerRecord> {
		const insertResult = await sql<InventoryCustomerRecord>`
			INSERT INTO public.inventory_customers (
				full_name,
				phone,
				is_favorite,
				note
			) VALUES (
				${input.fullName},
				${input.phone ?? null},
				${input.isFavorite === true},
				${input.note ?? null}
			)
			RETURNING
				code,
				full_name,
				phone,
				is_favorite,
				note,
				created_at,
				updated_at
		`.execute(db);

		const customer = insertResult.rows[0];
		if (!customer) {
			throw new Error('No se pudo crear el cliente');
		}

		return customer;
	}

	static async updateCustomerFavorite(
		db: Database,
		customerCode: string,
		isFavorite: boolean
	): Promise<InventoryCustomerRecord | null> {
		const result = await sql<InventoryCustomerRecord>`
			UPDATE public.inventory_customers
			SET is_favorite = ${isFavorite}
			WHERE code = ${customerCode}
			RETURNING
				code,
				full_name,
				phone,
				is_favorite,
				note,
				created_at,
				updated_at
		`.execute(db);

		return result.rows[0] ?? null;
	}

	static async updateThresholds(
		db: Database,
		input: UpdateInventoryThresholdsInput
	): Promise<InventoryOverviewItem | null> {
		return db.transaction().execute(async (trx) => {
			await sql`
				INSERT INTO public.inventory_balances (product_code, branch_code)
				VALUES (${input.productCode}, ${input.branchCode})
				ON CONFLICT (product_code, branch_code) DO NOTHING
			`.execute(trx);

			await sql`
				UPDATE public.inventory_balances
				SET
					reorder_point = ${input.reorderPoint},
					emergency_point = ${input.emergencyPoint}
				WHERE product_code = ${input.productCode}
					AND branch_code = ${input.branchCode}
			`.execute(trx);

			const overview = await sql<InventoryOverviewItem>`
				SELECT
					io.product_code,
					io.product_name,
					io.sku,
					io.product_is_active,
					io.category_code,
					io.category_name,
					io.branch_code,
					io.branch_name,
					io.on_hand,
					io.reserved,
					io.available,
					io.inbound,
					io.reorder_point,
					io.emergency_point,
					io.last_movement_at,
					io.created_at,
					io.updated_at,
					io.stock_state,
					io.stock_health_pct,
					io.awaiting_first_stock
				FROM public.inventory_overview io
				WHERE io.product_code = ${input.productCode}
					AND io.branch_code = ${input.branchCode}
				LIMIT 1
			`.execute(trx);

			return overview.rows[0] ?? null;
		});
	}

	private static async resolveSaleCustomer(
		db: Database,
		input: {
			customerCode?: string | null;
			customerName?: string | null;
			customerPhone?: string | null;
			markFavorite: boolean;
		}
	): Promise<{
		customer_code: string | null;
		customer_name: string;
		customer_phone: string | null;
	}> {
		if (input.customerCode) {
			const result = await sql<InventoryCustomerRecord>`
				SELECT
					code,
					full_name,
					phone,
					is_favorite,
					note,
					created_at,
					updated_at
				FROM public.inventory_customers
				WHERE code = ${input.customerCode}
				LIMIT 1
			`.execute(db);

			const customer = result.rows[0];
			if (!customer) {
				throw new Error('Cliente no encontrado');
			}

			if (input.markFavorite && !customer.is_favorite) {
				await sql`
					UPDATE public.inventory_customers
					SET is_favorite = true
					WHERE code = ${customer.code}
				`.execute(db);
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
			SELECT
				code,
				full_name,
				phone,
				is_favorite,
				note,
				created_at,
				updated_at
			FROM public.inventory_customers
			WHERE lower(full_name) = lower(${customerName})
				AND COALESCE(phone, '') = COALESCE(${customerPhone}, '')
			LIMIT 1
		`.execute(db);

		let customer = existingResult.rows[0];
		if (!customer) {
			const created = await this.createCustomer(db, {
				fullName: customerName,
				phone: customerPhone,
				isFavorite: input.markFavorite
			});
			customer = created;
		} else if (input.markFavorite && !customer.is_favorite) {
			const updated = await this.updateCustomerFavorite(db, customer.code, true);
			if (updated) {
				customer = updated;
			}
		}

		return {
			customer_code: customer.code,
			customer_name: customer.full_name,
			customer_phone: customer.phone
		};
	}
}
