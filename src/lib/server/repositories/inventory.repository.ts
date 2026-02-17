import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type {
	InventoryMovementListItem,
	InventoryOverviewItem,
	InventoryOverviewSummary,
	InventoryPurchaseListItem,
	InventoryPurchaseRecord,
	InventorySaleListItem,
	InventorySaleRecord
} from '$lib/types/inventory';
import {
	canTransitionPurchaseState,
	type InventoryMovementDirection,
	type InventoryMovementReason,
	type InventoryListFilterState,
	type InventoryPurchaseOrigin,
	type InventoryPurchaseState
} from '$lib/utils/inventory';

export interface InventoryOverviewFilters {
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
	customerName: string;
	customerPhone: string | null;
	soldAt: Date | string;
	note: string | null;
}

export interface UpdateInventoryThresholdsInput {
	productCode: string;
	branchCode: string;
	reorderPoint: number;
	emergencyPoint: number;
}

export interface InventoryPurchaseListFilters {
	branchCode?: string;
	productCode?: string;
	state?: InventoryPurchaseState;
	limit?: number;
}

export interface InventorySaleListFilters {
	branchCode?: string;
	productCode?: string;
	limit?: number;
}

export interface InventoryMovementListFilters {
	branchCode?: string;
	productCode?: string;
	reason?: InventoryMovementReason;
	direction?: InventoryMovementDirection;
	limit?: number;
}

export class InventoryRepository {
	static async listOverview(
		db: Database,
		filters: InventoryOverviewFilters
	): Promise<{ items: InventoryOverviewItem[]; summary: InventoryOverviewSummary }> {
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

		const result = await sql<InventoryOverviewItem>`
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
				io.stock_state
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
				io.product_name ASC
		`.execute(db);

		const items = result.rows;
		const summary = this.buildSummary(items);
		return { items, summary };
	}

	static async listPurchases(
		db: Database,
		filters: InventoryPurchaseListFilters = {}
	): Promise<InventoryPurchaseListItem[]> {
		const limit = Number.isInteger(filters.limit)
			? Math.min(Math.max(Number(filters.limit), 1), 200)
			: 50;
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

		const whereClause = sql.join(predicates, sql` AND `);

		const result = await sql<InventoryPurchaseListItem>`
			SELECT
				ip.code,
				ip.product_code,
				ip.branch_code,
				ip.user_code,
				ip.origin,
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
			LIMIT ${limit}
		`.execute(db);

		return result.rows;
	}

	static async listSales(
		db: Database,
		filters: InventorySaleListFilters = {}
	): Promise<InventorySaleListItem[]> {
		const limit = Number.isInteger(filters.limit)
			? Math.min(Math.max(Number(filters.limit), 1), 200)
			: 50;
		const predicates = [sql`1 = 1`];

		if (filters.branchCode) {
			predicates.push(sql`s.branch_code = ${filters.branchCode}`);
		}

		if (filters.productCode) {
			predicates.push(sql`s.product_code = ${filters.productCode}`);
		}

		const whereClause = sql.join(predicates, sql` AND `);

		const result = await sql<InventorySaleListItem>`
			SELECT
				s.code,
				s.product_code,
				s.branch_code,
				s.user_code,
				s.quantity,
				s.customer_name,
				s.customer_phone,
				s.sold_at,
				s.note,
				s.created_at,
				s.updated_at,
				p.name AS product_name,
				p.sku AS product_sku,
				b.name AS branch_name
			FROM public.inventory_sales s
			INNER JOIN public.products p ON p.code = s.product_code
			INNER JOIN public.branches b ON b.code = s.branch_code
			WHERE ${whereClause}
			ORDER BY s.sold_at DESC, s.created_at DESC
			LIMIT ${limit}
		`.execute(db);

		return result.rows;
	}

	static async listMovements(
		db: Database,
		filters: InventoryMovementListFilters = {}
	): Promise<InventoryMovementListItem[]> {
		const limit = Number.isInteger(filters.limit)
			? Math.min(Math.max(Number(filters.limit), 1), 300)
			: 100;
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
			const saleInsert = await sql<InventorySaleRecord>`
				INSERT INTO public.inventory_sales (
					product_code,
					branch_code,
					user_code,
					quantity,
					customer_name,
					customer_phone,
					sold_at,
					note
				) VALUES (
					${input.productCode},
					${input.branchCode},
					${input.userCode},
					${input.quantity},
					${input.customerName},
					${input.customerPhone},
					${input.soldAt},
					${input.note}
				)
				RETURNING
					code,
					product_code,
					branch_code,
					user_code,
					quantity,
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
					io.stock_state
				FROM public.inventory_overview io
				WHERE io.product_code = ${input.productCode}
					AND io.branch_code = ${input.branchCode}
				LIMIT 1
			`.execute(trx);

			return overview.rows[0] ?? null;
		});
	}

	private static buildSummary(items: InventoryOverviewItem[]): InventoryOverviewSummary {
		const summary: InventoryOverviewSummary = {
			total_products: items.length,
			healthy_count: 0,
			low_count: 0,
			emergency_count: 0,
			out_of_stock_count: 0,
			in_transit_only_count: 0,
			total_available: 0,
			total_inbound: 0
		};

		for (const item of items) {
			summary.total_available += Number(item.available ?? 0);
			summary.total_inbound += Number(item.inbound ?? 0);

			switch (item.stock_state) {
				case 'healthy':
					summary.healthy_count += 1;
					break;
				case 'low':
					summary.low_count += 1;
					break;
				case 'emergency':
					summary.emergency_count += 1;
					break;
				case 'out_of_stock':
					summary.out_of_stock_count += 1;
					break;
				case 'in_transit_only':
					summary.in_transit_only_count += 1;
					break;
			}
		}

		return summary;
	}
}
