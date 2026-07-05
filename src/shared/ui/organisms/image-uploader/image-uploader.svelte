<!--
  Image uploader — orchestrator (surfaces A/B/D).

  Owns a controller, publishes it through context, and renders the entry
  surface (empty) or the gallery based on how many photos exist, with the
  upload dialog always mounted (portal-based, visible only while open).

  `items` is a `$bindable` prop (decision A2) so callers can use it controlled
  or uncontrolled; the controller stays the source of truth and writes back on
  every change. Copy is overridable per decision D-3. Browser-only lifecycle
  (object URLs) is revoked on destroy.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy, untrack } from 'svelte';
	import { setImageUploaderContext } from './lib/context';
	import { createImageUploader } from './lib/create-image-uploader.svelte';
	import UploaderEmpty from './components/uploader-empty.svelte';
	import PhotoGallery from './components/photo-gallery.svelte';
	import UploadDialog from './components/upload-dialog.svelte';
	import type { ImageUploaderOptions, ImageValidatorFn, UploadFn, UploaderItem } from './lib/types';

	let {
		items = $bindable([]),
		accept,
		multiple = true,
		minCount,
		maxCount,
		validators,
		upload,
		onChange,
		onReject,
		onEdit,
		title,
		subtitle,
		emptyCta,
		illustration
	}: {
		items?: UploaderItem[];
		accept?: string;
		multiple?: boolean;
		minCount?: number;
		maxCount?: number;
		validators?: ImageValidatorFn[];
		upload?: UploadFn;
		onChange?: ImageUploaderOptions['onChange'];
		onReject?: ImageUploaderOptions['onReject'];
		onEdit?: ImageUploaderOptions['onEdit'];
		title?: string;
		subtitle?: string;
		emptyCta?: string;
		illustration?: Snippet;
	} = $props();

	const controller = untrack(() =>
		createImageUploader({
			items,
			accept,
			multiple,
			minCount,
			maxCount,
			validators,
			upload,
			onReject,
			onEdit,
			onChange: (next) => {
				items = next;
				onChange?.(next);
			}
		})
	);
	setImageUploaderContext(controller);

	// Adopt externally-controlled `items` updates without clobbering the
	// controller's own in-place changes (guarded by a shallow identity check).
	$effect(() => {
		const external = items;
		untrack(() => {
			if (external === controller.items) return;
			const same =
				external.length === controller.items.length &&
				external.every((item, i) => item === controller.items[i]);
			if (!same) controller.setItems(external);
		});
	});

	onDestroy(() => controller.destroy());
</script>

<div data-slot="image-uploader">
	{#if controller.count === 0}
		<UploaderEmpty {title} {subtitle} cta={emptyCta} {illustration} />
	{:else}
		<PhotoGallery />
	{/if}
	<UploadDialog />
</div>
