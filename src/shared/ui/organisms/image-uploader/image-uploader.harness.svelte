<!--
  Stateful test/story harness for the image-uploader.

  Creates a real controller, publishes it through context, and renders the
  live surfaces (empty ↔ gallery) plus the upload dialog — the same wiring the
  orchestrator uses, but with the controller exposed so stories can inject a
  mock progressive `upload`, validators, counts, and `autoOpen` to exercise
  every state without a real transport.
-->
<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { setImageUploaderContext } from './lib/context';
	import { createImageUploader } from './lib/create-image-uploader.svelte';
	import UploaderEmpty from './components/uploader-empty.svelte';
	import PhotoGallery from './components/photo-gallery.svelte';
	import UploadDialog from './components/upload-dialog.svelte';
	import type { ImageUploaderOptions } from './lib/types';

	let {
		items = [],
		accept,
		multiple = true,
		minCount,
		maxCount,
		validators,
		upload,
		onChange,
		onReject,
		onEdit,
		autoOpen = false
	}: ImageUploaderOptions & { autoOpen?: boolean } = $props();

	// Seed the controller once from the initial prop values (a harness owns its
	// own state); `untrack` keeps these init-only reads out of reactive scope.
	const controller = untrack(() =>
		createImageUploader({
			items,
			accept,
			multiple,
			minCount,
			maxCount,
			validators,
			upload,
			onChange,
			onReject,
			onEdit
		})
	);
	setImageUploaderContext(controller);

	if (untrack(() => autoOpen)) controller.openDialog();

	onDestroy(() => controller.destroy());
</script>

<div class="mx-auto max-w-xl p-6">
	{#if controller.count === 0}
		<UploaderEmpty />
	{:else}
		<PhotoGallery />
	{/if}
	<UploadDialog />
</div>
