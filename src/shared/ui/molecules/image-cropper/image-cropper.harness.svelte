<script lang="ts" module>
	import type { ImageCropRules, ImageSize } from '$shared/lib/image';

	// A picture's own pixels and the least a cut may hold of them: facts of a picture, never sizes of the page.
	const pixels = (width: number, height: number): ImageSize => ({ width, height });
	const least = (minWidth: number, minHeight: number): ImageCropRules => ({
		aspect: 4 / 3,
		minWidth,
		minHeight
	});
</script>

<script lang="ts">
	import { CENTRED_IMAGE_CROP, type ImageCrop } from '$shared/lib/image';
	import ImageCropper from './image-cropper.svelte';

	let {
		source = pixels(1200, 900),
		disabled = false,
		onCrop
	}: { source?: ImageSize; disabled?: boolean; onCrop?: (crop: ImageCrop) => void } = $props();

	let crop = $state<ImageCrop>(CENTRED_IMAGE_CROP);
	$effect(() => onCrop?.(crop));
</script>

<!-- Tests only: the cropper holding its own choice, as a caller's page does. -->
<p id="what-to-do">Σύρετε για να διαλέξετε τι φαίνεται.</p>
<ImageCropper
	src="/picture.webp"
	{source}
	rules={least(800, 600)}
	bind:crop
	label="Προσαρμογή"
	describedBy="what-to-do"
	zoomLabel="Μεγέθυνση"
	{disabled}
	testId="cropper"
/>
