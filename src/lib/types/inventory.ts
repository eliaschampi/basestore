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

export interface InventoryPurchaseRecord {
	code: string;
	product_code: string;
	branch_code: string;
	user_code: string;
	origin: InventoryPurchaseOrigin;
	entry_type: InventoryPurchaseEntryType;
	tracking_number: string | null;
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

export interface InventoryCustomerRecord {
	code: string;
	full_name: string;
	phone: string | null;
	is_favorite: boolean;
	note: string | null;
	created_at: string | Date;
	updated_at: string | Date;
}

export interface InventorySaleRecord {
	code: string;
	product_code: string;
	branch_code: string;
	user_code: string;
	customer_code: string | null;
	quantity: number;
	unit_price: string;
	total_amount: string;
	sale_channel: InventorySaleChannel;
	fulfillment_type: InventorySaleFulfillmentType;
	shipping_state: InventorySaleShippingState;
	delivery_address: string | null;
	order_reference: string | null;
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
	customer_full_name: string | null;
	customer_is_favorite: boolean | null;
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
