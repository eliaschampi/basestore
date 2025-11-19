<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import Button from '../Button/Button.svelte';
	import Checkbox from '../Checkbox/Checkbox.svelte';
	import Input from '../Input/Input.svelte';
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
	let selectedItems = $state<TableRow[]>(selected || []);
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
				const aVal = a[col] as any;
				const bVal = b[col] as any;

				if (aVal === bVal) return 0;
				if (aVal === null || aVal === undefined) return 1;
				if (bVal === null || bVal === undefined) return -1;

				const comparison = aVal < bVal ? -1 : 1;
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		}

		if (pagination) {
			const start = (currentPage - 1) * itemsPerPage;
			const end = start + itemsPerPage;
			result = result.slice(start, end);
		}

		return result;
	});

	const totalPages = $derived(() => {
		if (!data) return 0;
		const filteredLength =
			searchQuery && search
				? data.filter((item) =>
						Object.values(item).some((val) =>
							String(val).toLowerCase().includes(searchQuery.toLowerCase())
						)
					).length
				: data.length;
		return Math.ceil(filteredLength / itemsPerPage);
	});

	const isAllSelected = $derived(() => {
		if (!data || !selectable) return false;
		const currentData = processedData();
		return currentData.length > 0 && currentData.every((item) => isRowSelected(item));
	});

	const isPartiallySelected = $derived(() => {
		if (!data || !selectable) return false;
		const currentData = processedData();
		const selectedCount = currentData.filter((item) => isRowSelected(item)).length;
		return selectedCount > 0 && selectedCount < currentData.length;
	});

	const paginationData = $derived(() => ({
		currentPage,
		totalPages: totalPages(),
		itemsPerPage,
		totalItems: data?.length || 0
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

	const getRowKey = (row: TableRow, index: number): string => {
		return row.id?.toString() || row.key?.toString() || `row-${index}`;
	};

	const handleSearch = () => {
		onsearch?.(searchQuery);
		if (pagination) currentPage = 1;
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

		const currentData = processedData();

		if (checked) {
			// Add all currently visible items that aren't already selected
			currentData.forEach((row) => {
				if (!isRowSelected(row)) {
					selectedItems.push(row);
				}
			});
		} else {
			// Remove all currently visible items from selection
			const currentIds = new Set(currentData.map((row) => getRowKey(row, 0)));
			selectedItems = selectedItems.filter((item) => !currentIds.has(getRowKey(item, 0)));
		}

		selected = selectedItems;
	};

	const handleRowClick = (row: TableRow, index: number) => {
		onRowClick?.(row, index);
	};

	const handleRowSelect = (row: TableRow, checked: boolean) => {
		if (!selectable) return;

		const index = selectedItems.findIndex((item) => getRowKey(item, 0) === getRowKey(row, 0));

		if (checked && index === -1) {
			selectedItems.push(row);
		} else if (!checked && index > -1) {
			selectedItems.splice(index, 1);
		}

		selected = selectedItems;
		onRowSelect?.(row, checked);
	};

	const isRowSelected = (row: TableRow): boolean => {
		if (!selectable) return false;
		return selectedItems.some((item) => getRowKey(item, 0) === getRowKey(row, 0));
	};

	const goToPage = (page: number) => {
		if (page >= 1 && page <= totalPages()) {
			currentPage = page;
			onPageChange?.(page);
		}
	};

	setContext('table', {
		compact,
		stripe,
		hover,
		selectable,
		sortable,
		getSelectedItems: () => selectedItems,
		getSortColumn: () => sortColumn,
		getSortDirection: () => sortDirection,
		handleRowSelect,
		handleSort,
		isRowSelected
	});

	$effect(() => {
		if (searchQuery && pagination) currentPage = 1;
	});

	$effect(() => {
		if (data && pagination) currentPage = 1;
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
			<table class="lumi-table__content">
				<thead class="lumi-table__thead">
					<tr>
						{#if selectable}
							<th class="lumi-table__th lumi-table__th--select">
								<Checkbox
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
					{#if data && data.length > 0}
						{#each processedData() as rowData, index (getRowKey(rowData, index))}
							<tr
								class:lumi-table__tr--selected={isRowSelected(rowData)}
								onclick={() => handleRowClick(rowData, index)}
							>
								{#if selectable}
									<td class="lumi-table__td lumi-table__td--select">
										<Checkbox
											checked={isRowSelected(rowData)}
											size="sm"
											onchange={(checked) => handleRowSelect(rowData, checked)}
										/>
									</td>
								{/if}
								{#if row}
									{@render row({ row: rowData, index })}
								{:else}
									{#each Object.values(rowData) as value}
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

			{#if data && data.length === 0}
				<div class="lumi-table__empty">
					{noDataText}
				</div>
			{/if}
		{/if}
	</div>

	{#if pagination && totalPages() > 1 && !loading}
		<div class="lumi-table__pagination">
			{#if paginationSlot}
				{@render paginationSlot(paginationData())}
			{:else}
				<div class="lumi-table__pagination-controls">
					<Button
						size="sm"
						type="flat"
						disabled={currentPage === 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						Previous
					</Button>
					<span class="lumi-table__pagination-info">
						Page {currentPage} of {totalPages()}
					</span>
					<Button
						size="sm"
						type="flat"
						disabled={currentPage === totalPages()}
						onclick={() => goToPage(currentPage + 1)}
					>
						Next
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.lumi-table {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}

	.lumi-table__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		flex-wrap: wrap;
	}

	.lumi-table__search {
		flex: 1;
		max-width: 300px;
	}

	.lumi-table__wrapper {
		width: 100%;
		overflow-x: auto;
		background: var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-table__content {
		width: 100%;
		border-collapse: collapse;
		min-width: 600px;
	}

	/* Header */
	.lumi-table__thead {
		background: var(--lumi-color-background-hover);
		border-bottom: 1px solid var(--lumi-color-border);
	}

	.lumi-table__th {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		text-align: left;
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	/* Body */
	.lumi-table__tbody tr {
		border-bottom: 1px solid var(--lumi-color-border-light);
		transition: background-color 0.2s ease;
	}

	.lumi-table__tbody tr:last-child {
		border-bottom: none;
	}

	.lumi-table__td {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-base);
		color: var(--lumi-color-text);
		vertical-align: middle;
	}

	/* Variants */
	.lumi-table--stripe .lumi-table__tbody tr:nth-child(even) {
		background: var(--lumi-color-background-hover);
	}

	.lumi-table--hover .lumi-table__tbody tr:hover {
		background: var(--lumi-color-primary-50);
	}

	.lumi-table__tr--selected {
		background: var(--lumi-color-primary-50) !important;
	}

	.lumi-table--compact .lumi-table__th,
	.lumi-table--compact .lumi-table__td {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-sm);
	}

	/* Select Column */
	.lumi-table__th--select,
	.lumi-table__td--select {
		width: 48px;
		padding-right: 0;
		text-align: center;
	}

	/* Loading & Empty States */
	.lumi-table__loading,
	.lumi-table__empty {
		padding: var(--lumi-space-3xl);
		text-align: center;
		color: var(--lumi-color-text-muted);
	}

	.lumi-table__loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-table__spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--lumi-color-border);
		border-top-color: var(--lumi-color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Pagination */
	.lumi-table__pagination {
		display: flex;
		justify-content: flex-end;
		padding-top: var(--lumi-space-xs);
	}

	.lumi-table__pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-table__pagination-info {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}
</style>
