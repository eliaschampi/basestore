import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true
	},
	ssr: {
		noExternal: [
			'layerchart',
			'layercake',
			'@layerstack/svelte-actions',
			'@layerstack/svelte-stores',
			'@layerstack/tailwind',
			'@layerstack/utils'
		]
	}
});
