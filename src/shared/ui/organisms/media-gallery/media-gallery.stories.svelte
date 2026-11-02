<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MediaGallery } from '$shared/ui/organisms/media-gallery';
	import {
		brokenPhoto,
		photoPosition,
		samplePhotos
	} from '$shared/ui/organisms/media-card/media-card.sample';

	// Seven photos of one person (the sample's five, twice over): the column shows four and «+3».
	const sevenPhotos: string[] = [...samplePhotos, ...samplePhotos.slice(0, 2)];
	const photoLabel = (index: number, total: number) => photoPosition.el(index + 1, total);
	const photoHref = (index: number) => `#photo-${index + 1}`;

	// U-41.1 (wave 1.5, the profile): the photos as Skroutz's product page — the phone's square that swipes with
	// «1 / N»; from 744 the thumbnails' column beside the square. Local pictures only (no network).
	const { Story } = defineMeta({
		title: 'Organisms/MediaGallery',
		component: MediaGallery,
		tags: ['autodocs'],
		args: {
			images: sevenPhotos,
			photoHref,
			photoLabel,
			moreHref: '#photos',
			moreLabel: 'Όλες οι φωτογραφίες'
		},
		render: template
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="w-full max-w-full">
		<MediaGallery
			{...args}
			images={(args.images as string[]) ?? []}
			moreLabel="Όλες οι φωτογραφίες"
			{photoHref}
			{photoLabel}
		/>
	</div>
{/snippet}

<Story name="Many Photos" />

<Story name="Many Photos 744" globals={{ viewport: { value: 'z744' } }} />

<Story name="Two Photos" args={{ images: sevenPhotos.slice(0, 2) }} />

<Story name="One Photo" args={{ images: sevenPhotos.slice(0, 1) }} />

<!-- S-32.8: no photo — the silhouette in the square, no counter, no thumbnails. -->
<Story name="No Photos" args={{ images: [] }} />

<!-- S-32.13: a first photo that does not load reads as no photo. -->
<Story name="Broken Cover" args={{ images: [brokenPhoto] }} />

<!-- U-14.5: while the page's data comes, the square breathes. -->
<Story name="Loading" args={{ loading: true }} />
