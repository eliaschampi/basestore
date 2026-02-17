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
