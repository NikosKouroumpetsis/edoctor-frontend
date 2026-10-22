<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import UploadTile from './upload-tile.svelte';
	import StoryHarness from './story-harness.svelte';
	import { makeStaged } from '../lib/mocks';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Upload tile',
		component: UploadTile,
		tags: ['autodocs']
	});

	const valid = makeStaged({ status: 'valid' });
	const uploading = makeStaged({ status: 'uploading', progress: 60 });
	const done = makeStaged({ status: 'done', progress: 100 });
	const errored = makeStaged({ status: 'error' });
	const invalid = makeStaged({ status: 'invalid', issues: [{ code: 'maxSize' }] });
</script>

<!-- valid: dark circular remove (trash) -->
<Story
	name="Valid (remove)"
	play={async () => {
		await expect(
			document.querySelector('[data-slot="upload-tile"][data-status="valid"]')
		).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="w-narrow">
			<StoryHarness><UploadTile staged={valid} /></StoryHarness>
		</div>
	{/snippet}
</Story>

<!-- uploading: spinner overlay + progressbar + cancel -->
<Story
	name="Uploading"
	play={async () => {
		await expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="w-narrow">
			<StoryHarness><UploadTile staged={uploading} /></StoryHarness>
		</div>
	{/snippet}
</Story>

<!-- done: checkmark ring -->
<Story name="Done">
	{#snippet template()}
		<div class="w-narrow">
			<StoryHarness><UploadTile staged={done} /></StoryHarness>
		</div>
	{/snippet}
</Story>

<!-- error: destructive ring + reason -->
<Story name="Error">
	{#snippet template()}
		<div class="w-narrow">
			<StoryHarness><UploadTile staged={errored} /></StoryHarness>
		</div>
	{/snippet}
</Story>

<!-- invalid: per-tile validation error -->
<Story
	name="Invalid"
	play={async () => {
		await expect(
			document.querySelector('[data-slot="upload-tile"][data-status="invalid"]')
		).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="w-narrow">
			<StoryHarness><UploadTile staged={invalid} /></StoryHarness>
		</div>
	{/snippet}
</Story>
