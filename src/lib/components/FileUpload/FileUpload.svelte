<script lang="ts">
	import { Icon } from '../Icon';
	import { Loading } from '../Loading';
	import type { FileUploadFile, FileUploadProps } from './types';

	let {
		files = $bindable([]),
		placeholderText = 'Upload your files',
		accept = '*',
		multiple = false,
		maxSize = 0,
		disabled = false,
		class: className = '',
		onchange,
		onremove
	}: FileUploadProps = $props();

	let fileInputRef: HTMLInputElement | undefined = $state();
	let isDragging = $state(false);

	// Computed classes
	const dropzoneClasses = $derived(() => {
		const hasError = files.some((f) => f.status === 'error');
		return [
			'lumi-file-upload__dropzone',
			isDragging && 'lumi-file-upload__dropzone--dragging',
			disabled && 'lumi-file-upload__dropzone--disabled',
			hasError && 'lumi-file-upload__dropzone--error'
		]
			.filter(Boolean)
			.join(' ');
	});

	// Process files with validation
	const processFiles = (fileList: File[]) => {
		if (disabled) return;

		const newFiles: FileUploadFile[] = fileList.map((file) => {
			const newFile: FileUploadFile = {
				id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 11)}`,
				file,
				status: 'selected',
				progress: 0
			};

			// Validation: max size
			if (maxSize > 0 && file.size > maxSize) {
				newFile.status = 'error';
				newFile.error = `Max size: ${formatFileSize(maxSize)}`;
			}

			return newFile;
		});

		if (multiple) {
			files = [...files, ...newFiles];
		} else {
			files = [newFiles[0]];
		}

		if (onchange) onchange(files);
	};

	// Event handlers
	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (!target.files) return;
		processFiles(Array.from(target.files));
		target.value = ''; // Reset to allow same file selection
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
		if (!disabled) isDragging = true;
	};

	const handleDragLeave = (event: DragEvent) => {
		event.preventDefault();
		isDragging = false;
	};

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		if (disabled) return;
		isDragging = false;
		if (!event.dataTransfer?.files) return;
		processFiles(Array.from(event.dataTransfer.files));
	};

	const handleDropzoneClick = (event: MouseEvent) => {
		if (disabled) return;

		const target = event.target as HTMLElement;

		// Don't open dialog if clicking on file items or interactive child elements
		if (
			target.closest('.lumi-file-upload__file-item') ||
			target.closest('.lumi-file-upload__add-more')
		) {
			return;
		}

		fileInputRef?.click();
	};

	const handleDropzoneKeydown = (event: KeyboardEvent) => {
		if (disabled) return;
		if (event.key !== 'Enter' && event.key !== ' ') return;

		const target = event.target as HTMLElement;

		// Only handle if the dropzone itself is focused, not child elements
		if (
			target.closest('.lumi-file-upload__file-item') ||
			target.closest('.lumi-file-upload__add-more')
		) {
			return;
		}

		event.preventDefault();
		fileInputRef?.click();
	};

	const openFileDialog = () => {
		if (!disabled) {
			fileInputRef?.click();
		}
	};

	const removeFile = (id: string) => {
		files = files.filter((f) => f.id !== id);
		if (onremove) onremove(id);
		if (onchange) onchange(files);
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
	};

	// Exposed API for programmatic control
	export const clear = () => {
		files = [];
		if (onchange) onchange(files);
	};

	export const upload = async () => {
		const filesToUpload = files.filter((f) => f.status === 'selected' || f.status === 'error');
		await Promise.all(filesToUpload.map(uploadFile));
	};

	// Simulated upload (replace with real API call)
	const uploadFile = (fileWrapper: FileUploadFile): Promise<FileUploadFile> => {
		return new Promise((resolve) => {
			if (fileWrapper.status !== 'selected' && fileWrapper.status !== 'error') {
				resolve(fileWrapper);
				return;
			}

			// Reset error state on re-upload attempt
			if (fileWrapper.status === 'error') {
				fileWrapper.status = 'selected';
				fileWrapper.error = undefined;
			}

			fileWrapper.status = 'uploading';
			fileWrapper.progress = 0;

			const interval = setInterval(() => {
				fileWrapper.progress += 10;
				if (fileWrapper.progress >= 100) {
					clearInterval(interval);
					fileWrapper.progress = 100;
					fileWrapper.status = 'success';
					resolve(fileWrapper);
				}
			}, 200);
		});
	};
</script>

<div class="lumi-file-upload {className}">
	<button
		type="button"
		class={dropzoneClasses()}
		onclick={handleDropzoneClick}
		onkeydown={handleDropzoneKeydown}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		{disabled}
		aria-label="File upload dropzone"
	>
		<!-- Hidden Input -->
		<input
			bind:this={fileInputRef}
			type="file"
			{accept}
			{multiple}
			{disabled}
			class="lumi-file-upload__input"
			onchange={handleFileChange}
		/>

		{#if files.length === 0}
			<!-- Placeholder (Empty State) -->
			<div class="lumi-file-upload__placeholder">
				<div class="lumi-file-upload__icon-wrapper">
					<Icon icon="upload" size="xl" class="lumi-file-upload__placeholder-icon" />
				</div>
				<span class="lumi-file-upload__placeholder-text">{placeholderText}</span>
				<span class="lumi-file-upload__placeholder-info">
					Drag your files here or click to select
				</span>
			</div>
		{:else}
			<!-- File List (Has Files State) -->
			<div class="lumi-file-upload__file-list" role="list" aria-label="Uploaded files">
				{#each files as fileWrapper (fileWrapper.id)}
					<div
						class="lumi-file-upload__file-item lumi-file-upload__file-item--{fileWrapper.status}"
						role="listitem"
						aria-label="File: {fileWrapper.file.name}"
					>
						<!-- File Icon -->
						<div class="lumi-file-upload__file-icon">
							<Icon icon="file" size="lg" />
						</div>

						<!-- File Details -->
						<div class="lumi-file-upload__file-item-details">
							<span class="lumi-file-upload__file-item-name" title={fileWrapper.file.name}>
								{fileWrapper.file.name}
							</span>
							<span class="lumi-file-upload__file-item-info">
								{#if fileWrapper.status === 'error'}
									<span class="lumi-text--danger">{fileWrapper.error}</span>
								{:else}
									{formatFileSize(fileWrapper.file.size)}
								{/if}
							</span>
						</div>

						<!-- Actions & Status -->
						<div class="lumi-file-upload__file-item-actions">
							{#if fileWrapper.status === 'uploading'}
								<Loading size="sm" color="primary" />
							{/if}
							{#if fileWrapper.status === 'success'}
								<Icon icon="checkCircle" color="var(--lumi-color-success)" size="md" />
							{/if}
							{#if ['selected', 'error'].includes(fileWrapper.status) && !disabled}
								<button
									type="button"
									class="lumi-file-upload__remove-btn"
									onclick={() => removeFile(fileWrapper.id)}
									aria-label="Remove file {fileWrapper.file.name}"
								>
									<Icon icon="x" size="sm" />
								</button>
							{/if}
						</div>

						<!-- Progress Bar -->
						{#if ['uploading', 'success'].includes(fileWrapper.status)}
							<div class="lumi-file-upload__progress-track">
								<div
									class="lumi-file-upload__progress-bar"
									style="width: {fileWrapper.progress}%"
									role="progressbar"
									aria-valuenow={fileWrapper.progress}
									aria-valuemin={0}
									aria-valuemax={100}
								></div>
							</div>
						{/if}
					</div>
				{/each}

				{#if multiple}
					<button
						type="button"
						class="lumi-file-upload__add-more"
						onclick={openFileDialog}
						{disabled}
					>
						<Icon icon="plus" size="sm" />
						<span>Add more files</span>
					</button>
				{/if}
			</div>
		{/if}
	</button>
</div>

<style>
	/* ============================================================================
	 * FILE UPLOAD COMPONENT - Modern, interactive, and consistent
	 * ============================================================================ */

	.lumi-file-upload {
		width: 100%;
		font-family: var(--lumi-font-family-sans);
	}

	/* Dropzone - using button element for native interactivity */
	.lumi-file-upload__dropzone {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 160px;
		padding: var(--lumi-space-lg);
		border: 2px dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-lg);
		background-color: var(--lumi-color-surface);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.lumi-file-upload__dropzone:not(:disabled):hover {
		border-color: var(--lumi-color-primary);
		background-color: var(--lumi-color-background-hover);
	}

	.lumi-file-upload__dropzone:focus-visible {
		outline: none;
		border-color: var(--lumi-color-primary);
		box-shadow: 0 0 0 4px var(--lumi-color-primary-bg);
	}

	.lumi-file-upload__dropzone--dragging {
		border-color: var(--lumi-color-primary);
		background-color: var(--lumi-color-primary-bg);
		transform: scale(1.01);
	}

	.lumi-file-upload__dropzone--disabled,
	.lumi-file-upload__dropzone:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: var(--lumi-color-background-secondary);
		border-style: solid;
	}

	.lumi-file-upload__dropzone--error {
		border-color: var(--lumi-color-danger);
		background-color: var(--lumi-color-danger-bg);
	}

	/* Placeholder shown when dropzone is empty */
	.lumi-file-upload__placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--lumi-space-sm);
		flex-grow: 1;
		color: var(--lumi-color-text-muted);
		padding: var(--lumi-space-lg);
	}

	.lumi-file-upload__icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--lumi-radius-full);
		background-color: var(--lumi-color-background-secondary);
		color: var(--lumi-color-text-muted);
		transition: all 0.2s ease;
		margin-bottom: var(--lumi-space-xs);
	}

	.lumi-file-upload__dropzone:hover .lumi-file-upload__icon-wrapper {
		background-color: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
		transform: scale(1.1);
	}

	.lumi-file-upload__placeholder-text {
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-file-upload__placeholder-info {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}

	/* Hidden native input */
	.lumi-file-upload__input {
		display: none;
	}

	/* File list inside dropzone */
	.lumi-file-upload__file-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		width: 100%;
	}

	/* Individual file item */
	.lumi-file-upload__file-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-md);
		background-color: var(--lumi-color-background);
		border: 1px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-md);
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
		cursor: default;
	}

	.lumi-file-upload__file-item:hover {
		border-color: var(--lumi-color-border-strong);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-file-upload__file-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--lumi-radius-md);
		background-color: var(--lumi-color-background-secondary);
		color: var(--lumi-color-text-muted);
	}

	.lumi-file-upload__file-item-details {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		gap: 2px;
	}

	.lumi-file-upload__file-item-name {
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-file-upload__file-item-info {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.lumi-file-upload__file-item-actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-file-upload__remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-sm);
		color: var(--lumi-color-text-muted);
		transition: all 0.2s ease;
	}

	.lumi-file-upload__remove-btn:hover {
		background-color: var(--lumi-color-danger-bg);
		color: var(--lumi-color-danger);
	}

	/* File item states */
	.lumi-file-upload__file-item--uploading .lumi-file-upload__progress-bar {
		background-color: var(--lumi-color-primary);
	}

	.lumi-file-upload__file-item--success {
		border-color: var(--lumi-color-success);
		background-color: color-mix(in srgb, var(--lumi-color-success) 5%, var(--lumi-color-surface));
	}

	.lumi-file-upload__file-item--success .lumi-file-upload__file-icon {
		background-color: var(--lumi-color-success-bg);
		color: var(--lumi-color-success);
	}

	.lumi-file-upload__file-item--error {
		border-color: var(--lumi-color-danger);
		background-color: var(--lumi-color-danger-bg);
	}

	.lumi-file-upload__file-item--error .lumi-file-upload__file-icon {
		background-color: var(--lumi-color-danger-bg);
		color: var(--lumi-color-danger);
	}

	/* Progress bar */
	.lumi-file-upload__progress-track {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background-color: transparent;
		overflow: hidden;
		grid-column: 1 / -1;
	}

	.lumi-file-upload__progress-bar {
		height: 100%;
		width: 0;
		background-color: var(--lumi-color-primary);
		transition: width 0.4s ease;
	}

	/* Add more button */
	.lumi-file-upload__add-more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-sm);
		background: transparent;
		border: 1px dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
	}

	.lumi-file-upload__add-more:hover:not(:disabled) {
		border-color: var(--lumi-color-primary);
		color: var(--lumi-color-primary);
		background-color: var(--lumi-color-primary-bg);
	}

	.lumi-file-upload__add-more:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
</style>
