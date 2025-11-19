// Lumi UI - PageHeader Component Types
import type { TitleProps } from '../Title/types';

export interface PageHeaderProps extends TitleProps {
	/** Adds a subtle border at the bottom of the header */
	bordered?: boolean;

	/** Custom class */
	class?: string;
}
