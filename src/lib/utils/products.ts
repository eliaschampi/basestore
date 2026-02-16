export function formatProductPrice(price: string | number | null): string {
	const parsed = typeof price === 'number' ? price : Number.parseFloat(price ?? '0');
	const safePrice = Number.isFinite(parsed) ? parsed : 0;

	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'USD',
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
