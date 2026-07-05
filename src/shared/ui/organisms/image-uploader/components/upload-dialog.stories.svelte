<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, screen, waitFor } from 'storybook/test';
	import UploadDialog from './upload-dialog.svelte';
	import StoryHarness from './story-harness.svelte';
	import { ImageValidators } from '../lib/validators';
	import { pendingUpload, samplePng } from '../lib/mocks';
	import type { ImageUploaderController } from '../lib/create-image-uploader.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Upload dialog',
		component: UploadDialog,
		tags: ['autodocs']
	});

	const openEmpty = (c: ImageUploaderController) => c.openDialog();

	const openStaged = (c: ImageUploaderController) => {
		c.openDialog();
		void c.pickFiles([samplePng('a.png'), samplePng('b.png')]);
	};

	const openUploading = (c: ImageUploaderController) => {
		c.openDialog();
		void c.pickFiles([samplePng('a.png'), samplePng('b.png')]).then(() => c.confirm());
	};

	const openRejected = (c: ImageUploaderController) => {
		c.openDialog();
		void c.pickFiles([samplePng('rejected.png')]);
	};
</script>

<!-- shot2 — empty dropzone -->
<Story
	name="Empty"
	play={async () => {
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
		await expect(await screen.findByText('Σύρετε και αποθέστε')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<StoryHarness setup={openEmpty}><UploadDialog /></StoryHarness>
	{/snippet}
</Story>

<!-- shot4 — files staged, primary enabled -->
<Story
	name="Staged (valid)"
	play={async () => {
		await waitFor(() =>
			expect(document.querySelectorAll('[data-slot="upload-tile"]').length).toBe(2)
		);
		await expect(screen.getByRole('button', { name: 'Ανέβασμα' })).toBeEnabled();
	}}
>
	{#snippet template()}
		<StoryHarness setup={openStaged}><UploadDialog /></StoryHarness>
	{/snippet}
</Story>

<!-- shot5 — uploading (mock upload holds mid-progress) -->
<Story
	name="Uploading"
	play={async () => {
		await waitFor(() => expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument());
	}}
>
	{#snippet template()}
		<StoryHarness upload={pendingUpload} setup={openUploading}><UploadDialog /></StoryHarness>
	{/snippet}
</Story>

<!-- A3 — validation rejected -->
<Story
	name="Validation rejected"
	play={async () => {
		await waitFor(() =>
			expect(document.querySelector('[data-slot="upload-errors"]')).toBeInTheDocument()
		);
		await expect(screen.getByRole('button', { name: 'Ανέβασμα' })).toBeDisabled();
	}}
>
	{#snippet template()}
		<StoryHarness validators={[ImageValidators.accept(['image/jpeg'])]} setup={openRejected}>
			<UploadDialog />
		</StoryHarness>
	{/snippet}
</Story>
