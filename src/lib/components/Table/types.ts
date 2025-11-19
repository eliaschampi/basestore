// Lumi UI - Table Component Types

// Generic table row type - can be extended for specific use cases
export interface TableRow {
	id?: string | number;
	key?: string | number;
	[key: string]: unknown;
}

export interface TableColumn {
	/** Column key */
	key: string;

	/** Column label */
	label: string;

	/** Whether column is sortable */
	sortable?: boolean;

	/** Column width */
	width?: string;
}

export interface TableProps {
	/** Whether table is compact */
	compact?: boolean;

	/** Whether table has striped rows */
	stripe?: boolean;

	/** Whether table has hover effects */
	hover?: boolean;

	/** Whether table has search functionality */
	search?: boolean;

	/** Whether table has row selection */
	selectable?: boolean;

	/** Whether table has pagination */
	pagination?: boolean;

	/** Text to show when no data */
	noDataText?: string;

	/** Data array for table */
	data?: TableRow[];

	/** Column definitions */
	columns?: TableColumn[];

	/** Items per page for pagination */
	itemsPerPage?: number;

	/** Loading state */
	loading?: boolean;

	/** Sortable columns configuration */
	sortable?: boolean;

	/** Selected items (bindable) */
	selected?: TableRow[];

	/** Custom class */
	class?: string;

	/** Row click handler */
	'onrow-click'?: (row: TableRow, index: number) => void;

	/** Row select handler */
	'onrow-select'?: (row: TableRow, selected: boolean) => void;

	/** Search handler */
	onsearch?: (query: string) => void;

	/** Page change handler */
	'onpage-change'?: (page: number) => void;

	/** Sort handler */
	onsort?: (column: string, direction: 'asc' | 'desc' | null) => void;
}

export interface TrProps {
	/** Row data */
	data?: TableRow;

	/** Whether row is selectable */
	selectable?: boolean;

	/** Row index */
	index?: number;
}

export interface ThProps {
	/** Sort key for column */
	sortKey?: string;

	/** Whether column is sortable */
	sortable?: boolean;

	/** Column width */
	width?: string;
}

export interface TdProps {
	/** Cell data */
	data?: unknown;
}

export interface TableContext {
	compact: boolean;
	stripe: boolean;
	hover: boolean;
	selectable: boolean;
	sortable: boolean;
	getSelectedItems: () => TableRow[];
	getSortColumn: () => string | null;
	getSortDirection: () => 'asc' | 'desc' | null;
	handleRowSelect: (row: TableRow, selected: boolean) => void;
	handleSort: (column: string) => void;
	isRowSelected: (row: TableRow) => boolean;
}

export type TableSize = 'sm' | 'md';
export type TableColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
