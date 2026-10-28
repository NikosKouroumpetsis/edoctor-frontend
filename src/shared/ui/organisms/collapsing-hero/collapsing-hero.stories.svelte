<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { OverlapSheet } from '$shared/ui/molecules/overlap-sheet';
	import { CollapsingHero } from '$shared/ui/organisms/collapsing-hero';
	import { Button } from '$shared/ui/primitives/button';
	import { brokenPhoto, samplePhotos } from '$shared/ui/organisms/media-card/media-card.sample';

	const sections = Array.from({ length: 8 }, (_, index) => `Ενότητα ${index + 1}`);

	// The application's meta (`organisms/collapsing-hero`, U-14.1): the hero alone with «1 / 6»; the photo is the web's
	// local one (no network).
	const { Story } = defineMeta({
		title: 'Organisms/CollapsingHero',
		component: CollapsingHero,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		globals: { viewport: { value: 'z375', isRotated: false } },
		args: { height: 'hero-h', imageUrl: samplePhotos[0], countLabel: '1 / 6' },
		argTypes: {
			height: { control: 'select', options: ['hero-h', 'hero-h-lg'] },
			loading: { control: 'boolean' },
			hideFrom: { control: 'select', options: ['tablet', 'none'] }
		}
	});
</script>

<script lang="ts">
	import { untrack } from 'svelte';

	// «Under A Scrolling Page»: the application's fade of the photo and its count, 1 until 30 scrolled, 0 at 270.
	let scrolled = $state(0);
	const fade = $derived(Math.min(1, Math.max(0, (270 - scrolled) / 240)));

	// «Arriving» (the application's): on opening and on «Φόρτωση ξανά», the skeleton for 1.2 s, then the photo at a new
	// address, a first showing that fades in (U-14.5). A `data:` address takes no `?v=` (it would be part of the
	// picture): each round makes a `blob:` address of the same local sample.
	let arriving = $state(true);
	let arrivingUrl = $state('');
	let pending: ReturnType<typeof setTimeout> | undefined;

	function reload() {
		clearTimeout(pending);
		if (arrivingUrl) URL.revokeObjectURL(arrivingUrl);
		const svg = decodeURIComponent(samplePhotos[0].slice(samplePhotos[0].indexOf(',') + 1));
		arrivingUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
		arriving = true;
		pending = setTimeout(() => (arriving = false), 1200);
	}

	/** The first round starts when the «Arriving» story is drawn (once: untracked); its clock and address go with it. */
	function arrival() {
		untrack(reload);
		return () => {
			clearTimeout(pending);
			if (arrivingUrl) URL.revokeObjectURL(arrivingUrl);
		};
	}
</script>

<Story name="Playground" />

<Story name="Tall" args={{ height: 'hero-h-lg' }} />

<Story name="Without Count" args={{ countLabel: undefined }} />

<!-- No photo: the silhouette, and no count (S-32.8). -->
<Story name="No Photo" args={{ imageUrl: '' }} />

<!-- A photo that does not load turns into the silhouette (S-32.13). -->
<Story name="Broken Photo" args={{ imageUrl: brokenPhoto }} />

<!-- The hero under a scrolling page that fades it and its count out, with the overlapping sheet. -->
<Story name="Under A Scrolling Page">
	{#snippet template()}
		<div
			class="max-h-sheet-xl overflow-y-auto"
			onscroll={(event) => (scrolled = event.currentTarget.scrollTop)}
		>
			<CollapsingHero
				height="hero-h"
				imageUrl={samplePhotos[0]}
				countLabel="1 / 6"
				imageStyle={`opacity: ${fade}`}
				overlayStyle={`opacity: ${fade}`}
			/>
			<OverlapSheet>
				{#each sections as section (section)}
					<div class="flex flex-col gap-2">
						<p class="text-title-sm font-semibold text-foreground">{section}</p>
						<p class="text-body-md text-muted-foreground">
							Κείμενο που κυλά πάνω από τη φωτογραφία.
						</p>
					</div>
				{/each}
			</OverlapSheet>
		</div>
	{/snippet}
</Story>

<!-- While the page's data comes: the kit's skeleton over the whole frame, no count (U-14.1). -->
<Story name="Loading" args={{ loading: true }} />

<!-- U-14.1: the skeleton for 1.2 s, then the photo lights up (0.8 s, Airbnb's curve); «Φόρτωση ξανά» replays it. -->
<Story name="Arriving">
	{#snippet template()}
		<div class="flex flex-col gap-4" {@attach arrival}>
			<CollapsingHero
				height="hero-h"
				imageUrl={arrivingUrl}
				countLabel="1 / 6"
				loading={arriving}
			/>
			<Button class="mx-4" label="Φόρτωση ξανά" onclick={reload} />
		</div>
	{/snippet}
</Story>

<!-- Web only: from 744 the hero hides (the web's `PhotoGrid` takes over); `hideFrom="none"` keeps the application's
     tablet look (`hero-h-lg`, the pill 4 above the overlap). -->
<Story
	name="Kept On The Tablet"
	args={{ height: 'hero-h-lg', hideFrom: 'none' }}
	globals={{ viewport: { value: 'z744', isRotated: false } }}
/>
