import type { DriveFileType } from '$lib/utils/drive';

export interface ProductOverview {
	code: string;
	name: string;
	description: string | null;
	brand_code: string | null;
	brand_name: string | null;
	category_code: string | null;
	category_name: string | null;
	price: string | null;
	cost_price: string | null;
	sku: string | null;
	is_active: boolean | null;
	has_images: boolean | null;
	images_count: number | null;
	primary_image_url: string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
}

export interface ProductDriveLink {
	link_code: string;
	file_code: string;
	file_name: string;
	file_type: DriveFileType;
	file_size: string | number;
	mime_type: string | null;
	position: number;
	is_primary: boolean;
	linked_at: string;
	file_created_at: string;
	file_updated_at: string;
}

export interface ProductInventorySnapshot {
	product_code: string;
	branch_code: string;
	branch_name: string;
	available: number;
	on_hand: number;
	inbound: number;
	reserved: number;
	reorder_point: number;
	emergency_point: number;
	stock_state: string;
	stock_health_pct: number;
	last_movement_at: string | Date | null;
}

export interface ProductMovementSnapshot {
	code: string;
	branch_code: string;
	branch_name: string;
	direction: string;
	reason: string;
	quantity: number;
	occurred_at: string | Date;
	note: string | null;
}
