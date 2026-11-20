<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ImageCropper } from '$shared/ui/molecules/image-cropper';

	// A picture's own pixels and the least a cut may hold of them: facts of a picture, never sizes of the page.
	const pixels = (width: number, height: number) => ({ width, height });
	const least = (minWidth: number, minHeight: number) => ({ aspect: 4 / 3, minWidth, minHeight });

	// A drawn stand-in for a stored picture (1200 × 900): bands and a circle, so a move and a zoom are easy to see.
	const picture = (width: number, height: number) =>
		`data:image/svg+xml,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#e2e8f0"/><rect width="${width / 3}" height="${height}" fill="#cbd5e1"/><rect x="${(width * 2) / 3}" width="${width / 3}" height="${height}" fill="#94a3b8"/><circle cx="${width / 2}" cy="${height / 3}" r="${height / 6}" fill="#475569"/></svg>`
		)}`;

	const { Story } = defineMeta({
		title: 'Molecules/ImageCropper',
		component: ImageCropper,
		tags: ['autodocs'],
		args: {
			src: picture(1200, 900),
			source: pixels(1200, 900),
			rules: least(800, 600),
			label: 'Προσαρμογή',
			zoomLabel: 'Μεγέθυνση',
			disabled: false
		},
		argTypes: {
			disabled: { control: 'boolean' },
			label: { control: 'text' },
			zoomLabel: { control: 'text' }
		}
	});
</script>

<script lang="ts">
	import { CENTRED_IMAGE_CROP, imageCropRect, type ImageCrop } from '$shared/lib/image';

	let stored = $state<ImageCrop>(CENTRED_IMAGE_CROP);
	let tall = $state<ImageCrop>(CENTRED_IMAGE_CROP);
	let exact = $state<ImageCrop>(CENTRED_IMAGE_CROP);
	const cutOf = (width: number, height: number, crop: ImageCrop) => {
		const rect = imageCropRect(pixels(width, height), least(800, 600), crop);
		return `${rect.width} × ${rect.height} · ${rect.x}, ${rect.y}`;
	};
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="max-w-form">
			<ImageCropper {...args} bind:crop={stored} />
			<p class="mt-2 text-body-sm text-muted-foreground">{cutOf(1200, 900, stored)}</p>
		</div>
	{/snippet}
</Story>

<Story name="A Tall Picture">
	{#snippet template(args)}
		<div class="max-w-form">
			<ImageCropper
				{...args}
				src={picture(1500, 2000)}
				source={pixels(1500, 2000)}
				bind:crop={tall}
			/>
			<p class="mt-2 text-body-sm text-muted-foreground">{cutOf(1500, 2000, tall)}</p>
		</div>
	{/snippet}
</Story>

<Story name="No Room To Go In">
	{#snippet template(args)}
		<div class="max-w-form">
			<ImageCropper {...args} src={picture(800, 600)} source={pixels(800, 600)} bind:crop={exact} />
		</div>
	{/snippet}
</Story>

<Story name="Asleep">
	{#snippet template(args)}
		<div class="max-w-form">
			<ImageCropper {...args} disabled />
		</div>
	{/snippet}
</Story>
