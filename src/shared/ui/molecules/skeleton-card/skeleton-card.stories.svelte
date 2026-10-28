<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { cardSizeOf, SkeletonCard } from '$shared/ui/molecules/skeleton-card';
	import { MediaCard } from '$shared/ui/organisms/media-card';
	import { samplePhotos } from '$shared/ui/organisms/media-card/media-card.sample';

	const at = (value: string) => ({ viewport: { value, isRotated: false } });
	const rail = cardSizeOf('carousel');
	const list = cardSizeOf('list');

	const { Story } = defineMeta({
		title: 'Molecules/SkeletonCard',
		component: SkeletonCard,
		tags: ['autodocs'],
		args: { layout: 'carousel' },
		argTypes: { layout: { control: 'inline-radio', options: ['carousel', 'list'] } }
	});
</script>

<!-- A rail cell (a step larger from the tablet). -->
<Story name="Carousel">
	{#snippet template(args)}
		<div aria-busy="true"><SkeletonCard {...args} /></div>
	{/snippet}
</Story>

<!-- A list row: the whole width, a taller photo. -->
<Story name="List">
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-content"><SkeletonCard layout="list" /></div>
	{/snippet}
</Story>

<Story name="Carousel on the phone" globals={at('z375')}>
	{#snippet template()}
		<div aria-busy="true"><SkeletonCard /></div>
	{/snippet}
</Story>

<Story name="Carousel on the tablet" globals={at('z744')}>
	{#snippet template()}
		<div aria-busy="true"><SkeletonCard /></div>
	{/snippet}
</Story>

<Story name="List on the tablet" globals={at('z744')}>
	{#snippet template()}
		<div aria-busy="true" class="w-full max-w-content"><SkeletonCard layout="list" /></div>
	{/snippet}
</Story>

<!-- D13: the placeholder and the card it becomes read the ONE size map, so nothing moves when it arrives. -->
<Story name="The placeholder beside the card it becomes" globals={at('z744')}>
	{#snippet template()}
		<div class="flex flex-row items-start gap-3">
			<div aria-busy="true"><SkeletonCard /></div>
			<MediaCard imageUrl={samplePhotos[0]} imageClass={rail.mediaClass} class={rail.widthClass}>
				<p class="line-clamp-1 text-body-lg font-semibold text-foreground">Μαρία Αλεξίου</p>
			</MediaCard>
		</div>
		<div class="mt-section flex max-w-content flex-col gap-section">
			<div aria-busy="true"><SkeletonCard layout="list" /></div>
			<MediaCard imageUrl={samplePhotos[1]} imageClass={list.mediaClass} class={list.widthClass}>
				<p class="line-clamp-1 text-body-lg font-semibold text-foreground">Νίκος Παππάς</p>
			</MediaCard>
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div aria-busy="true" class="flex flex-col gap-section bg-background p-card">
			<SkeletonCard />
			<div class="w-full max-w-content"><SkeletonCard layout="list" /></div>
		</div>
	{/snippet}
</Story>
