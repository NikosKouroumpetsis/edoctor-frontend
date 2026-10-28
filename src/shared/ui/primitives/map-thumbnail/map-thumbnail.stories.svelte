<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MapThumbnail } from '$shared/ui/primitives/map-thumbnail';

	// The application's meta (`atoms/map-thumbnail`): the tile over a list photo's frame, the muted surface.
	const { Story } = defineMeta({
		title: 'Primitives/MapThumbnail',
		component: MapThumbnail,
		tags: ['autodocs']
	});
</script>

<!-- The tile over the bottom-end corner of a photo: inert, not announced. -->
<Story name="Bottom End">
	{#snippet template()}
		<div class="relative h-card-list-media w-full rounded-xl bg-muted">
			<MapThumbnail />
		</div>
	{/snippet}
</Story>
