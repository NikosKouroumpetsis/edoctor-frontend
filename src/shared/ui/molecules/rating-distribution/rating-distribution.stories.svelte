<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Container } from '$shared/ui/molecules/container';
	import { RatingDistribution } from '$shared/ui/molecules/rating-distribution';

	const buckets = [
		{ star: 5, share: 0.82, count: 102 },
		{ star: 4, share: 0.12, count: 15 },
		{ star: 3, share: 0.04, count: 5 },
		{ star: 2, share: 0.01, count: 1 },
		{ star: 1, share: 0.01, count: 1 }
	];
	const categories = [
		{ icon: 'sparkles-outline' as const, id: 'clean', score: '9,8', title: 'Καθαριότητα' },
		{ icon: 'chatbubble-outline' as const, id: 'talk', score: '9,6', title: 'Επικοινωνία' },
		{ icon: 'time-outline' as const, id: 'time', score: '9,4', title: 'Συνέπεια' },
		{ icon: 'happy-outline' as const, id: 'kind', score: '9,7', title: 'Φιλικότητα' },
		{ icon: 'ribbon-outline' as const, id: 'skill', score: '9,9', title: 'Γνώση' }
	];

	const { Story } = defineMeta({
		title: 'Molecules/RatingDistribution',
		component: RatingDistribution,
		tags: ['autodocs'],
		args: { title: 'Συνολική βαθμολογία', buckets, categories, categoriesLabel: 'Κατηγορίες' },
		argTypes: { bleed: { control: 'select', options: ['none', 'gutter-sm', 'zone'] } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-content"><RatingDistribution {...args} /></div>
	{/snippet}
</Story>

<Story name="Without categories">
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<RatingDistribution
				title="Συνολική βαθμολογία"
				{buckets}
				categories={[]}
				categoriesLabel="Κατηγορίες"
			/>
		</div>
	{/snippet}
</Story>

<Story
	name="Edge to edge in the modal on the phone"
	parameters={{ layout: 'fullscreen' }}
	globals={{ viewport: { value: 'z375', isRotated: false } }}
>
	{#snippet template()}
		<!-- The web's modal screen pads 24 (`px-gutter-sm`): the band escapes it and puts it back. -->
		<div class="flex flex-col gap-section px-gutter-sm py-card">
			<p class="text-body-lg text-foreground">
				Κείμενο του παραθύρου, στο ίδιο ύψος με το περιεχόμενο.
			</p>
			<RatingDistribution
				title="Συνολική βαθμολογία"
				{buckets}
				{categories}
				categoriesLabel="Κατηγορίες"
				bleed="gutter-sm"
			/>
		</div>
	{/snippet}
</Story>

<Story
	name="Edge to edge on the desktop page"
	parameters={{ layout: 'fullscreen' }}
	globals={{ viewport: { value: 'z1440', isRotated: false } }}
>
	{#snippet template()}
		<!-- A page with the zone gutter (24 · 32 from 950 · 48 from 1440). -->
		<Container width="content" class="py-card">
			<RatingDistribution
				title="Συνολική βαθμολογία"
				{buckets}
				{categories}
				categoriesLabel="Κατηγορίες"
				bleed="zone"
			/>
		</Container>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-content bg-background p-card">
			<RatingDistribution
				title="Συνολική βαθμολογία"
				{buckets}
				{categories}
				categoriesLabel="Κατηγορίες"
			/>
		</div>
	{/snippet}
</Story>
