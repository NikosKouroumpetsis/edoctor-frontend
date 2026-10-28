<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ReviewSummary } from '$shared/ui/molecules/review-summary';

	const { Story } = defineMeta({
		title: 'Molecules/ReviewSummary',
		component: ReviewSummary,
		tags: ['autodocs'],
		args: {
			score: '4,9',
			title: 'Κορυφαία επιλογή',
			count: '124 αξιολογήσεις',
			linkLabel: 'Πώς λειτουργούν οι κριτικές',
			onLink: () => {}
		}
	});
</script>

<Story name="With a count">
	{#snippet template(args)}
		<ReviewSummary {...args} />
	{/snippet}
</Story>

<Story name="With a description">
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<ReviewSummary
				score="4,9"
				title="Κορυφαία επιλογή"
				description="Ένας από τους πιο αγαπημένους επαγγελματίες, με βάση τις αξιολογήσεις"
				linkLabel="Πώς λειτουργούν οι κριτικές"
				linkHref="#reviews"
			/>
		</div>
	{/snippet}
</Story>

<Story name="Without a link">
	{#snippet template()}
		<ReviewSummary score="4,7" title="Αξιολογήσεις" count="38 αξιολογήσεις" />
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="bg-background p-card">
			<ReviewSummary
				score="4,9"
				title="Κορυφαία επιλογή"
				count="124 αξιολογήσεις"
				linkLabel="Πώς λειτουργούν οι κριτικές"
				onLink={() => {}}
			/>
		</div>
	{/snippet}
</Story>
