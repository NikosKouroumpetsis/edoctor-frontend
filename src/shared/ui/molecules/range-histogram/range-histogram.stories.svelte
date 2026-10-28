<script module lang="ts">
	import type { ComponentProps } from 'svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RangeHistogram } from '$shared/ui/molecules/range-histogram';

	// Right-skewed distribution peaking left-of-centre (20 buckets), the reference price-per-visitor histogram.
	const priceDistribution = [
		0.28, 0.14, 0.37, 0.3, 0.22, 0.34, 1.0, 0.62, 0.71, 0.71, 0.57, 0.4, 0.3, 0.44, 0.26, 0.16, 0.3,
		0.22, 0.14, 0.1
	];
	/** The caller's format (U-03.11): euros in Greek, «420+ €» at the ceiling, as the price filter writes them. */
	const euros = (value: number, atCeiling: boolean) => `${value}${atCeiling ? '+' : ''} €`;
	/** Any other unit works the same way: the histogram writes no currency of its own. */
	const minutes = (value: number, atCeiling: boolean) => `${value}${atCeiling ? '+' : ''} λεπτά`;
	const words = {
		title: 'Τιμή ανά επισκέπτη',
		subtitle: 'Τιμές χωρίς προμήθειες και φόρους',
		minLabel: 'Ελάχιστη τιμή',
		maxLabel: 'Μέγιστη τιμή',
		data: priceDistribution,
		formatValue: euros,
		min: 8,
		max: 420
	};

	// The application's meta (`molecules/range-histogram`): the price per visitor, 8…420, «80 €» / «420+ €».
	const { Story } = defineMeta({
		title: 'Molecules/RangeHistogram',
		component: RangeHistogram,
		tags: ['autodocs'],
		args: { ...words, step: 1, size: 'default', disabled: false },
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let byDefault = $state<[number, number]>([80, 300]);
	let small = $state<[number, number]>([80, 300]);
	let medium = $state<[number, number]>([80, 300]);
	let large = $state<[number, number]>([80, 300]);
	let ceiling = $state<[number, number]>([380, 420]);
	let disabled = $state<[number, number]>([80, 300]);
	let bare = $state<[number, number]>([80, 300]);
	let other = $state<[number, number]>([10, 60]);
</script>

<!-- The histogram in a 360 column (the application's frame) with the range read out under it. -->
{#snippet demo(
	value: { get: () => [number, number]; set: (next: [number, number]) => void },
	props: Partial<ComponentProps<typeof RangeHistogram>> = {}
)}
	<div class="w-full max-w-narrow">
		<RangeHistogram {...words} {...props} bind:value={value.get, value.set} />
		<p class="mt-4 text-body-sm text-muted-foreground">
			Εύρος: {value.get()[0]} – {value.get()[1]}
		</p>
	</div>
{/snippet}

<Story name="Default">
	{#snippet template()}
		{@render demo({ get: () => byDefault, set: (next) => (byDefault = next) })}
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-section">
			{@render demo(
				{ get: () => small, set: (next) => (small = next) },
				{ size: 'sm', title: 'Μικρό', subtitle: undefined }
			)}
			{@render demo(
				{ get: () => medium, set: (next) => (medium = next) },
				{ size: 'default', title: 'Κανονικό', subtitle: undefined }
			)}
			{@render demo(
				{ get: () => large, set: (next) => (large = next) },
				{ size: 'lg', title: 'Μεγάλο', subtitle: undefined }
			)}
		</div>
	{/snippet}
</Story>

<!-- Max handle at the ceiling renders as «420+ €». -->
<Story name="Ceiling">
	{#snippet template()}
		{@render demo({ get: () => ceiling, set: (next) => (ceiling = next) })}
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		{@render demo({ get: () => disabled, set: (next) => (disabled = next) }, { disabled: true })}
	{/snippet}
</Story>

<Story name="Without Histogram">
	{#snippet template()}
		{@render demo({ get: () => bare, set: (next) => (bare = next) }, { data: [] })}
	{/snippet}
</Story>

<Story name="Other Unit">
	{#snippet template()}
		{@render demo(
			{ get: () => other, set: (next) => (other = next) },
			{
				formatValue: minutes,
				min: 5,
				max: 60,
				minLabel: 'Από',
				maxLabel: 'Έως',
				subtitle: undefined,
				title: 'Διάρκεια'
			}
		)}
	{/snippet}
</Story>
