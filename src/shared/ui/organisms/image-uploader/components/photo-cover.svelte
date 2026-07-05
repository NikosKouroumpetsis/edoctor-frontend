<!--
  Cover photo (shot6) — the first item in the list, rendered wide with a
  "Cover photo" badge (top-left) and the per-photo overflow menu (top-right).
-->
<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import PhotoItemMenu from './photo-item-menu.svelte';
	import type { UploaderItem } from '../lib/types';

	let { item }: { item: UploaderItem } = $props();

	const src = $derived(item.kind === 'remote' ? item.url : item.previewUrl);
	const alt = $derived(item.kind === 'remote' ? (item.alt ?? '') : '');
</script>

<div data-slot="photo-cover" class="relative">
	<AspectRatio ratio={16 / 10} class="overflow-hidden rounded-media bg-muted">
		{#if src}
			<img {src} {alt} class="absolute inset-0 h-full w-full object-cover" />
		{/if}
	</AspectRatio>
	<span
		class="absolute top-3 left-3 rounded-full bg-card px-3 py-1 text-label-md text-foreground shadow-raised"
	>
		{m.image_uploader_cover_badge()}
	</span>
	<PhotoItemMenu id={item.id} class="absolute top-3 right-3" />
</div>
