<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, fireEvent } from 'storybook/test';
	import UploadDropzone from './upload-dropzone.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Upload dropzone',
		component: UploadDropzone,
		tags: ['autodocs']
	});

	// This part is presentational (no context) — its `onbrowse`/`ondropfiles`
	// are wired by the dialog; here they are inert.
	const noop = () => {};
</script>

<Story
	name="Default"
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Σύρετε και αποθέστε')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: 'Περιήγηση' })).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-text">
			<UploadDropzone onbrowse={noop} ondropfiles={noop} />
		</div>
	{/snippet}
</Story>

<Story
	name="Drag over"
	play={async () => {
		const zone = document.querySelector('[data-slot="upload-dropzone"]') as HTMLElement;
		await fireEvent.dragOver(zone);
		await expect(zone).toHaveAttribute('data-drag-over');
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-text">
			<UploadDropzone onbrowse={noop} ondropfiles={noop} />
		</div>
	{/snippet}
</Story>
