<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import PhotoCover from './photo-cover.svelte';
	import StoryHarness from './story-harness.svelte';
	import { remoteItem } from '../lib/mocks';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Photo cover',
		component: PhotoCover,
		tags: ['autodocs']
	});

	const cover = remoteItem('a', '#2563eb');
</script>

<!-- Cover with the "Cover photo" badge and the "…" menu -->
<Story
	name="Cover"
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Φωτογραφία εξώφυλλου')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: 'Επιλογές φωτογραφίας' })).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-md">
			<StoryHarness items={[cover]}>
				<PhotoCover item={cover} />
			</StoryHarness>
		</div>
	{/snippet}
</Story>
