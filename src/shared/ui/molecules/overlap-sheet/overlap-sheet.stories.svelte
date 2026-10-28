<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { OverlapSheet } from '$shared/ui/molecules/overlap-sheet';
	import { CollapsingHero } from '$shared/ui/organisms/collapsing-hero';
	import { PhotoGrid } from '$shared/ui/organisms/photo-grid';
	import { samplePhotos } from '$shared/ui/organisms/media-card/media-card.sample';

	const photos = samplePhotos.map((uri, index) => ({ uri, ariaLabel: `Φωτογραφία ${index + 1}` }));

	const { Story } = defineMeta({
		title: 'Molecules/OverlapSheet',
		component: OverlapSheet,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		argTypes: { flatFrom: { control: 'select', options: ['tablet', 'none'] } }
	});
</script>

{#snippet blocks()}
	<div class="flex flex-col gap-1">
		<p class="text-heading-sm font-semibold text-foreground">Μαρία Παπαδοπούλου</p>
		<p class="text-body-md text-muted-foreground">Καρδιολόγος · Αθήνα</p>
	</div>
	<p class="text-body-lg text-foreground/80">Δεύτερο μπλοκ, ένα section πιο κάτω.</p>
{/snippet}

<Story name="Over a photo on the phone" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<CollapsingHero height="hero-h" imageUrl={samplePhotos[0]} countLabel="1 / 5" />
		<OverlapSheet>{@render blocks()}</OverlapSheet>
	{/snippet}
</Story>

<Story
	name="Flat under the grid from the tablet"
	globals={{ viewport: { value: 'z1128', isRotated: false } }}
>
	{#snippet template()}
		<!-- From 744 nothing overlaps: the grid of photos, then the same blocks on the page. -->
		<div class="mx-auto flex max-w-listing flex-col gap-section p-card">
			<PhotoGrid {photos} />
			<OverlapSheet>{@render blocks()}</OverlapSheet>
		</div>
	{/snippet}
</Story>

<Story name="Kept at every width" globals={{ viewport: { value: 'z744', isRotated: false } }}>
	{#snippet template()}
		<CollapsingHero height="hero-h-lg" imageUrl={samplePhotos[1]} hideFrom="none" />
		<OverlapSheet flatFrom="none">{@render blocks()}</OverlapSheet>
	{/snippet}
</Story>

<Story name="Empty" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<div class="pt-section"><OverlapSheet /></div>
	{/snippet}
</Story>

<Story
	name="In the dark theme"
	globals={{ viewport: { value: 'z375', isRotated: false }, theme: 'dark' }}
>
	{#snippet template()}
		<div class="min-h-sheet-xl bg-background">
			<CollapsingHero height="hero-h" imageUrl={samplePhotos[2]} countLabel="1 / 5" />
			<OverlapSheet>{@render blocks()}</OverlapSheet>
		</div>
	{/snippet}
</Story>
