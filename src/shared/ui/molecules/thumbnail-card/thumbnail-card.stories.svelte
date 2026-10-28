<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ThumbnailCard } from '$shared/ui/molecules/thumbnail-card';
	import {
		brokenPhoto,
		sampleArticleImages
	} from '$shared/ui/organisms/media-card/media-card.sample';

	const noop = () => {};

	// The application's meta (`molecules/thumbnail-card`); the picture is the web's local one (C7, no network).
	const { Story } = defineMeta({
		title: 'Molecules/ThumbnailCard',
		component: ThumbnailCard,
		tags: ['autodocs'],
		args: {
			actionLabel: 'Περισσότερα',
			class: 'w-article-group-w',
			description: 'Μια σύντομη περιγραφή σε έως τρεις γραμμές, κάτω από τον τίτλο.',
			imageClass: 'h-article-group-media',
			imageUrl: sampleArticleImages[0],
			onAction: noop,
			title: 'Ένας τίτλος σε έως δύο γραμμές'
		}
	});
</script>

<Story name="Playground" />

<Story name="Without Link" args={{ actionLabel: undefined, onAction: undefined }} />

<Story name="Without Description" args={{ description: undefined }} />

<!-- A photo that does not load keeps the muted box (U-03.11). -->
<Story name="Broken Photo" args={{ imageUrl: brokenPhoto }} />

<!-- Two side by side, each half the row. -->
<Story name="Two Columns">
	{#snippet template()}
		<div class="flex flex-row gap-4">
			{#each ['1', '2'] as key (key)}
				<div class="min-w-0 flex-1">
					<ThumbnailCard
						actionLabel="Περισσότερα"
						class="w-full"
						description="Μια σύντομη περιγραφή."
						imageClass="h-article-group-media"
						imageUrl={sampleArticleImages[0]}
						onAction={noop}
						title={`Τίτλος ${key}`}
					/>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
