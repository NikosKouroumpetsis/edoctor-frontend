<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, waitFor } from 'storybook/test';
	import UploadErrors from './upload-errors.svelte';
	import StoryHarness from './story-harness.svelte';
	import { ImageValidators } from '../lib/validators';
	import { remoteItem, sampleImage } from '../lib/mocks';
	import type { ImageUploaderController } from '../lib/create-image-uploader.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Upload errors',
		component: UploadErrors,
		tags: ['autodocs']
	});

	// Seed both surfaces: a jpeg passes (staged valid) so count(1)+1 > maxCount(1)
	// → count violation; the png is rejected by the accept validator → banner row.
	const seedErrors = (controller: ImageUploaderController) => {
		void controller.pickFiles([
			sampleImage('ok.jpg', 'image/jpeg'),
			sampleImage('bad.png', 'image/png')
		]);
	};
</script>

<Story
	name="Banner"
	play={async () => {
		await waitFor(() =>
			expect(document.querySelector('[data-slot="upload-errors"]')).toBeInTheDocument()
		);
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-text">
			<StoryHarness
				items={[remoteItem('x', '#2563eb')]}
				maxCount={1}
				validators={[ImageValidators.accept(['image/jpeg'])]}
				setup={seedErrors}
			>
				<UploadErrors />
			</StoryHarness>
		</div>
	{/snippet}
</Story>
