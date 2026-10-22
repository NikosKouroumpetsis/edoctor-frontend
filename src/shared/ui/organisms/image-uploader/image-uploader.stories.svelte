<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen, waitFor } from 'storybook/test';
	import Harness from './image-uploader.harness.svelte';
	import ImageUploader from './image-uploader.svelte';
	import { ImageValidators } from './lib/validators';
	import { failingUpload, mockUpload, samplePng, seededItems } from './lib/mocks';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader',
		component: Harness,
		tags: ['autodocs']
	});

	function fileInput(): HTMLInputElement {
		return document.querySelector('input[type="file"]') as HTMLInputElement;
	}
</script>

<!-- shot2 — empty dropzone -->
<Story
	name="Dialog · empty"
	args={{ autoOpen: true }}
	play={async () => {
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
		await expect(await screen.findByText('Σύρετε και αποθέστε')).toBeInTheDocument();
	}}
/>

<!-- shot4 — files selected, remove affordance, primary enabled -->
<Story
	name="Dialog · selected"
	args={{ autoOpen: true }}
	play={async () => {
		await screen.findByRole('dialog');
		await userEvent.upload(fileInput(), [samplePng('a.png'), samplePng('b.png')]);
		await waitFor(() =>
			expect(document.querySelectorAll('[data-slot="upload-tile"]').length).toBe(2)
		);
		await expect(screen.getByRole('button', { name: 'Ανέβασμα' })).toBeEnabled();
	}}
/>

<!-- shot5 — uploading, then committed via the mock uploader -->
<Story
	name="Dialog · uploading (mock)"
	args={{ autoOpen: true, upload: mockUpload }}
	play={async () => {
		await screen.findByRole('dialog');
		await userEvent.upload(fileInput(), [samplePng('a.png'), samplePng('b.png')]);
		await waitFor(() =>
			expect(document.querySelectorAll('[data-slot="upload-tile"]').length).toBe(2)
		);
		await userEvent.click(screen.getByRole('button', { name: 'Ανέβασμα' }));
		// Dialog auto-closes once every upload settles successfully.
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
			timeout: 4000
		});
	}}
/>

<!-- A3 — validation banner + per-tile error state -->
<Story
	name="Dialog · validation (jpeg only)"
	args={{ autoOpen: true, validators: [ImageValidators.accept(['image/jpeg'])] }}
	play={async () => {
		await screen.findByRole('dialog');
		await userEvent.upload(fileInput(), [samplePng('rejected.png')]);
		await waitFor(() =>
			expect(document.querySelector('[data-slot="upload-errors"]')).toBeInTheDocument()
		);
		await expect(screen.getByRole('button', { name: 'Ανέβασμα' })).toBeDisabled();
	}}
/>

<!-- Upload failure keeps the dialog open and marks the tile as errored -->
<Story
	name="Dialog · upload error"
	args={{ autoOpen: true, upload: failingUpload }}
	play={async () => {
		await screen.findByRole('dialog');
		await userEvent.upload(fileInput(), [samplePng('a.png')]);
		await waitFor(() =>
			expect(document.querySelectorAll('[data-slot="upload-tile"]').length).toBe(1)
		);
		await userEvent.click(screen.getByRole('button', { name: 'Ανέβασμα' }));
		await waitFor(() =>
			expect(document.querySelector('[data-status="error"]')).toBeInTheDocument()
		);
		await expect(screen.getByRole('dialog')).toBeInTheDocument();
	}}
/>

<!-- shot1 — empty / entry surface; the CTA opens the upload dialog -->
<Story
	name="Empty (entry)"
	args={{ minCount: 5 }}
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Προσθέστε μερικές φωτογραφίες')).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Προσθέστε φωτογραφίες' }));
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
	}}
/>

<!-- shot6 — gallery with cover, filled tile, placeholders and add-more -->
<Story name="Gallery" args={{ items: seededItems, minCount: 5 }} />

<!-- Keyboard reorder: focus the 2nd item and move it left into the cover slot -->
<Story
	name="Gallery · keyboard reorder"
	args={{ items: seededItems, minCount: 5 }}
	play={async ({ canvas }) => {
		// Drag handles carry the reorder hint in their aria-label; [1] is item "b".
		const handles = canvas.getAllByRole('button', { name: /Σύρετε/ });
		handles[1].focus();
		await userEvent.keyboard('{ArrowLeft}');
		const coverImg = document.querySelector('[data-slot="photo-cover"] img') as HTMLImageElement;
		// "b" (#16a34a) is now the cover; its data-URI encodes the green hex.
		await expect(coverImg.src).toContain(encodeURIComponent('#16a34a'));
	}}
/>

<!-- Trigger-driven default (empty) for the docs page -->
<Story name="Default" args={{ minCount: 5 }} />

<!-- όλα μαζί — the real orchestrator wiring the whole flow end-to-end -->
<Story
	name="All together (full flow)"
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Επιλέξτε τουλάχιστον 5 φωτογραφίες')).toBeInTheDocument();
		await expect(canvas.getByText('Φωτογραφία εξώφυλλου')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-form">
			<ImageUploader items={seededItems} minCount={5} upload={mockUpload} />
		</div>
	{/snippet}
</Story>
