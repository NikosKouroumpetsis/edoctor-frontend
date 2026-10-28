<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PhotoGrid } from '$shared/ui/organisms/photo-grid';
	import {
		brokenPhoto,
		photoPosition,
		samplePhotos
	} from '$shared/ui/organisms/media-card/media-card.sample';

	const photos = samplePhotos.map((uri, index) => ({
		uri,
		ariaLabel: photoPosition.el(index + 1, samplePhotos.length)
	}));
	const showAll = { label: 'Εμφάνιση όλων των φωτογραφιών', onclick: () => {} };
	const at = (value: string) => ({ viewport: { value, isRotated: false } });
	// Airbnb's listing column: 1120 in the centre (`listing`), the page gutters around it.
	const page = 'mx-auto max-w-listing px-gutter-sm py-card split:px-gutter-md desktop:px-gutter-lg';

	const { Story } = defineMeta({
		title: 'Organisms/PhotoGrid',
		component: PhotoGrid,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		globals: at('z1128'),
		args: { photos, showAll }
	});
</script>

<script lang="ts">
	let opened = $state<number | null>(null);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class={page}><PhotoGrid {...args} /></div>
	{/snippet}
</Story>

<Story name="On Tablet" globals={at('z744')}>
	{#snippet template()}
		<div class={page}><PhotoGrid {photos} {showAll} /></div>
	{/snippet}
</Story>

<Story name="Fewer Photos Than Slots">
	{#snippet template()}
		<!-- S-32.8: a slot without a photo keeps the silhouette. -->
		<div class={page}><PhotoGrid photos={photos.slice(0, 3)} {showAll} /></div>
	{/snippet}
</Story>

<Story name="Broken Photo">
	{#snippet template()}
		<!-- S-32.13: the slot whose photo fails takes the same silhouette. -->
		<div class={page}>
			<PhotoGrid
				photos={photos.map((photo, index) =>
					index === 2 ? { ...photo, uri: brokenPhoto } : photo
				)}
				{showAll}
			/>
		</div>
	{/snippet}
</Story>

<Story name="No Photo">
	{#snippet template()}
		<!-- No photo at all (or none that loads): ONE silhouette, no button. -->
		<div class={page}><PhotoGrid photos={[]} {showAll} /></div>
	{/snippet}
</Story>

<Story name="Press Opens Photo">
	{#snippet template()}
		<div class={page}>
			<PhotoGrid {photos} {showAll} onOpen={(index) => (opened = index)} />
			<p class="pt-3 text-body-sm text-muted-foreground">
				{opened === null ? 'Πατήστε μια φωτογραφία' : `Άνοιξε η φωτογραφία ${opened + 1}`}
			</p>
		</div>
	{/snippet}
</Story>

<Story name="Hidden Below Tablet" globals={at('z375')}>
	{#snippet template()}
		<p class="p-card text-body-sm text-muted-foreground">
			Κάτω από 744 το πλέγμα κρύβεται· τη θέση του παίρνει το CollapsingHero.
		</p>
		<PhotoGrid {photos} {showAll} />
	{/snippet}
</Story>
