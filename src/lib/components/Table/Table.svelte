<script lang="ts">
	import type { Snippet } from "svelte";
	import { setContext } from "svelte";
	import Button from "../Button/Button.svelte";
	import Checkbox from "../Checkbox/Checkbox.svelte";
	import Input from "../Input/Input.svelte";
	import type { TableProps, TableRow } from "./types";

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
		noDataText = "No data available",
		data = undefined,
		itemsPerPage = 10,
		loading = false,
		sortable = false,
		selected = $bindable([]),
		class: className = "",
		"onrow-click": onRowClick,
		"onrow-select": onRowSelect,
		onsearch,
		"onpage-change": onPageChange,
		onsort,
		children,
		header,
		thead,
		row,
		paginationSlot
	}: Props = $props();

	let searchQuery = $state("");
	let currentPage = $state(1);
	let selectedItems = $state<TableRow[]>(selected || []);
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<"asc" | "desc" | null>(null);

	const processedData = $derived(() => {
		if (!data) return [];

		let result = [...data];

		if (searchQuery && search) {
			result = result.filter((item) =>
				JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
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

				const comparison = aVal < bVal ? -1 : 1;
				return sortDirection === "asc" ? comparison : -comparison;
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
						JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
					).length
				: data.length;
		return Math.ceil(filteredLength / itemsPerPage);
	});

	const isAllSelected = $derived(() => {
		if (!data || !selectable) return false;
		const filteredData =
			searchQuery && search
				? data.filter((item) =>
						JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
					)
				: data;
		return filteredData.length > 0 && selectedItems.length === filteredData.length;
	});

	const isPartiallySelected = $derived(() => {
		if (!data || !selectable) return false;
		const filteredData =
			searchQuery && search
				? data.filter((item) =>
						JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
					)
				: data;
		return selectedItems.length > 0 && selectedItems.length < filteredData.length;
	});

	const paginationData = $derived(() => ({
		currentPage,
		totalPages: totalPages(),
		itemsPerPage,
		totalItems: data?.length || 0
	}));

	const classes = $derived(() => {
		return [
			"lumi-table",
			compact && "lumi-table--compact",
			stripe && "lumi-table--stripe",
			hover && "lumi-table--hover",
			loading && "lumi-table--loading",
			className
		]
			.filter(Boolean*
			*¨-ñ.l)
			.join(" ");
	});

	const getRowKey = (row: TableRow, index: number): string => {
		return row.id?.toString() || row.key?.toString() || `row-${index}`;
	};

	const handleSearch = () => {
		onsearch?.(searchQuery);
		if (pagination) {
			currentPage = 1;
		}
	};

	const handleSort = (column: string) => {
		if (!sortable) return;

		if (sortColumn === column) {
			if (sortDirection === "asc") {
				sortDirection = "desc";
			} else if (sortDirection === "desc") {
				sortDirection = null;
				sortColumn = null;
			}
		} else {
			sortColumn = column;
			sortDirection = "asc";
		}

		onsort?.(column, sortDirection);
	};

	const toggleSelectAll = (checked: boolean) => {
		if (!data || !selectable) return;

		const filteredData =
			searchQuery && search
				? data.filter((item) =>
						JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
					)
				: data;

		if (checked) {
			selectedItems = [...filteredData];
		} else {
			selectedItems = [];
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

	setContext("table", {
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
		if (searchQuery && pagination) {
			currentPage = 1;
		}
	});

	$effect(() => {
		if (data && pagination) {
			currentPage = 1;
		}
		selectedItems = [];
		selected = [];
	});
</script>

<div class={classes()}>
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

	{#if loading}
		<div class="lumi-table__loading">
			<div class="lumi-table__loading-spinner"></div>
			<span>Loading...</span>
		</div>
	{:else}
		<div class="lumi-table__wrapper">
			<table class="lumi-table__table">
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
								class:lumi-table__tr--hover={hover}
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

			{#if data && data.length === 0 && !loading}
				<div class="lumi-table__no-data">
					{noDataText}
				</div>
			{/if}
		</div>

		{#if pagination && totalPages() > 1}
			<div class="lumi-table__pagination">
				{#if paginationSlot}
					{@render paginationSlot(paginationData())}
				{:else}
					<div class="lumi-table__pagination-controls">
						<Button
							size="sm"
							type="border"
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
							type="border"
							disabled={currentPage === totalPages()}
							onclick={() => goToPage(currentPage + 1)}
						>
							Next
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.lumi-table {
		background: transparent;
		border: none;
		border-radius: 0;
		overflow: hidden;
		transition: var(--lumi-transition-all);
		width: 100%;
	}

	.lumi-table__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--lumi-space-lg) 0 var(--lumi-space-md);
		background: transparent;
		border-bottom: none;
		gap: var(--lumi-space-md);
		flex-wrap: wrap;
	}

	.lumi-table__search {
		min-width: 250px;
		flex: 1;
		max-width: 400px;
	}

	.lumi-table__loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-3xl);
		color: var(--lumi-color-text-muted);
		gap: var(--lumi-space-md);
	}

	.lumi-table__loading-spinner {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
		border: 2px solid var(--lumi-color-border);
		border-top: 2px solid var(--lumi-color-primary);
		border-radius: 50%;
		animation: lumi-spin 1s linear infinite;
	}

	.lumi-table__wrapper {
		width: 100%;
		overflow-x: auto;
		overflow-y: visible;
		-webkit-overflow-scrolling: touch;
		border-radius: var(--lumi-radius-2xl);
		background: var(--lumi-color-surface);
		box-shadow: var(--lumi-shadow-md);
	}

	.lumi-table__wrapper::-webkit-scrollbar {
		height: 8px;
	}

	.lumi-table__wrapper::-webkit-scrollbar-track {
		background: var(--lumi-color-background);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-table__wrapper::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border-strong);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-table__wrapper::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-text-muted);
	}

	.lumi-table__table {
		width: 100%;
		border-collapse: collapse;
		min-width: 600px;
	}

	.lumi-table__thead {
		background: linear-gradient(
			135deg,
			var(--lumi-color-surface) 0%,
			color-mix(in srgb, var(--lumi-color-primary) 3%, var(--lumi-color-surface)) 100%
		);
	}

	.lumi-table__thead tr {
		border-bottom: 2px solid var(--lumi-color-border-light);
	}

	.lumi-table__th {
		text-align: left;
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		transition: var(--lumi-transition-colors);
		padding: var(--lumi-space-md) var(--lumi-space-lg);
	}

	.lumi-table__th--select {
		width: var(--lumi-space-3xl);
		text-align: center;
		padding: var(--lumi-space-md);
	}

	.lumi-table__tbody tr {
		border-bottom: 1px solid var(--lumi-color-border-light);
		transition: var(--lumi-transition-all);
		background: transparent;
	}

	.lumi-table__tbody tr:last-child {
		border-bottom: none;
	}

	.lumi-table--stripe .lumi-table__tbody tr:nth-child(even) {
		background: color-mix(in srgb, var(--lumi-color-background) 30%, transparent);
	}

	.lumi-table--hover .lumi-table__tbody tr:hover {
		background: color-mix(in srgb, var(--lumi-color-primary) 5%, transparent);
		cursor: pointer;
	}

	.lumi-table__tbody tr.lumi-table__tr--selected {
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, transparent);
		border-left: 3px solid var(--lumi-color-primary);
	}

	.lumi-table__td {
		vertical-align: middle;
		text-align: left;
		transition: var(--lumi-transition-colors);
		color: var(--lumi-color-text);
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-table__td--select {
		width: var(--lumi-space-3xl);
		text-align: center;
		padding: var(--lumi-space-md);
	}

	.lumi-table--compact .lumi-table__th,
	.lumi-table--compact .lumi-table__td {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-table__no-data {
		padding: var(--lumi-space-3xl);
		text-align: center;
		color: var(--lumi-color-text-muted);
		font-style: italic;
		background: transparent;
	}

	.lumi-table__pagination {
		padding: var(--lumi-space-lg) 0 var(--lumi-space-md);
		background: transparent;
		border-top: none;
		margin-top: var(--lumi-space-md);
	}

	.lumi-table__pagination-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
		flex-wrap: wrap;
	}

	.lumi-table__pagination-info {
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
	}

	@media (max-width: 768px) {
		.lumi-table__header {
			flex-direction: column;
			align-items: stretch;
			gap: var(--lumi-space-sm);
		}

		.lumi-table__search {
			min-width: 100%;
			max-width: 100%;
		}

		.lumi-table__table {
			min-width: 800px;
		}

		.lumi-table__th,
		.lumi-table__td {
			padding: var(--lumi-space-sm) var(--lumi-space-md);
			font-size: var(--lumi-font-size-sm);
		}

		.lumi-table--compact .lumi-table__th,
		.lumi-table--compact .lumi-table__td {
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
			font-size: var(--lumi-font-size-xs);
		}

		.lumi-table__pagination-controls {
			gap: var(--lumi-space-sm);
		}
	}

	@keyframes lumi-spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
