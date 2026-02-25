import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	InventoryRepository,
	type CreateInventorySaleItemInput
} from '$lib/server/repositories/inventory.repository';
import {
	defaultShippingStateForFulfillment,
	isValidInventorySaleChannel,
	isValidInventorySaleFulfillmentType,
	isValidInventorySaleStatusFilter,
	isValidInventorySaleShippingState,
	normalizeInventorySaleChannel,
	normalizeInventorySaleFulfillmentType,
	normalizeInventorySaleStatusFilter,
	normalizeInventorySaleShippingState,
	type InventorySaleChannel,
	type InventorySaleFulfillmentType,
	type InventorySaleStatusFilter,
	type InventorySaleShippingState
} from '$lib/utils/inventory';
import {
	readInventoryPagination,
	readOptionalUuidSearchParam,
	readRequiredUuidSearchParam
} from '$lib/server/inventory/api-query';
import { isUuid } from '$lib/utils/validation';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface SaleItemBody {
	product_code?: string;
	quantity?: number | string;
	unit_price?: number | string;
}

interface CreateSaleBody {
	branch_code?: string;
	customer_code?: string;
	sale_channel?: string;
	fulfillment_type?: string;
	shipping_state?: string;
	delivery_address?: string;
	order_reference?: string;
	customer_name?: string;
	customer_phone?: string;
	sold_at?: string;
	note?: string;
	items?: SaleItemBody[];
}

function parseDateOnlyAsUtcNoon(value: string): Date | null {
	const match = DATE_ONLY_PATTERN.exec(value);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day
	) {
		return null;
	}

	return parsed;
}

