<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import PhotoTile from './photo-tile.svelte';
	import StoryHarness from './story-harness.svelte';
	import { remoteItem } from '../lib/mocks';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Photo tile',
		component: PhotoTile,
		tags: ['autodocs']
	});

	const item = remoteItem('b', '#16a34a');
</script>

<!--
  A single filled grid tile with its "…" menu. NOTE: the drag handle is provided
  by the gallery wrapper (photo-gallery), not by photo-tile itself, so it does
  not appear in this isolated part story.
-->
<Story
	name="Filled tile"
	play={async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: 'Επιλογές φωτογραφίας' })).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<StoryHarness items={[item]}>
				<PhotoTile {item} />
			</StoryHarness>
		</div>
	{/snippet}
</Story>
