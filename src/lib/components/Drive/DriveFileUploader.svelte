<script lang="ts">
	import { Alert, Button, Dialog, Icon } from '$lib/components';
	import { formatFileSize, MAX_FILE_SIZE } from '$lib/utils/drive';

	interface QueuedFile {
		id: string;
		file: File;
	}

	interface Props {
		open: boolean;
		onupload?: (file: File, customName?: string) => Promise<void>;
		onclose?: () => void;
	}

	let { open = $bindable(false), onupload, onclose }: Props = $props();

	let queue = $state<QueuedFile[]>([]);
	let uploading = $state(false);
	let dragOver = $state(false);
	let errorMessage = $state('');

	let fileInput: HTMLInputElement | undefined = $state();

	function addFiles(fileList: FileList) {
		errorMessage = '';
		const additions: QueuedFile[] = [];

		for (const file of Array.from(fileList)) {
			if (file.size > MAX_FILE_SIZE) {
				errorMessage = `"${file.name}" excede el tamaño máximo de ${formatFileSize(MAX_FILE_SIZE)}`;
				continue;
			}

			if (file.size === 0) {
				errorMessage = `"${file.name}" está vacío`;
				continue;
			}

			additions.push({
				id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
				file
			});
		}

		queue = [...queue, ...additions];
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const files = event.dataTransfer?.files;
		if (files) {
			addFiles(files);
		}
	}

	function handleSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		if (!input?.files) {
			return;
		}

		addFiles(input.files);
		input.value = '';
	}

	function removeFromQueue(id: string) {
		queue = queue.filter((item) => item.id !== id);
	}

	async function uploadQueuedFiles() {
		if (queue.length === 0 || uploading) {
			return;
		}

		uploading = true;
		errorMessage = '';

		try {
			for (const item of queue) {
				await onupload?.(item.file);
			}

			queue = [];
			open = false;
			onclose?.();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al subir archivos';
		} finally {
			uploading = false;
		}
	}

	function closeDialog() {
		if (uploading) {
			return;
		}

		queue = [];
		errorMessage = '';
		open = false;
		onclose?.();
	}
</script>

<Dialog bind:open title="Subir archivos" size="md" persistent={uploading}>
	<div class="lumi-stack lumi-space--md">
		{#if errorMessage}
			<Alert type="warning" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
		{/if}

		<div
			class="drive-uploader__dropzone"
			class:drive-uploader__dropzone--active={dragOver}
			onclick={() => fileInput?.click()}
			onkeydown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					fileInput?.click();
				}
			}}
			ondragover={(event) => {
				event.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			ondrop={handleDrop}
			role="button"
			tabindex="0"
		>
			<Icon icon="upload" size="40px" color="muted" />
			<p class="lumi-text--sm">
				Arrastra archivos aquí o <strong>haz clic para seleccionar</strong>
			</p>
			<p class="lumi-text--xs lumi-text--muted">
				Máximo {formatFileSize(MAX_FILE_SIZE)} por archivo
			</p>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			multiple
			class="drive-uploader__hidden-input"
			onchange={handleSelect}
		/>

		{#if queue.length > 0}
			<div class="lumi-stack lumi-space--xs drive-uploader__queue">
				{#each queue as item (item.id)}
					<div class="drive-uploader__queue-item">
						<div class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-flex-item--grow">
							<Icon icon="file" size="16px" />
							<span class="drive-uploader__filename" title={item.file.name}>{item.file.name}</span>
							<span class="lumi-text--xs lumi-text--muted">{formatFileSize(item.file.size)}</span>
						</div>
						<Button
							type="flat"
							size="sm"
							icon="x"
							color="danger"
							onclick={() => removeFromQueue(item.id)}
							disabled={uploading}
						/>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button type="border" onclick={closeDialog} disabled={uploading}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			icon="upload"
			loading={uploading}
			disabled={queue.length === 0}
			onclick={uploadQueuedFiles}
		>
			Subir {queue.length > 0 ? `(${queue.length})` : ''}
		</Button>
	{/snippet}
</Dialog>

<style>
	.drive-uploader__dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-2xl);
		border: 2px dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		background: var(--lumi-color-surface);
		cursor: pointer;
		text-align: center;
		transition: var(--lumi-transition-all);
	}

	.drive-uploader__dropzone:hover,
	.drive-uploader__dropzone--active {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 4%, var(--lumi-color-surface));
	}

	.drive-uploader__hidden-input {
		display: none;
	}

	.drive-uploader__queue {
		max-height: 240px;
		overflow-y: auto;
	}

	.drive-uploader__queue-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
	}

	.drive-uploader__filename {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
