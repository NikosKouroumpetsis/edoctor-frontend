<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Rating, type RatingSize } from '$shared/ui/primitives/rating';

	const sizes: RatingSize[] = ['xs', 'sm', 'md', 'lg'];

	// The application's meta (`atoms/rating`): the score over five small stars.
	const { Story } = defineMeta({
		title: 'Primitives/Rating',
		component: Rating,
		tags: ['autodocs'],
		args: { label: '4,9', variant: 'stat' },
		argTypes: {
			labelTone: { control: 'radio', options: ['primary', 'foreground'] },
			size: { control: 'radio', options: sizes },
			variant: { control: 'radio', options: ['inline', 'stat', 'value', 'stars'] }
		}
	});
</script>

<!-- The score over a row of five small stars (a stat strip). -->
<Story name="Stat" />

<!-- A star and the score in a card's meta line: every size, in the primary text colour and in the foreground. -->
<Story name="Inline">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			{#each sizes as size (size)}
				<div class="flex flex-row gap-6">
					<Rating label="4,8" {size} variant="inline" />
					<Rating label="Νέο" labelTone="foreground" {size} variant="inline" />
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- The score followed by one star (a summary card). -->
<Story name="Value" args={{ label: '4,90', variant: 'value' }} />

<!-- Five stars, the first `value` filled (a review). -->
<Story name="Stars" args={{ label: undefined, value: 4, variant: 'stars' }} />

<!-- Every count of filled stars, side by side. -->
<Story name="Stars Scale">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			{#each [0, 1, 2, 3, 4, 5] as value (value)}
				<Rating aria-label={`${value} στα 5`} {value} variant="stars" />
			{/each}
		</div>
	{/snippet}
</Story>