function normalizeSaleItems(items: SaleItemBody[] | undefined): CreateInventorySaleItemInput[] {
	if (!Array.isArray(items) || items.length === 0) {
		throw error(400, 'Debes incluir al menos un item de venta');
	}

	const grouped = new Map<
		string,
		{
			quantity: number;
			priceWeightedSum: number;
		}
	>();

	for (const item of items) {
		const productCode = (item.product_code || '').trim();
		if (!isUuid(productCode)) {
			throw error(400, 'Producto inválido en los items');
		}

		const quantity = Number(item.quantity);
		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw error(400, 'La cantidad de cada item debe ser un entero mayor a 0');
		}

		const unitPrice = Number(item.unit_price);
		if (!Number.isFinite(unitPrice) || unitPrice < 0) {
			throw error(400, 'El precio unitario de cada item debe ser válido y >= 0');
		}

		const existing = grouped.get(productCode) ?? {
			quantity: 0,
			priceWeightedSum: 0
		};

		existing.quantity += quantity;
		existing.priceWeightedSum += unitPrice * quantity;
		grouped.set(productCode, existing);
	}

	return [...grouped.entries()].map(([productCode, value]) => ({
		productCode,
		quantity: value.quantity,
		unitPrice: value.quantity > 0 ? value.priceWeightedSum / value.quantity : 0
	}));
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver ventas');
	}

	const branchCode = readRequiredUuidSearchParam(url, 'branch_code', {
		missingMessage: 'Debe seleccionar una sede',
		invalidMessage: 'Sede inválida'
	});
	const productCode = readOptionalUuidSearchParam(url, 'product_code', 'Producto inválido');
	const customerCode = readOptionalUuidSearchParam(url, 'customer_code', 'Cliente inválido');
	const search = (url.searchParams.get('search') || '').trim();
	const channelRaw = normalizeInventorySaleChannel(url.searchParams.get('sale_channel'));
	const shippingStateRaw = normalizeInventorySaleShippingState(
		url.searchParams.get('shipping_state')
	);
	const statusRaw = normalizeInventorySaleStatusFilter(url.searchParams.get('status'));
	const { page, pageSize } = readInventoryPagination(url, {
		defaultPage: 1,
		defaultPageSize: 20,
		maxPageSize: 120
	});

	let saleChannel: InventorySaleChannel | undefined;
	if (channelRaw) {
		if (!isValidInventorySaleChannel(channelRaw)) {
			throw error(400, 'Canal de venta inválido');
		}
		saleChannel = channelRaw;
	}

	let shippingState: InventorySaleShippingState | undefined;
	if (shippingStateRaw) {
		if (!isValidInventorySaleShippingState(shippingStateRaw)) {
			throw error(400, 'Estado de envío inválido');
		}
		shippingState = shippingStateRaw;
	}

	let status: InventorySaleStatusFilter | undefined;
	if (statusRaw) {
		if (!isValidInventorySaleStatusFilter(statusRaw)) {
			throw error(400, 'Estado de venta inválido');
		}
		status = statusRaw;
	}

	const result = await InventoryRepository.listSales(locals.db, {
		branchCode,
		productCode,
		customerCode,
		search: search || undefined,
		shippingState,
		saleChannel,
		status,
		page,
		pageSize
	});
	return json({ sales: result.items, pagination: result.pagination });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('inventory:create'))) {
		throw error(403, 'No tienes permisos para registrar ventas');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as CreateSaleBody;
	const branchCode = (body.branch_code || '').trim();
	const customerCode = (body.customer_code || '').trim();
	const saleChannelRaw = normalizeInventorySaleChannel(body.sale_channel || 'store');
	const fulfillmentTypeRaw = normalizeInventorySaleFulfillmentType(
		body.fulfillment_type || 'pickup'
	);
	const customerName = (body.customer_name || '').trim();
	const customerPhone = (body.customer_phone || '').trim();
	const shippingStateRaw = normalizeInventorySaleShippingState(body.shipping_state || '');
	const deliveryAddress = (body.delivery_address || '').trim();
	const orderReference = (body.order_reference || '').trim();
	const soldAtRaw = (body.sold_at || '').trim();
	const note = (body.note || '').trim();
	const items = normalizeSaleItems(body.items);

	if (!isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (customerCode && !isUuid(customerCode)) {
		throw error(400, 'Cliente inválido');
	}

	if (!customerCode && !customerName) {
		throw error(400, 'Debes seleccionar o registrar un cliente');
	}

	if (!isValidInventorySaleChannel(saleChannelRaw)) {
		throw error(400, 'Canal de venta inválido. Usa: store o web');
	}
	const saleChannel: InventorySaleChannel = saleChannelRaw;

	if (!isValidInventorySaleFulfillmentType(fulfillmentTypeRaw)) {
		throw error(400, 'Tipo de entrega inválido. Usa: pickup o delivery');
	}
	const fulfillmentType: InventorySaleFulfillmentType = fulfillmentTypeRaw;

	const shippingStateNormalized =
		shippingStateRaw || defaultShippingStateForFulfillment(fulfillmentType);
	if (!isValidInventorySaleShippingState(shippingStateNormalized)) {
		throw error(400, 'Estado de envío inválido');
	}
	const shippingState: InventorySaleShippingState = shippingStateNormalized;

	if (fulfillmentType === 'pickup' && shippingState !== 'na') {
		throw error(400, 'Las ventas en tienda deben usar estado de envío "na"');
	}

	if (fulfillmentType === 'delivery' && shippingState === 'na') {
		throw error(400, 'Las ventas con envío deben tener estado pendiente o superior');
	}

	if (fulfillmentType === 'delivery' && !deliveryAddress) {
		throw error(400, 'La dirección es obligatoria para entregas con envío');
	}

	let soldAt: Date | string = new Date();
	if (soldAtRaw) {
		const parsedDateOnly = parseDateOnlyAsUtcNoon(soldAtRaw);
		if (parsedDateOnly) {
			soldAt = parsedDateOnly;
		} else {
			const parsed = new Date(soldAtRaw);
			if (Number.isNaN(parsed.getTime())) {
				throw error(400, 'Fecha de venta inválida');
			}
			soldAt = parsed;
		}
	}

	try {
		const sale = await InventoryRepository.createSale(locals.db, {
			branchCode,
			userCode: locals.user.code,
			saleChannel,
			fulfillmentType,
			shippingState,
			deliveryAddress: deliveryAddress || null,
			orderReference: orderReference || null,
			customerCode: customerCode || null,
			customerName: customerName || null,
			customerPhone: customerPhone || null,
			soldAt,
			note: note || null,
			items
		});

		return json({ sale }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23503') {
			throw error(404, 'Producto o sede no encontrada');
		}

		if (dbError.code === '23505') {
			throw error(400, 'No repitas el mismo producto en varias líneas');
		}

		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Inventario insuficiente para registrar la venta');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo registrar la venta');
	}
};
