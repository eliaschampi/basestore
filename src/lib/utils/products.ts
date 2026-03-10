import type { Database } from '$lib/database';

const SKU_PREFIX = 'PROD';
const SKU_PAD_LENGTH = 5;

/**
 * Generates the next sequential product SKU (e.g. PROD-00001, PROD-00002).
 * Queries the database for the current max SKU with the PROD- prefix and increments.
 */
export async function generateProductSku(db: Database): Promise<string> {
	const result = await db
		.selectFrom('products')
		.select(db.fn.max('sku').as('max_sku'))
		.where('sku', 'like', `${SKU_PREFIX}-%`)
		.executeTakeFirst();

	const maxSku = result?.max_sku as string | null;
	let nextNumber = 1;

	if (maxSku) {
		const numericPart = maxSku.replace(`${SKU_PREFIX}-`, '');
		const parsed = parseInt(numericPart, 10);
		if (!isNaN(parsed)) {
			nextNumber = parsed + 1;
		}
	}

	return `${SKU_PREFIX}-${String(nextNumber).padStart(SKU_PAD_LENGTH, '0')}`;
}

export function formatProductPrice(price: string | number | null): string {
	const parsed = typeof price === 'number' ? price : Number.parseFloat(price ?? '0');
	const safePrice = Number.isFinite(parsed) ? parsed : 0;

	return new Intl.NumberFormat('es-PE', {
		style: 'currency',
		currency: 'PEN',
		minimumFractionDigits: 2
	}).format(safePrice);
}

export function formatProductDateTime(value: string | Date | null): string {
	if (!value) {
		return '—';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '—';
	}

	return new Intl.DateTimeFormat('es-ES', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}
