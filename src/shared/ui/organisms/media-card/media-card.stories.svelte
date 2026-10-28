<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MediaCard } from '$shared/ui/organisms/media-card';
	import { PhotoCarousel } from '$shared/ui/organisms/photo-carousel';
	import { FavoriteButton } from '$shared/ui/primitives/favorite-button';
	import { MapThumbnail } from '$shared/ui/primitives/map-thumbnail';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import { brokenPhoto, samplePhotos } from './media-card.sample';

	const noop = () => {};

	// The application's meta (`organisms/media-card`): a rail card with the heart and the community badge beside it.
	// The photos are the web's local pictures (C7, no network).
	const { Story } = defineMeta({
		title: 'Organisms/MediaCard',
		component: MediaCard,
		tags: ['autodocs'],
		args: {
			class: 'w-card-rail-w',
			imageClass: 'h-card-rail-media',
			imageUrl: samplePhotos[0],
			variant: 'plain'
		},
		argTypes: {
			variant: { control: 'radio', options: ['plain', 'framed'] },
			loading: { control: 'select', options: ['lazy', 'eager'] },
			aspect: { control: 'select', options: [undefined, '4/3'] }
		},
		render: template
	});
</script>

{#snippet meta()}
	<div class="flex flex-col gap-1">
		<p class="line-clamp-1 text-body-lg font-semibold text-foreground">Ένας τίτλος</p>
		<p class="line-clamp-1 text-label-lg text-foreground">Μια γραμμή κάτω από τον τίτλο</p>
	</div>
{/snippet}

{#snippet heart()}
	<FavoriteButton aria-label="Αγαπημένο" inset="sm" size="md" selected={false} onToggle={noop} />
{/snippet}

{#snippet communityBadge()}
	<MediaBadge besideAction label="Επιλογή της κοινότητας" maxLines={2} width="badge" />
{/snippet}

{#snippet template(args: Record<string, unknown>)}
	<MediaCard {...args} action={heart} badge={communityBadge}>{@render meta()}</MediaCard>
{/snippet}

<Story name="Playground" />

<!-- No photo, or one that does not load: the silhouette on the muted surface (S-32.13). -->
<Story name="Placeholder" args={{ imageUrl: null }} />

<Story name="No Overlays">
	{#snippet template(args)}
		<MediaCard {...args}>{@render meta()}</MediaCard>
	{/snippet}
</Story>

<!-- The raised frame with a 12 inset, a type badge and a link below (a rail of articles). -->
<Story
	name="Framed"
	args={{ class: 'w-article-rail-w', imageClass: 'h-article-rail-media', variant: 'framed' }}
>
	{#snippet template(args)}
		<MediaCard {...args}>
			{#snippet badge()}<MediaBadge label="Άρθρο" />{/snippet}
			{@render meta()}
		</MediaCard>
	{/snippet}
</Story>

<!-- A full-width list card: a gallery with dots in place of the photo, the heart and the map tile over it. -->
<Story name="List With Gallery" args={{ class: 'w-full', imageClass: 'h-card-list-media' }}>
	{#snippet template(args)}
		<MediaCard {...args}>
			{#snippet action()}
				<FavoriteButton aria-label="Αγαπημένο" selected onToggle={noop} />
			{/snippet}
			{#snippet media()}
				<PhotoCarousel
					imageClass="h-card-list-media"
					slides={[
						{ ariaLabel: 'Φωτογραφία 1 από 2', uri: samplePhotos[0] },
						{ ariaLabel: 'Φωτογραφία 2 από 2', uri: samplePhotos[1] }
					]}
				/>
			{/snippet}
			{#snippet overlay()}<MapThumbnail />{/snippet}
			{@render meta()}
		</MediaCard>
	{/snippet}
</Story>

<Story
	name="Carousel Tablet"
	args={{ class: 'w-card-rail-w-lg', imageClass: 'h-card-rail-media-lg' }}
/>

<Story name="List" args={{ class: 'w-full', imageClass: 'h-card-list-media' }} />

<!-- A photo that does not load: the silhouette in its frame, the heart and the badge kept (S-32.13). -->
<Story name="Broken Photo" args={{ imageUrl: brokenPhoto }} />

<!-- Web only: the whole card is one link (Airbnb's), the heart and the badge outside it. -->
<Story name="With Link" args={{ href: '#card', linkLabel: 'Ένας τίτλος' }} />

<!-- Web only until the screen's discussion (Α9): Airbnb's 4:3 photo is an option, never the default. -->
<Story name="Aspect Four By Three">
	{#snippet template()}
		<MediaCard imageUrl={samplePhotos[1]} aspect="4/3" class="w-full max-w-content">
			{@render meta()}
		</MediaCard>
	{/snippet}
</Story>
