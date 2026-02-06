<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import Button from '../Button/Button.svelte';
	import Checkbox from '../Checkbox/Checkbox.svelte';
	import Input from '../Input/Input.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { TableProps, TableRow } from './types';

	interface Props extends TableProps {
		children?: Snippet;
		header?: Snippet;
		thead?: Snippet;
		row?: Snippet<[{ row: TableRow; index: number }]>;
		paginationSlot?: Snippet<
			[{ currentPage: number; totalPages: number; itemsPerPage: number; totalItems: number }]
		>;
	}

	let {
		compact = false,
		stripe = false,
		hover = false,
		search = false,
		selectable = false,
		pagination = false,
		noDataText = 'No data available',
		data = undefined,
		itemsPerPage = 10,
		loading = false,
		sortable = false,
		selected = $bindable([]),
		class: className = '',
		'onrow-click': onRowClick,
		'onrow-select': onRowSelect,
		onsearch,
		'onpage-change': onPageChange,
		onsort,
		children,
		header,
		thead,
		row,
		paginationSlot
	}: Props = $props();

	let searchQuery = $state('');
	let currentPage = $state(1);
	// Use selected prop directly (it's $bindable), no need for internal state
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc' | null>(null);

	const processedData = $derived(() => {
		if (!data) return [];

		let result = [...data];

		if (searchQuery && search) {
			const query = searchQuery.toLowerCase();
			result = result.filter((item) =>
				Object.values(item).some((val) => String(val).toLowerCase().includes(query))
			);
		}

		if (sortColumn && sortDirection && sortable) {
			const col = sortColumn;
			result.sort((a, b) => {
				const aVal = a[col] as unknown;
				const bVal = b[col] as unknown;

				if (aVal === bVal) return 0;
				if (aVal === null || aVal === undefined) return 1;
				if (bVal === null || bVal === undefined) return -1;

				if (typeof aVal === 'number' && typeof bVal === 'number') {
					const comparison = aVal - bVal;
					return sortDirection === 'asc' ? comparison : -comparison;
				}

				const aString = String(aVal);
				const bString = String(bVal);
				const comparison = aString.localeCompare(bString, undefined, {
					numeric: true,
					sensitivity: 'base'
				});
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		}

		return result;
	});

	const totalItems = $derived(() => processedData().length);

	const totalPages = $derived(() => {
		if (!totalItems()) return 0;
		return Math.ceil(totalItems() / itemsPerPage);
	});

	const currentPageData = $derived(() => {
		if (!pagination) return processedData();
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return processedData().slice(start, end);
	});

	const isAllSelected = $derived(() => {
		if (!data || !selectable) return false;
		const currentData = currentPageData();
		return currentData.length > 0 && currentData.every((item) => isRowSelected(item));
	});

	const isPartiallySelected = $derived(() => {
		if (!data || !selectable) return false;
		const currentData = currentPageData();
		const selectedCount = currentData.filter((item) => isRowSelected(item)).length;
		return selectedCount > 0 && selectedCount < currentData.length;
	});

	const paginationData = $derived(() => ({
		currentPage,
		totalPages: totalPages(),
		itemsPerPage,
		totalItems: totalItems()
	}));

	const tableClasses = $derived(() => {
		return [
			'lumi-table',
			compact && 'lumi-table--compact',
			stripe && 'lumi-table--stripe',
			hover && 'lumi-table--hover',
			loading && 'lumi-table--loading',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const emptyIconSize = `${getIconSize('2xl')}px`;

	const getRowKey = (row: TableRow, index: number): string => {
		return row.id?.toString() || row.key?.toString() || `row-${index}`;
	};

	const handleSearch = () => {
		const trimmedQuery = searchQuery.trim();
		if (searchQuery !== trimmedQuery) {
			searchQuery = trimmedQuery;
		}
		onsearch?.(trimmedQuery);
		if (pagination && currentPage !== 1) currentPage = 1;
	};

	const handleSort = (column: string) => {
		if (!sortable) return;

		if (sortColumn === column) {
			if (sortDirection === 'asc') {
				sortDirection = 'desc';
			} else if (sortDirection === 'desc') {
				sortDirection = null;
				sortColumn = null;
			}
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}

		onsort?.(column, sortDirection);
	};

	const toggleSelectAll = (checked: boolean) => {
		if (!data || !selectable) return;

		const currentData = currentPageData();

		if (checked) {
			currentData.forEach((row) => {
				if (!isRowSelected(row)) {
					selected = [...selected, row];
				}
			});
		} else {
			const currentIds = new Set(currentData.map((row) => getRowKey(row, 0)));
			selected = selected.filter((item) => !currentIds.has(getRowKey(item, 0)));
		}
	};

	const handleRowClick = (row: TableRow, index: number) => {
		onRowClick?.(row, index);
	};

	const handleRowSelect = (row: TableRow, checked: boolean) => {
		if (!selectable) return;

		const index = selected.findIndex((item) => getRowKey(item, 0) === getRowKey(row, 0));

		if (checked && index === -1) {
			selected = [...selected, row];
		} else if (!checked && index > -1) {
			selected = selected.filter((_, i) => i !== index);
		}

		onRowSelect?.(row, checked);
	};

	const isRowSelected = (row: TableRow): boolean => {
		if (!selectable) return false;
		return selected.some((item) => getRowKey(item, 0) === getRowKey(row, 0));
	};

	const goToPage = (page: number) => {
		if (page >= 1 && page <= totalPages()) {
			currentPage = page;
			onPageChange?.(page);
		} else if (totalPages() === 0 && page === 1) {
			currentPage = 1;
		}
	};

	setContext('table', {
		get compact() {
			return compact;
		},
		get stripe() {
			return stripe;
		},
		get hover() {
			return hover;
		},
		get selectable() {
			return selectable;
		},
		get sortable() {
			return sortable;
		},
		getSelectedItems: () => selected,
		getSortColumn: () => sortColumn,
		getSortDirection: () => sortDirection,
		handleRowSelect,
		handleSort,
		isRowSelected
	});

	// selected prop is now used directly (no internal state sync needed)

	$effect(() => {
		const hasSearch = Boolean(searchQuery && search);
		if (pagination && hasSearch && currentPage !== 1) {
			currentPage = 1;
		}
	});

	$effect(() => {
		const pages = totalPages();
		if (!pagination) return;
		if (pages === 0 && currentPage !== 1) {
			currentPage = 1;
		} else if (pages > 0 && currentPage > pages) {
			currentPage = pages;
		}
	});
</script>

<div class={tableClasses()}>
	{#if search || header}
		<header class="lumi-table__header">
			{#if header}
				{@render header()}
			{/if}
			{#if search}
				<div class="lumi-table__search">
					<Input
						bind:value={searchQuery}
						placeholder="Search..."
						size="sm"
						icon="search"
						oninput={handleSearch}
					/>
				</div>
			{/if}
		</header>
	{/if}

	<div class="lumi-table__wrapper">
		{#if loading}
			<div class="lumi-table__loading">
				<div class="lumi-table__spinner"></div>
				<span>Loading...</span>
			</div>
		{:else}
			<table class="lumi-table__content" aria-busy={loading}>
				<thead class="lumi-table__thead">
					<tr>
						{#if selectable}
							<th class="lumi-table__th lumi-table__th--select">
								<Checkbox
									aria-label="Select all rows"
									checked={isAllSelected()}
									indeterminate={isPartiallySelected()}
									size="sm"
									onchange={toggleSelectAll}
								/>
							</th>
						{/if}
						{#if thead}
							{@render thead()}
						{/if}
					</tr>
				</thead>
				<tbody class="lumi-table__tbody">
					{#if data && currentPageData().length > 0}
						{#each currentPageData() as rowData, index (getRowKey(rowData, index))}
							<tr
								class="lumi-table__row"
								class:lumi-table__row--selected={isRowSelected(rowData)}
								onclick={() => handleRowClick(rowData, index)}
							>
								{#if selectable}
									<td class="lumi-table__td lumi-table__td--select">
										<Checkbox
											aria-label={`Select row ${index + 1}`}
											checked={isRowSelected(rowData)}
											size="sm"
											onchange={(checked) => handleRowSelect(rowData, checked)}
										/>
									</td>
								{/if}
								{#if row}
									{@render row({ row: rowData, index })}
								{:else}
									{#each Object.values(rowData) as value, valueIndex (`cell-${getRowKey(rowData, index)}-${valueIndex}`)}
										<td class="lumi-table__td">
											{value}
										</td>
									{/each}
								{/if}
							</tr>
						{/each}
					{:else if !data}
						{#if children}
							{@render children()}
						{/if}
					{/if}
				</tbody>
			</table>

			{#if data && totalItems() === 0}
				<div class="lumi-table__empty" role="status" aria-live="polite">
					<div class="lumi-table__empty-icon">
						<Icon icon="inbox" size={emptyIconSize} />
					</div>
					<span class="lumi-table__empty-text">{noDataText}</span>
				</div>
			{/if}
		{/if}
	</div>

	{#if pagination && totalPages() > 1 && !loading}
		<div class="lumi-table__pagination">
			{#if paginationSlot}
				{@render paginationSlot(paginationData())}
			{:else}
				<div class="lumi-table__pagination-info">
					<span class="lumi-table__pagination-text">
						Showing {totalItems() === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(
							currentPage * itemsPerPage,
							totalItems()
						)} of {totalItems()}
					</span>
				</div>
				<div class="lumi-table__pagination-controls">
					<Button
						size="sm"
						type="border"
						icon="chevron-left"
						disabled={currentPage === 1}
						onclick={() => goToPage(currentPage - 1)}
						aria-label="Previous page"
					/>
					<div class="lumi-table__pagination-pages">
						{#each Array.from({ length: Math.min(5, totalPages()) }, (_, i) => {
							const total = totalPages();
							if (total <= 5) return i + 1;
							if (currentPage <= 3) return i + 1;
							if (currentPage >= total - 2) return total - 4 + i;
							return currentPage - 2 + i;
						}) as page (page)}
							<button
								class="lumi-table__pagination-page"
								class:lumi-table__pagination-page--active={currentPage === page}
								onclick={() => goToPage(page)}
							>
								{page}
							</button>
						{/each}
					</div>
					<Button
						size="sm"
						type="border"
						icon="chevron-right"
						disabled={currentPage === totalPages()}
						onclick={() => goToPage(currentPage + 1)}
						aria-label="Next page"
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ========================================================================== */
	/* LUMI TABLE - Premium 2026 Design */
	/* ========================================================================== */

	.lumi-table {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}

	/* ========================================================================== */
	/* HEADER */
	/* ========================================================================== */

	.lumi-table__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		flex-wrap: wrap;
	}

	.lumi-table__search {
		flex: 1;
		max-width: calc(var(--lumi-space-4xl) * 5);
		min-width: calc(var(--lumi-space-4xl) * 3);
	}

	/* ========================================================================== */
	/* TABLE WRAPPER - Premium Container */
	/* ========================================================================== */

	.lumi-table__wrapper {
		position: relative;
		width: 100%;
		overflow: hidden;
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.05) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 20%
			),
			var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-md);
		overflow-x: auto;
		transition:
			var(--lumi-transition-shadow),
			border-color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-table__wrapper:hover {
		box-shadow: var(--lumi-shadow-md);
		border-color: var(--lumi-color-border);
	}

	/* ========================================================================== */
	/* TABLE CONTENT */
	/* ========================================================================== */

	.lumi-table__content {
		width: 100%;
		border-collapse: collapse;
		min-width: 100%;
	}

	/* ========================================================================== */
	/* HEADER ROW - Modern Gradient */
	/* ========================================================================== */

	.lumi-table__thead {
		background: linear-gradient(
			180deg,
			var(--lumi-color-surface) 0%,
			var(--lumi-color-background-hover) 100%
		);
		border-bottom: 1px solid var(--lumi-color-border);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.lumi-table__th,
	.lumi-table__thead :global(th) {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		text-align: left;
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-bold);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		white-space: nowrap;
		background: transparent;
	}

	/* ========================================================================== */
	/* BODY ROWS - Premium Styling */
	/* ========================================================================== */

	.lumi-table__tbody .lumi-table__row {
		border-bottom: 1px solid var(--lumi-color-border-light);
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			border-left-color var(--lumi-duration-fast) var(--lumi-easing-default);
		border-left: var(--lumi-border-width-thick) solid transparent;
	}

	.lumi-table__tbody .lumi-table__row:last-child {
		border-bottom: none;
	}

	/* Hover effect with accent border */
	.lumi-table--hover .lumi-table__tbody .lumi-table__row:hover {
		background: var(--lumi-color-primary-50);
		border-left-color: var(--lumi-color-primary);
		cursor: pointer;
	}

	/* Selected row */
	.lumi-table__row--selected {
		background: var(--lumi-color-primary-50) !important;
		border-left-color: var(--lumi-color-primary) !important;
	}

	/* Stripe pattern */
	.lumi-table--stripe .lumi-table__tbody .lumi-table__row:nth-child(even) {
		background: rgba(var(--lumi-color-background-rgb), 0.5);
	}

	/* ========================================================================== */
	/* TABLE CELLS */
	/* ========================================================================== */

	.lumi-table__td,
	.lumi-table__tbody :global(td) {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text);
		vertical-align: middle;
	}

	/* Select Column */
	.lumi-table__th--select,
	.lumi-table__td--select {
		width: calc(var(--lumi-space-3xl) + var(--lumi-space-xs));
		padding-right: var(--lumi-space-xs);
		text-align: center;
	}

	/* Compact variant */
	.lumi-table--compact .lumi-table__th,
	.lumi-table--compact .lumi-table__thead :global(th),
	.lumi-table--compact .lumi-table__td,
	.lumi-table--compact .lumi-table__tbody :global(td) {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-xs);
	}

	/* ========================================================================== */
	/* LOADING STATE - Skeleton Animation */
	/* ========================================================================== */

	.lumi-table__loading {
		padding: var(--lumi-space-4xl);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
		color: var(--lumi-color-text-muted);
	}

	.lumi-table__spinner {
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-top-color: var(--lumi-color-primary);
		border-radius: var(--lumi-radius-full);
		animation: lumi-table-spin var(--lumi-duration-slower) linear infinite;
	}

	@keyframes lumi-table-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ========================================================================== */
	/* EMPTY STATE - Premium Design */
	/* ========================================================================== */

	.lumi-table__empty {
		padding: var(--lumi-space-4xl);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
	}

	.lumi-table__empty-icon {
		color: var(--lumi-color-text-light);
		opacity: 0.6;
	}

	.lumi-table__empty-text {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
	}

	/* ========================================================================== */
	/* PAGINATION - Modern Controls */
	/* ========================================================================== */

	.lumi-table__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		padding-top: var(--lumi-space-sm);
	}

	.lumi-table__pagination-info {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-table__pagination-text {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.lumi-table__pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-table__pagination-pages {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
	}

	.lumi-table__pagination-page {
		min-width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--lumi-radius-md);
		cursor: pointer;
		transition: var(--lumi-transition-all);
	}

	.lumi-table__pagination-page:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-table__pagination-page--active {
		background: var(--lumi-color-primary);
		color: var(--lumi-color-white);
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-table__pagination-page--active:hover {
		background: var(--lumi-color-primary);
		color: var(--lumi-color-white);
	}

	/* ========================================================================== */
	/* RESPONSIVE */
	/* ========================================================================== */

	@media (max-width: 768px) {
		.lumi-table__header {
			flex-direction: column;
			align-items: stretch;
		}

		.lumi-table__search {
			max-width: none;
		}

		.lumi-table__pagination {
			flex-direction: column;
			gap: var(--lumi-space-sm);
		}

		.lumi-table__pagination-pages {
			display: none;
		}
	}
</style>
