import type {
	InventoryMovementDirection,
	InventoryMovementReason,
	InventoryPurchaseEntryType,
	InventoryPurchaseOrigin,
	InventoryPurchaseState,
	InventorySaleChannel,
	InventorySaleFulfillmentType,
	InventorySaleShippingState,
	InventoryStockState
} from '$lib/utils/inventory';

export interface InventoryPagination {
	page: number;
	page_size: number;
	total: number;
	total_pages: number;
}

/** Lightweight branch representation used in inventory list page filters. */
export interface BranchCatalogItem {
	code: string;
	name: string;
	state: boolean;
}

/** Returns an empty pagination object for the given page size (default 20). */
export function createEmptyPagination(pageSize = 20): InventoryPagination {
	return { page: 1, page_size: pageSize, total: 0, total_pages: 1 };
}

export interface InventoryOverviewItem {
	product_code: string;
	product_name: string;
	sku: string | null;
	price: string;
	cost_price: string;
	product_is_active: boolean;
	category_code: string | null;
	category_name: string | null;
	branch_code: string;
	branch_name: string;
	on_hand: number;
	reserved: number;
	available: number;
	inbound: number;
	reorder_point: number;
	emergency_point: number;
	last_movement_at: string | Date | null;
	created_at: string | Date;
	updated_at: string | Date;
	stock_state: InventoryStockState;
	stock_health_pct: number;
	awaiting_first_stock: boolean;
}

export interface InventoryOverviewSummary {
	total_products: number;
	healthy_count: number;
	low_count: number;
	emergency_count: number;
	out_of_stock_count: number;
	in_transit_only_count: number;
	total_available: number;
	total_inbound: number;
}

export interface InventoryPurchaseLineItem {
	code: string;
	purchase_code: string;
	product_code: string;
	product_name: string;
	product_sku: string | null;
	quantity: number;
	unit_cost: string | null;
	total_amount: string;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventoryPurchaseRecord {
	code: string;
	branch_code: string;
	user_code: string;
	origin: InventoryPurchaseOrigin;
	entry_type: InventoryPurchaseEntryType;
	tracking_number: string | null;
	state: InventoryPurchaseState;
	ordered_at: string | Date;
	received_at: string | Date | null;
	refunded_at: string | Date | null;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	item_count: number;
	total_quantity: number;
	total_amount: string;
	products_summary: string;
	primary_product_code: string | null;
	primary_product_name: string | null;
	primary_product_sku: string | null;
	items: InventoryPurchaseLineItem[];
	branch_name: string;
	can_refund: boolean;
}

export type InventoryPurchaseListItem = InventoryPurchaseRecord;

export interface InventoryCustomerRecord {
	code: string;
	full_name: string;
	phone: string | null;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventorySaleLineItem {
	code: string;
	sale_code: string;
	product_code: string;
	product_name: string;
	product_sku: string | null;
	quantity: number;
	unit_price: string;
	unit_cost: string;
	total_amount: string;
	profit_amount: string;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventorySaleRecord {
	code: string;
	branch_code: string;
	user_code: string;
	customer_code: string | null;
	sale_channel: InventorySaleChannel;
	fulfillment_type: InventorySaleFulfillmentType;
	shipping_state: InventorySaleShippingState;
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
	item_count: number;
	total_quantity: number;
	total_amount: string;
	profit_amount: string;
	products_summary: string;
	primary_product_code: string | null;
	primary_product_name: string | null;
	primary_product_sku: string | null;
	items: InventorySaleLineItem[];
	branch_name: string;
	customer_full_name: string | null;
	voided_by_name: string | null;
}

export type InventorySaleListItem = InventorySaleRecord;

export interface InventoryProductTransferLineItem {
	code: string;
	transfer_code: string;
	product_code: string;
	product_name: string;
	product_sku: string | null;
	quantity: number;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventoryProductTransferRecord {
	code: string;
	source_branch_code: string;
	destination_branch_code: string;
	user_code: string;
	transferred_at: string | Date;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	item_count: number;
	total_quantity: number;
	products_summary: string;
	primary_product_code: string | null;
	primary_product_name: string | null;
	primary_product_sku: string | null;
	items: InventoryProductTransferLineItem[];
	source_branch_name: string;
	destination_branch_name: string;
}

export type InventoryProductTransferListItem = InventoryProductTransferRecord;

export interface InventoryMovementListItem {
	code: string;
	product_code: string;
	branch_code: string;
	user_code: string;
	quantity: number;
	direction: InventoryMovementDirection;
	reason: InventoryMovementReason;
	purchase_code: string | null;
	sale_code: string | null;
	transfer_code: string | null;
	occurred_at: string | Date;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	product_name: string;
	product_sku: string | null;
	branch_name: string;
}
