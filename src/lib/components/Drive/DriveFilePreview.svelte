<script lang="ts">
	import { Button, Dialog, Icon } from '$lib/components';
	import type { DriveFileItem } from './types';

	interface Props {
		open: boolean;
		file: DriveFileItem | null;
		ondownload?: (file: DriveFileItem) => void;
	}

	let { open = $bindable(false), file, ondownload }: Props = $props();

	const previewUrl = $derived(file ? `/api/drive/${file.code}/serve` : '');
	const isImage = $derived(file?.type === 'img');
	const isVideo = $derived(file?.type === 'vid');
	const isAudio = $derived(file?.type === 'aud');
	const isPdf = $derived(
		file?.mime_type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')
	);
</script>

<Dialog bind:open title={file?.name || 'Vista previa'} size="lg">
	<div class="drive-preview">
		{#if !file}
			<div class="drive-preview__empty">
				<Icon icon="file" size="48px" color="var(--lumi-color-text-muted)" />
				<p>No hay archivo seleccionado</p>
			</div>
		{:else if isImage}
			<div class="drive-preview__media-wrap">
				<img src={previewUrl} alt={file.name} class="drive-preview__image" />
			</div>
		{:else if isVideo}
			<div class="drive-preview__media-wrap">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={previewUrl} controls class="drive-preview__video">
					Tu navegador no soporta la reproducción de video.
				</video>
			</div>
		{:else if isAudio}
			<div class="drive-preview__audio-wrap">
				<Icon icon="music" size="64px" color="warning" />
				<audio src={previewUrl} controls class="drive-preview__audio">
					Tu navegador no soporta la reproducción de audio.
				</audio>
			</div>
		{:else if isPdf}
			<div class="drive-preview__pdf-wrap">
				<iframe src={previewUrl} title={file.name} class="drive-preview__pdf"></iframe>
			</div>
		{:else}
			<div class="drive-preview__empty">
				<Icon icon="file" size="48px" color="var(--lumi-color-text-muted)" />
				<p>Vista previa no disponible para este tipo de archivo</p>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button type="border" onclick={() => (open = false)}>Cerrar</Button>
		{#if file}
			<Button type="filled" color="primary" icon="download" onclick={() => ondownload?.(file)}>
				Descargar
			</Button>
		{/if}
	{/snippet}
</Dialog>

<style>
	.drive-preview {
		min-height: 280px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.drive-preview__media-wrap {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.drive-preview__image {
		max-width: 100%;
		max-height: 70vh;
		object-fit: contain;
		border-radius: var(--lumi-radius-md);
	}

	.drive-preview__video {
		width: 100%;
		max-height: 70vh;
		border-radius: var(--lumi-radius-md);
	}

	.drive-preview__audio-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--lumi-space-lg);
		padding: var(--lumi-space-xl);
		width: 100%;
	}

	.drive-preview__audio {
		width: 100%;
		max-width: 440px;
	}

	.drive-preview__pdf-wrap {
		width: 100%;
		height: 70vh;
	}

	.drive-preview__pdf {
		width: 100%;
		height: 100%;
		border: none;
		border-radius: var(--lumi-radius-md);
	}

	.drive-preview__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		text-align: center;
	}
</style>
