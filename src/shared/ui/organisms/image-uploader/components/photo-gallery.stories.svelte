<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import PhotoGallery from './photo-gallery.svelte';
	import StoryHarness from './story-harness.svelte';
	import { seededItems } from '../lib/mocks';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Photo gallery',
		component: PhotoGallery,
		tags: ['autodocs']
	});
</script>

<!-- shot6 — cover + filled tiles + placeholders + add-more -->
<Story
	name="Grid (shot6)"
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Φωτογραφία εξώφυλλου')).toBeInTheDocument();
		await expect(canvas.getByText('Προσθήκη περισσοτέρων')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-xl">
			<StoryHarness items={seededItems} minCount={5}>
				<PhotoGallery />
			</StoryHarness>
		</div>
	{/snippet}
</Story>
