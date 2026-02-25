export const INVENTORY_PURCHASE_ORIGINS = ['temu', 'aliexpress', 'lima', 'other'] as const;
export type InventoryPurchaseOrigin = (typeof INVENTORY_PURCHASE_ORIGINS)[number];

export const INVENTORY_PURCHASE_STATES = ['in_transit', 'received', 'refunded'] as const;
export type InventoryPurchaseState = (typeof INVENTORY_PURCHASE_STATES)[number];

export const INVENTORY_PURCHASE_ENTRY_TYPES = ['initial', 'restock'] as const;
export type InventoryPurchaseEntryType = (typeof INVENTORY_PURCHASE_ENTRY_TYPES)[number];

export const INVENTORY_MOVEMENT_DIRECTIONS = ['in', 'out'] as const;
export type InventoryMovementDirection = (typeof INVENTORY_MOVEMENT_DIRECTIONS)[number];

export const INVENTORY_MOVEMENT_REASONS = [
	'purchase',
	'sale',
	'purchase_refund',
	'manual_adjustment'
] as const;
export type InventoryMovementReason = (typeof INVENTORY_MOVEMENT_REASONS)[number];

export const INVENTORY_SALE_CHANNELS = ['store', 'web'] as const;
export type InventorySaleChannel = (typeof INVENTORY_SALE_CHANNELS)[number];

export const INVENTORY_SALE_FULFILLMENT_TYPES = ['pickup', 'delivery'] as const;
export type InventorySaleFulfillmentType = (typeof INVENTORY_SALE_FULFILLMENT_TYPES)[number];

export const INVENTORY_SALE_SHIPPING_STATES = ['na', 'pending', 'in_transit', 'delivered'] as const;
export type InventorySaleShippingState = (typeof INVENTORY_SALE_SHIPPING_STATES)[number];

export const INVENTORY_SALE_STATUS_FILTERS = ['all', 'active', 'voided'] as const;
export type InventorySaleStatusFilter = (typeof INVENTORY_SALE_STATUS_FILTERS)[number];

export const INVENTORY_STOCK_STATES = [
	'healthy',
	'low',
	'emergency',
	'out_of_stock',
	'in_transit_only'
] as const;
export type InventoryStockState = (typeof INVENTORY_STOCK_STATES)[number];

export const INVENTORY_LIST_FILTER_STATES = [
	'all',
	'healthy',
	'low',
	'emergency',
	'out_of_stock',
	'in_transit_only',
	'critical'
] as const;
export type InventoryListFilterState = (typeof INVENTORY_LIST_FILTER_STATES)[number];

export interface InventoryBranchStateLike {
	code: string;
	state: boolean;
}

export function isValidInventoryPurchaseOrigin(value: string): value is InventoryPurchaseOrigin {
	return INVENTORY_PURCHASE_ORIGINS.includes(value as InventoryPurchaseOrigin);
}

export function isValidInventoryPurchaseState(value: string): value is InventoryPurchaseState {
	return INVENTORY_PURCHASE_STATES.includes(value as InventoryPurchaseState);
}

export function isValidInventoryPurchaseEntryType(
	value: string
): value is InventoryPurchaseEntryType {
	return INVENTORY_PURCHASE_ENTRY_TYPES.includes(value as InventoryPurchaseEntryType);
}

export function isValidInventoryMovementDirection(
	value: string
): value is InventoryMovementDirection {
	return INVENTORY_MOVEMENT_DIRECTIONS.includes(value as InventoryMovementDirection);
}

export function isValidInventoryMovementReason(value: string): value is InventoryMovementReason {
	return INVENTORY_MOVEMENT_REASONS.includes(value as InventoryMovementReason);
}

export function isValidInventorySaleChannel(value: string): value is InventorySaleChannel {
	return INVENTORY_SALE_CHANNELS.includes(value as InventorySaleChannel);
}

export function isValidInventorySaleFulfillmentType(
	value: string
): value is InventorySaleFulfillmentType {
	return INVENTORY_SALE_FULFILLMENT_TYPES.includes(value as InventorySaleFulfillmentType);
}

export function isValidInventorySaleShippingState(
	value: string
): value is InventorySaleShippingState {
	return INVENTORY_SALE_SHIPPING_STATES.includes(value as InventorySaleShippingState);
}

export function isValidInventorySaleStatusFilter(
	value: string
): value is InventorySaleStatusFilter {
	return INVENTORY_SALE_STATUS_FILTERS.includes(value as InventorySaleStatusFilter);
}

export function isValidInventoryListFilterState(value: string): value is InventoryListFilterState {
	return INVENTORY_LIST_FILTER_STATES.includes(value as InventoryListFilterState);
}

export function resolveInventoryBranchCode(
	branches: ReadonlyArray<InventoryBranchStateLike>,
	preferredCode?: string | null
): string {
	const preferred = (preferredCode ?? '').trim();
	if (preferred && branches.some((branch) => branch.code === preferred && branch.state)) {
		return preferred;
	}

	return branches.find((branch) => branch.state)?.code ?? branches[0]?.code ?? '';
}

function normalizeInventoryValue(value: string | null | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

export function normalizeInventoryPurchaseOrigin(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryPurchaseState(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryPurchaseEntryType(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryListFilterState(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryMovementDirection(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryMovementReason(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventorySaleChannel(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventorySaleFulfillmentType(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventorySaleShippingState(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventorySaleStatusFilter(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function canTransitionPurchaseState(
	currentState: InventoryPurchaseState,
	nextState: InventoryPurchaseState
): boolean {
	if (currentState === nextState) return true;
	if (currentState === 'in_transit') {
		return nextState === 'received' || nextState === 'refunded';
	}
	if (currentState === 'received') {
		return nextState === 'refunded';
	}
	return false;
}

export function defaultShippingStateForFulfillment(
	fulfillmentType: InventorySaleFulfillmentType
): InventorySaleShippingState {
	return fulfillmentType === 'delivery' ? 'pending' : 'na';
}

export function canTransitionSaleShippingState(
	currentState: InventorySaleShippingState,
	nextState: InventorySaleShippingState
): boolean {
	if (currentState === nextState) return true;

	if (currentState === 'pending') {
		return nextState === 'in_transit' || nextState === 'delivered';
	}

	if (currentState === 'in_transit') {
		return nextState === 'delivered';
	}

	return false;
}
