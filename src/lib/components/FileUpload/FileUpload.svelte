<script lang="ts">
	import { Icon } from "../Icon";
	import { Loading } from "../Loading";
	import type { FileUploadFile, FileUploadProps } from "./types";

	let {
		files = $bindable([]),
		placeholderText = "Upload your files",
		accept = "*",
		multiple = false,
		maxSize = 0,
		disabled = false,
		class: className = "",
		onchange,
		onremove
	}: FileUploadProps = $props();

	let fileInputRef: HTMLInputElement | undefined = $state();
	let isDragging = $state(false);

	// Computed classes
	const dropzoneClasses = $derived(() => {
		const hasError = files.some((f) => f.status === "error");
		return [
			"lumi-file-upload__dropzone",
			isDragging && "lumi-file-upload__dropzone--dragging",
			disabled && "lumi-file-upload__dropzone--disabled",
			hasError && "lumi-file-upload__dropzone--error"
		]
			.filter(Boolean)
			.join(" ");
	});

	// Process files with validation
	const processFiles = (fileList: File[]) => {
		if (disabled) return;

		const newFiles: FileUploadFile[] = fileList.map((file) => {
			const newFile: FileUploadFile = {
				id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 11)}`,
				file,
				status: "selected",
				progress: 0
			};

			// Validation: max size
			if (maxSize > 0 && file.size > maxSize) {
				newFile.status = "error";
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
		target.value = ""; // Reset to allow same file selection
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

	const openFileDialog = () => {
		// Only open dialog if empty, otherwise the div acts as container
		if (files.length === 0 && !disabled) {
			fileInputRef?.click();
		}
	};

	const removeFile = (id: string) => {
		files = files.filter((f) => f.id !== id);
		if (onremove) onremove(id);
		if (onchange) onchange(files);
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
	};

	// Exposed API for programmatic control
	export const clear = () => {
		files = [];
		if (onchange) onchange(files);
	};

	export const upload = async () => {
		const filesToUpload = files.filter((f) => f.status === "selected" || f.status === "error");
		await Promise.all(filesToUpload.map(uploadFile));
	};

	// Simulated upload (replace with real API call)
	const uploadFile = (fileWrapper: FileUploadFile): Promise<FileUploadFile> => {
		return new Promise((resolve) => {
			if (fileWrapper.status !== "selected" && fileWrapper.status !== "error") {
				resolve(fileWrapper);
				return;
			}

			// Reset error state on re-upload attempt
			if (fileWrapper.status === "error") {
				fileWrapper.status = "selected";
				fileWrapper.error = undefined;
			}

			fileWrapper.status = "uploading";
			fileWrapper.progress = 0;

			const interval = setInterval(() => {
				fileWrapper.progress += 10;
				if (fileWrapper.progress >= 100) {
					clearInterval(interval);
					fileWrapper.progress = 100;
					fileWrapper.status = "success";
					resolve(fileWrapper);
				}
			}, 200);
		});
	};
</script>

<div class="lumi-file-upload {className}">
	<div
		class={dropzoneClasses()}
		onclick={openFileDialog}
		onkeydown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				openFileDialog();
			}
		}}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="button"
		tabindex={disabled ? -1 : 0}
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
				<Icon icon="upload" size="3xl" class="lumi-file-upload__placeholder-icon" />
				<span class="lumi-file-upload__placeholder-text">{placeholderText}</span>
				<span class="lumi-file-upload__placeholder-info">
					Drag your files here or click to select
				</span>
			</div>
		{:else}
			<!-- File List (Has Files State) -->
			<div class="lumi-file-upload__file-list">
				{#each files as fileWrapper (fileWrapper.id)}
					<div
						class="lumi-file-upload__file-item lumi-file-upload__file-item--{fileWrapper.status}"
					>
						<!-- File Icon -->
						<Icon icon="file" class="lumi-file-upload__file-item-icon" />

						<!-- File Details -->
						<div class="lumi-file-upload__file-item-details">
							<span class="lumi-file-upload__file-item-name">{fileWrapper.file.name}</span>
							<span class="lumi-file-upload__file-item-info">
								{#if fileWrapper.status === "error"}
									{fileWrapper.error}
								{:else}
									{formatFileSize(fileWrapper.file.size)}
								{/if}
							</span>
						</div>

						<!-- Actions & Status -->
						<div class="lumi-file-upload__file-item-actions">
							{#if fileWrapper.status === "uploading"}
								<Loading color="primary" />
							{/if}
							{#if fileWrapper.status === "success"}
								<Icon icon="checkCircle" color="success" />
							{/if}
							{#if ["selected", "error"].includes(fileWrapper.status) && !disabled}
								<button
									type="button"
									class="lumi-file-upload__remove-btn"
									onclick={(e) => {
										e.stopPropagation();
										removeFile(fileWrapper.id);
									}}
									aria-label="Remove file"
								>
									<Icon icon="x" color="danger" size="sm" />
								</button>
							{/if}
						</div>

						<!-- Progress Bar -->
						{#if ["uploading", "success"].includes(fileWrapper.status)}
							<div class="lumi-file-upload__progress-track">
								<div
									class="lumi-file-upload__progress-bar"
									style="width: {fileWrapper.progress}%"
								></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* ============================================================================
	 * FILE UPLOAD COMPONENT - Modern, interactive, and consistent
	 * ============================================================================ */

	.lumi-file-upload {
		width: 100%;
		font-family: var(--lumi-font-family-sans);
	}

	/* Dropzone - core element that transforms based on state */
	.lumi-file-upload__dropzone {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 10rem;
		padding: var(--lumi-space-lg);
		border: 1px dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-lg);
		background-color: var(--lumi-color-background);
		transition: all var(--lumi-transition-base);
		position: relative;
		overflow: hidden;
		cursor: pointer;
	}

	.lumi-file-upload__dropzone:not(.lumi-file-upload__dropzone--disabled):hover {
		border-color: var(--lumi-color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
	}

	.lumi-file-upload__dropzone--dragging {
		border-color: var(--lumi-color-primary);
		background-color: color-mix(
			in srgb,
			var(--lumi-color-primary) 5%,
			var(--lumi-color-background)
		);
		transform: scale(1.01);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
	}

	.lumi-file-upload__dropzone--disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: var(--lumi-color-background);
	}

	.lumi-file-upload__dropzone--error {
		border-color: var(--lumi-color-danger);
		background-color: color-mix(in srgb, var(--lumi-color-danger) 5%, var(--lumi-color-background));
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
	}

	.lumi-file-upload__placeholder-icon {
		color: var(--lumi-color-primary);
		opacity: 0.8;
		transition: transform var(--lumi-transition-base);
	}

	.lumi-file-upload__placeholder:hover .lumi-file-upload__placeholder-icon {
		transform: scale(1.1);
	}

	.lumi-file-upload__placeholder-text {
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.lumi-file-upload__placeholder-info {
		font-size: var(--lumi-font-size-sm);
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
		overflow-y: auto;
		max-height: 300px;
	}

	/* Individual file item */
	.lumi-file-upload__file-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		background-color: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-md);
		border: 1px solid transparent;
		transition: all var(--lumi-transition-base);
	}

	.lumi-file-upload__file-item-icon {
		color: var(--lumi-color-text-muted);
	}

	.lumi-file-upload__file-item-details {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.lumi-file-upload__file-item-name {
		font-weight: var(--lumi-font-weight-medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lumi-file-upload__file-item-info {
		font-size: var(--lumi-font-size-sm);
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
		padding: var(--lumi-space-2xs);
		border-radius: var(--lumi-radius-sm);
		transition: background-color var(--lumi-transition-base);
	}

	.lumi-file-upload__remove-btn:hover {
		background-color: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
	}

	/* File item states */
	.lumi-file-upload__file-item--uploading .lumi-file-upload__progress-bar {
		background-color: var(--lumi-color-primary);
	}

	.lumi-file-upload__file-item--success {
		border-color: var(--lumi-color-success);
	}

	.lumi-file-upload__file-item--success .lumi-file-upload__progress-bar {
		background-color: var(--lumi-color-success);
		width: 100% !important;
	}

	.lumi-file-upload__file-item--error {
		border-color: var(--lumi-color-danger);
		background-color: color-mix(in srgb, var(--lumi-color-danger) 5%, var(--lumi-color-surface));
	}

	.lumi-file-upload__file-item--error .lumi-file-upload__file-item-info {
		color: var(--lumi-color-danger);
	}

	/* Progress bar */
	.lumi-file-upload__progress-track {
		grid-column: 1 / -1;
		height: 4px;
		background-color: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
		margin-top: var(--lumi-space-xs);
		overflow: hidden;
	}

	.lumi-file-upload__progress-bar {
		height: 100%;
		width: 0;
		border-radius: inherit;
		background-color: var(--lumi-color-primary);
		transition: width 0.4s ease;
	}
</style>
