import type {
	InventoryMovementDirection,
	InventoryMovementReason,
	InventoryPurchaseOrigin,
	InventoryPurchaseState,
	InventoryStockState
} from '$lib/utils/inventory';

export interface InventoryOverviewItem {
	product_code: string;
	product_name: string;
	sku: string | null;
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

export interface InventoryPurchaseRecord {
	code: string;
	product_code: string;
	branch_code: string;
	user_code: string;
	origin: InventoryPurchaseOrigin;
	quantity: number;
	state: InventoryPurchaseState;
	ordered_at: string | Date;
	received_at: string | Date | null;
	refunded_at: string | Date | null;
	unit_cost: string | null;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventoryPurchaseListItem extends InventoryPurchaseRecord {
	product_name: string;
	product_sku: string | null;
	branch_name: string;
}

export interface InventorySaleRecord {
	code: string;
	product_code: string;
	branch_code: string;
	user_code: string;
	quantity: number;
	customer_name: string;
	customer_phone: string | null;
	sold_at: string | Date;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventorySaleListItem extends InventorySaleRecord {
	product_name: string;
	product_sku: string | null;
	branch_name: string;
}

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
	occurred_at: string | Date;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
	product_name: string;
	product_sku: string | null;
	branch_name: string;
}
