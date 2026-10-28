<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import PhotoAddMore from './photo-add-more.svelte';
	import StoryHarness from './story-harness.svelte';
	import { seededItems } from '../lib/mocks';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Photo add more',
		component: PhotoAddMore,
		tags: ['autodocs']
	});
</script>

<!-- "Add more" tile — reopens the upload dialog -->
<Story
	name="Add more"
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Προσθήκη περισσοτέρων')).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Προσθήκη περισσοτέρων' }));
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<StoryHarness items={seededItems} minCount={5}>
				<PhotoAddMore />
			</StoryHarness>
		</div>
	{/snippet}
</Story>
