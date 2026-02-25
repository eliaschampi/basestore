import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import type {
	ProductDriveLink,
	ProductInventorySnapshot,
	ProductMovementSnapshot,
	ProductOverview
} from '$lib/types/products';

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
			'cost_price',
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
		cost_price: productRow.cost_price,
		sku: productRow.sku,
		is_active: productRow.is_active,
		has_images: productRow.has_images,
		images_count: productRow.images_count,
		primary_image_url: productRow.primary_image_url,
		created_at: productRow.created_at,
		updated_at: productRow.updated_at
	};

	const canReadDrive = await locals.can('drive:read');
	const canReadInventory = await locals.can('inventory:read');
	let linkedFiles: ProductDriveLink[] = [];
	let inventoryByBranch: ProductInventorySnapshot[] = [];
	let inventoryMovements: ProductMovementSnapshot[] = [];

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
				'df.created_at as file_created_at',
				'df.updated_at as file_updated_at'
			])
			.where('dl.product_code', '=', productCode)
			.where('df.scope', '=', 'product_shared')
			.where('df.deleted_at', 'is', null)
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
			position: row.position,
			is_primary: row.is_primary,
			linked_at: toIsoString(row.linked_at),
			file_created_at: toIsoString(row.file_created_at),
			file_updated_at: toIsoString(row.file_updated_at)
		}));
	}

	if (canReadInventory) {
		const [stockRows, movementRows] = await Promise.all([
			locals.db
				.selectFrom('inventory_overview')
				.select([
					'product_code',
					'branch_code',
					'branch_name',
					'available',
					'on_hand',
					'inbound',
					'reserved',
					'reorder_point',
					'emergency_point',
					'stock_state',
					'stock_health_pct',
					'last_movement_at'
				])
				.where('product_code', '=', productCode)
				.orderBy('branch_name', 'asc')
				.execute(),
			locals.db
				.selectFrom('inventory_movement_feed')
				.select([
					'code',
					'branch_code',
					'branch_name',
					'direction',
					'reason',
					'quantity',
					'occurred_at',
					'note'
				])
				.where('product_code', '=', productCode)
				.orderBy('occurred_at', 'desc')
				.limit(80)
				.execute()
		]);

		inventoryByBranch = stockRows.map((row) => ({
			product_code: row.product_code ?? productCode,
			branch_code: row.branch_code ?? '',
			branch_name: row.branch_name ?? 'Sede',
			available: row.available ?? 0,
			on_hand: row.on_hand ?? 0,
			inbound: row.inbound ?? 0,
			reserved: row.reserved ?? 0,
			reorder_point: row.reorder_point ?? 0,
			emergency_point: row.emergency_point ?? 0,
			stock_state: row.stock_state ?? 'healthy',
			stock_health_pct: row.stock_health_pct ?? 100,
			last_movement_at: row.last_movement_at
		}));

		inventoryMovements = movementRows.map((row) => ({
			code: row.code ?? '',
			branch_code: row.branch_code ?? '',
			branch_name: row.branch_name ?? 'Sede',
			direction: row.direction ?? 'in',
			reason: row.reason ?? 'manual_adjustment',
			quantity: row.quantity ?? 0,
			occurred_at: row.occurred_at ?? new Date(),
			note: row.note
		}));
	}

	return {
		title: 'Detalle del producto',
		product,
		linkedFiles,
		canReadDrive,
		canReadInventory,
		inventoryByBranch,
		inventoryMovements
	};
};
