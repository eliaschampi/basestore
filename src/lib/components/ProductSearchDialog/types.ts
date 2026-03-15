export interface ProductSearchResult {
	code: string;
	name: string;
	sku: string | null;
	brand_name: string | null;
	category_name: string | null;
	price: string | null;
	is_active: boolean | null;
	primary_image_url: string | null;
}

export interface ProductSearchDialogProps {
	open?: boolean;
	onselect?: (product: ProductSearchResult) => void;
}
