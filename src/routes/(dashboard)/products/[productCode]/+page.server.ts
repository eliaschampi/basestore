import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import type { ProductDriveLink, ProductOverview } from '$lib/types/products';

function toIsoString(value: Date | string): string {
	return typeof value === 'string' ? value : value.toISOString();
}

function normalizeDriveFileType(value: string): ProductDriveLink['file_type'] {
	switch (value) {
		case 'dir':
		case 'img':
		case 'vid':
		case 'aud':
		case 'doc':
		case 'zip':
			return value;
		default:
			return 'otr';
	}
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	const productCode = (params.productCode || '').trim();
	depends(`products:detail:${productCode}`);

	if (!(await locals.can('products:read'))) {
		throw error(403, 'No tienes permisos para ver productos');
	}

	if (!isUuid(productCode)) {
		throw error(404, 'Producto no encontrado');
	}

	const productRow = await locals.db
		.selectFrom('products_overview')
		.select([
			'code',
			'name',
			'description',
			'brand_code',
			'brand_name',
			'category_code',
			'category_name',
			'price',
			'sku',
			'is_active',
			'has_images',
			'images_count',
			'primary_image_url',
			'created_at',
			'updated_at'
		])
		.where('code', '=', productCode)
		.executeTakeFirst();

	if (!productRow?.code || !productRow.name) {
		throw error(404, 'Producto no encontrado');
	}

	const product: ProductOverview = {
		code: productRow.code,
		name: productRow.name,
		description: productRow.description,
		brand_code: productRow.brand_code,
		brand_name: productRow.brand_name,
		category_code: productRow.category_code,
		category_name: productRow.category_name,
		price: productRow.price,
		sku: productRow.sku,
		is_active: productRow.is_active,
		has_images: productRow.has_images,
		images_count: productRow.images_count,
		primary_image_url: productRow.primary_image_url,
		created_at: productRow.created_at,
		updated_at: productRow.updated_at
	};

	const canReadDrive = await locals.can('drive:read');
	let linkedFiles: ProductDriveLink[] = [];

	if (canReadDrive) {
		const linkRows = await locals.db
			.selectFrom('drive_links as dl')
			.innerJoin('drive_files as df', 'df.code', 'dl.file_code')
			.select([
				'dl.code as link_code',
				'dl.file_code',
				'dl.position',
				'dl.is_primary',
				'dl.created_at as linked_at',
				'df.name as file_name',
				'df.type as file_type',
				'df.size as file_size',
				'df.mime_type',
				'df.storage_path',
				'df.created_at as file_created_at',
				'df.updated_at as file_updated_at'
			])
			.where('dl.entity_type', '=', 'product')
			.where('dl.entity_code', '=', productCode)
			.where('df.scope', '=', 'product_shared')
			.where('df.is_trashed', '=', false)
			.orderBy('dl.is_primary', 'desc')
			.orderBy('dl.position', 'asc')
			.orderBy('dl.created_at', 'asc')
			.execute();

		linkedFiles = linkRows.map((row) => ({
			link_code: row.link_code,
			file_code: row.file_code,
			file_name: row.file_name,
			file_type: normalizeDriveFileType(row.file_type),
			file_size: row.file_size,
			mime_type: row.mime_type,
			storage_path: row.storage_path,
			position: row.position,
			is_primary: row.is_primary,
			linked_at: toIsoString(row.linked_at),
			file_created_at: toIsoString(row.file_created_at),
			file_updated_at: toIsoString(row.file_updated_at)
		}));
	}

	return {
		title: `Producto · ${product.name}`,
		product,
		linkedFiles,
		canReadDrive
	};
};
