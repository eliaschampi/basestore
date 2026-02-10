<script lang="ts">
	import DriveFileCard from './DriveFileCard.svelte';
	import type { DriveFileItem } from './types';

	interface Props {
		files: DriveFileItem[];
		selectedFiles: string[];
		isTrash?: boolean;
		onfileclick?: (file: DriveFileItem) => void;
		onfiledblclick?: (file: DriveFileItem) => void;
		onfilecontextmenu?: (event: MouseEvent, file: DriveFileItem) => void;
		onfiledragstart?: (event: DragEvent, file: DriveFileItem) => void;
		onfiledragend?: () => void;
		onfiledrop?: (event: DragEvent, file: DriveFileItem) => void;
	}

	const {
		files,
		selectedFiles,
		isTrash = false,
		onfileclick,
		onfiledblclick,
		onfilecontextmenu,
		onfiledragstart,
		onfiledragend,
		onfiledrop
	}: Props = $props();
</script>

<div class="lumi-grid lumi-grid--gap-md drive-file-grid">
	{#each files as file (file.code)}
		<DriveFileCard
			{file}
			selected={selectedFiles.includes(file.code)}
			{isTrash}
			onclick={onfileclick}
			ondblclick={onfiledblclick}
			oncontextmenu={onfilecontextmenu}
			ondragstart={onfiledragstart}
			ondragend={onfiledragend}
			ondrop={onfiledrop}
		/>
	{/each}
</div>

<style>
	.drive-file-grid {
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	}

	@media (max-width: 480px) {
		.drive-file-grid {
			grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
		}
	}
</style>
