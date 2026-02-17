export const INVENTORY_PURCHASE_ORIGINS = ['temu', 'aliexpress', 'lima'] as const;
export type InventoryPurchaseOrigin = (typeof INVENTORY_PURCHASE_ORIGINS)[number];

export const INVENTORY_PURCHASE_STATES = ['in_transit', 'received', 'refunded'] as const;
export type InventoryPurchaseState = (typeof INVENTORY_PURCHASE_STATES)[number];

export const INVENTORY_MOVEMENT_DIRECTIONS = ['in', 'out'] as const;
export type InventoryMovementDirection = (typeof INVENTORY_MOVEMENT_DIRECTIONS)[number];

export const INVENTORY_MOVEMENT_REASONS = [
	'purchase',
	'sale',
	'purchase_refund',
	'manual_adjustment'
] as const;
export type InventoryMovementReason = (typeof INVENTORY_MOVEMENT_REASONS)[number];

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

export function isValidInventoryPurchaseOrigin(value: string): value is InventoryPurchaseOrigin {
	return INVENTORY_PURCHASE_ORIGINS.includes(value as InventoryPurchaseOrigin);
}

export function isValidInventoryPurchaseState(value: string): value is InventoryPurchaseState {
	return INVENTORY_PURCHASE_STATES.includes(value as InventoryPurchaseState);
}

export function isValidInventoryMovementDirection(
	value: string
): value is InventoryMovementDirection {
	return INVENTORY_MOVEMENT_DIRECTIONS.includes(value as InventoryMovementDirection);
}

export function isValidInventoryMovementReason(value: string): value is InventoryMovementReason {
	return INVENTORY_MOVEMENT_REASONS.includes(value as InventoryMovementReason);
}

export function isValidInventoryStockState(value: string): value is InventoryStockState {
	return INVENTORY_STOCK_STATES.includes(value as InventoryStockState);
}

export function isValidInventoryListFilterState(value: string): value is InventoryListFilterState {
	return INVENTORY_LIST_FILTER_STATES.includes(value as InventoryListFilterState);
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

export function normalizeInventoryListFilterState(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryMovementDirection(value: string | null | undefined): string {
	return normalizeInventoryValue(value);
}

export function normalizeInventoryMovementReason(value: string | null | undefined): string {
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
