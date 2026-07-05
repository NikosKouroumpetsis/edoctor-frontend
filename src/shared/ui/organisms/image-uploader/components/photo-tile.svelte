<!--
  Filled grid tile (shot6) — a square photo with the per-photo overflow menu.
  Drag/keyboard reordering is wired by the gallery wrapper around this tile.
-->
<script lang="ts">
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import PhotoItemMenu from './photo-item-menu.svelte';
	import type { UploaderItem } from '../lib/types';

	let { item }: { item: UploaderItem } = $props();

	const src = $derived(item.kind === 'remote' ? item.url : item.previewUrl);
	const alt = $derived(item.kind === 'remote' ? (item.alt ?? '') : '');
</script>

<div data-slot="photo-tile" class="relative">
	<AspectRatio ratio={1} class="overflow-hidden rounded-media bg-muted">
		{#if src}
			<img {src} {alt} class="absolute inset-0 h-full w-full object-cover" />
		{/if}
	</AspectRatio>
	<PhotoItemMenu id={item.id} class="absolute top-2 right-2" />
</div>
