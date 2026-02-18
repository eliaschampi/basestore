import { error } from '@sveltejs/kit';
import { isUuid } from '$lib/utils/validation';

interface InventoryPaginationQueryOptions {
	defaultPage?: number;
	defaultPageSize?: number;
	maxPageSize?: number;
}

interface RequiredUuidSearchParamOptions {
	missingMessage: string;
	invalidMessage: string;
}

export function readInventoryPagination(
	url: URL,
	{
		defaultPage = 1,
		defaultPageSize = 20,
		maxPageSize = 120
	}: InventoryPaginationQueryOptions = {}
): { page: number; pageSize: number } {
	const pageRaw = Number(url.searchParams.get('page') || defaultPage);
	const pageSizeRaw = Number(url.searchParams.get('page_size') || defaultPageSize);

	const page = Number.isInteger(pageRaw) ? Math.max(pageRaw, 1) : defaultPage;
	const pageSize = Number.isInteger(pageSizeRaw)
		? Math.min(Math.max(pageSizeRaw, 1), maxPageSize)
		: defaultPageSize;

	return { page, pageSize };
}

export function readRequiredUuidSearchParam(
	url: URL,
	key: string,
	{ missingMessage, invalidMessage }: RequiredUuidSearchParamOptions
): string {
	const value = (url.searchParams.get(key) || '').trim();
	if (!value) {
		throw error(400, missingMessage);
	}

	if (!isUuid(value)) {
		throw error(400, invalidMessage);
	}

	return value;
}

export function readOptionalUuidSearchParam(
	url: URL,
	key: string,
	invalidMessage: string
): string | undefined {
	const value = (url.searchParams.get(key) || '').trim();
	if (!value) {
		return undefined;
	}

	if (!isUuid(value)) {
		throw error(400, invalidMessage);
	}

	return value;
}
