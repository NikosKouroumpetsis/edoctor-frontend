<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PhotoCarousel } from '$shared/ui/organisms/photo-carousel';
	import {
		brokenPhoto,
		samplePhotos,
		sampleScrollLabels
	} from '$shared/ui/organisms/media-card/media-card.sample';

	const fiveSlides = samplePhotos.map((uri, index) => ({
		uri,
		ariaLabel: `Φωτογραφία ${index + 1} από 5`
	}));
	const counterLabel = (position: number, total: number) => `${position} / ${total}`;

	// The application's meta (`organisms/photo-carousel`): five photos with dots in a 360 column; the photos are the
	// web's local pictures (C7, no network).
	const { Story } = defineMeta({
		title: 'Organisms/PhotoCarousel',
		component: PhotoCarousel,
		tags: ['autodocs'],
		args: { slides: fiveSlides, imageClass: 'h-card-list-media-lg' },
		argTypes: {
			imageClass: { control: 'text' },
			controlsFrom: { control: 'select', options: ['tablet', 'split', 'laptop'] }
		},
		render: template
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="w-full max-w-narrow">
		<PhotoCarousel {...args} slides={(args.slides as typeof fiveSlides) ?? []} />
	</div>
{/snippet}

<Story name="Five Photos" />

<Story name="Two Photos" args={{ slides: fiveSlides.slice(0, 2) }} />

<Story name="Single Photo" args={{ slides: fiveSlides.slice(0, 1) }} />

<!-- A cover that does not load: the gallery reads as no photo — one silhouette, no dots, no paging (S-32.13). -->
<Story name="Broken Cover" args={{ slides: [{ uri: brokenPhoto }, ...fiveSlides] }} />

<!-- A later photo that does not load: only its slide draws the silhouette. -->
<Story
	name="Broken Later Photo"
	args={{
		slides: [
			{ uri: samplePhotos[0], ariaLabel: 'Φωτογραφία 1 από 3' },
			{ uri: brokenPhoto, ariaLabel: 'Φωτογραφία 2 από 3' },
			{ uri: samplePhotos[2], ariaLabel: 'Φωτογραφία 3 από 3' }
		]
	}}
/>

<Story name="No Photos" args={{ slides: [] }} />

<!-- The pill «2 / 5» in place of the dots, on a hero-tall photo. -->
<Story name="With Counter" args={{ counterLabel, imageClass: 'h-hero-h' }} />

<!-- Web only (a pointer's screen): ‹ › over the photo, 12 from its sides and centred on its height, from 1128
     (`controlsFrom`), shown while the pointer is over the gallery (U-09.3); the ends hide theirs. -->
<Story name="Arrows From Laptop" args={{ scrollLabels: sampleScrollLabels.el }} />
