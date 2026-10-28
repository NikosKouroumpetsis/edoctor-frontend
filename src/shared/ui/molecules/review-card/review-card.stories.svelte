<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ReviewCard } from '$shared/ui/molecules/review-card';
	import { Rail } from '$shared/ui/organisms/rail';

	const short = 'Πολύ καλή εξυπηρέτηση και σωστή ενημέρωση.';
	const long =
		'Εξαιρετική εμπειρία από την αρχή ως το τέλος. Με άκουσε με προσοχή, μου εξήγησε τι θα κάνουμε και γιατί, και μου έδωσε γραπτές οδηγίες. Το ιατρείο ήταν καθαρό και η αναμονή ελάχιστη. Θα το συστήσω σε όλους.';
	const reviews = [
		{ key: 'a', author: 'Γιώργος Π.', initial: 'Γ', date: 'Μάρτιος 2026', stars: 5, text: long },
		{ key: 'b', author: 'Ελένη Κ.', initial: 'Ε', date: 'Φεβρουάριος 2026', stars: 4, text: short },
		{ key: 'c', author: 'Νίκος Σ.', initial: 'Ν', date: 'Ιανουάριος 2026', stars: 5, text: long }
	];
	type SampleReview = (typeof reviews)[number];

	const { Story } = defineMeta({
		title: 'Molecules/ReviewCard',
		component: ReviewCard,
		tags: ['autodocs'],
		args: {
			authorName: 'Ελένη Κ.',
			authorInitial: 'Ε',
			dateLabel: 'Φεβρουάριος 2026',
			rating: 4,
			ratingLabel: '4 στα 5',
			body: short,
			moreLabel: 'Εμφάνιση περισσότερων',
			onMore: () => {}
		},
		argTypes: { layout: { control: 'select', options: ['rail', 'list'] } }
	});
</script>

{#snippet review(sample: SampleReview, layout: 'rail' | 'list')}
	<ReviewCard
		{layout}
		authorName={sample.author}
		authorInitial={sample.initial}
		dateLabel={sample.date}
		rating={sample.stars}
		ratingLabel={`${sample.stars} στα 5`}
		body={sample.text}
		aspects={layout === 'list' ? 'Συνέπεια · Φιλικότητα' : undefined}
		moreLabel="Εμφάνιση περισσότερων"
		onMore={() => {}}
	/>
{/snippet}

<Story name="Rail">
	{#snippet template(args)}
		<ReviewCard {...args} />
	{/snippet}
</Story>

<Story name="Rail with a long body">
	{#snippet template()}
		<!-- Cut at three lines; «more» appears once the body is measured as cut. -->
		<ReviewCard
			authorName="Γιώργος Π."
			authorInitial="Γ"
			dateLabel="Μάρτιος 2026"
			rating={5}
			ratingLabel="5 στα 5"
			body={long}
			moreLabel="Εμφάνιση περισσότερων"
			onMore={() => {}}
		/>
	{/snippet}
</Story>

<Story name="List">
	{#snippet template()}
		<div class="w-full max-w-content">
			<ReviewCard
				layout="list"
				authorName="Γιώργος Π."
				authorInitial="Γ"
				dateLabel="Μάρτιος 2026"
				rating={5}
				ratingLabel="5 στα 5"
				body={long}
				aspects="Συνέπεια · Φιλικότητα · Καθαριότητα"
			/>
		</div>
	{/snippet}
</Story>

<Story name="In a separated rail" parameters={{ layout: 'fullscreen' }}>
	{#snippet template()}
		<div class="p-card">
			<Rail
				title="Κριτικές"
				variant="separated"
				items={reviews}
				keyExtractor={(sample) => sample.key}
			>
				{#snippet renderItem(sample)}
					{@render review(sample, 'rail')}
				{/snippet}
			</Rail>
		</div>
	{/snippet}
</Story>

<Story name="Rail and list in the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="flex w-full max-w-content flex-col gap-section bg-background p-card">
			{@render review(reviews[0], 'rail')}
			{@render review(reviews[1], 'list')}
		</div>
	{/snippet}
</Story>
