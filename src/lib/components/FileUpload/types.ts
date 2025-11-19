/**
 * FileUpload Component Types
 * Professional file upload with drag-drop, validation, and progress tracking
 */

export type FileUploadStatus = 'selected' | 'uploading' | 'success' | 'error';

export interface FileUploadFile {
	id: string;
	file: File;
	status: FileUploadStatus;
	progress: number;
	error?: string;
}

export interface FileUploadProps {
	/**
	 * Selected files (bindable)
	 */
	files?: FileUploadFile[];

	/**
	 * Placeholder text when no files selected
	 * @default "Upload your files"
	 */
	placeholderText?: string;

	/**
	 * Accepted file types (e.g., 'image/*', '.pdf')
	 * @default "*"
	 */
	accept?: string;

	/**
	 * Allow multiple file selection
	 * @default false
	 */
	multiple?: boolean;

	/**
	 * Maximum file size in bytes (0 = no limit)
	 * @default 0
	 */
	maxSize?: number;

	/**
	 * Disable the component
	 * @default false
	 */
	disabled?: boolean;

	/**
	 * Custom CSS class
	 */
	class?: string;

	/**
	 * File change event handler
	 */
	onchange?: (files: FileUploadFile[]) => void;

	/**
	 * File remove event handler
	 */
	onremove?: (fileId: string) => void;
}
