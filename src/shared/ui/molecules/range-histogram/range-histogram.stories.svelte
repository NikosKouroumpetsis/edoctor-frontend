<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RangeHistogram } from '$shared/ui/molecules/range-histogram';

	// Right-skewed distribution peaking left-of-centre (≈20 buckets), taken from
	// the reference mockup's price-per-visitor histogram.
	const priceDistribution = [
		0.28, 0.14, 0.37, 0.3, 0.22, 0.34, 1.0, 0.62, 0.71, 0.71, 0.57, 0.4, 0.3, 0.44, 0.26, 0.16, 0.3,
		0.22, 0.14, 0.1
	];

	const { Story } = defineMeta({
		title: 'Molecules/Range histogram',
		component: RangeHistogram,
		tags: ['autodocs'],
		args: {
			title: 'Τιμή ανά επισκέπτη',
			subtitle: 'Τιμές χωρίς προμήθειες και φόρους',
			minLabel: 'Ελάχιστη τιμή',
			maxLabel: 'Μέγιστη τιμή',
			data: priceDistribution,
			min: 8,
			max: 420,
			step: 1,
			size: 'default',
			disabled: false
		},
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let playground = $state<[number, number]>([80, 300]);
	let priced = $state<[number, number]>([80, 300]);
	let small = $state<[number, number]>([80, 300]);
	let medium = $state<[number, number]>([80, 300]);
	let large = $state<[number, number]>([80, 300]);
	let disabledRange = $state<[number, number]>([80, 300]);
	let ceiling = $state<[number, number]>([380, 420]);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-[28rem] max-w-full">
			<RangeHistogram {...args} bind:value={playground} />
			<p class="mt-4 text-body-sm text-muted-foreground">
				Range: {playground[0]} – {playground[1]}
			</p>
		</div>
	{/snippet}
</Story>

<Story name="Default">
	{#snippet template()}
		<div class="w-[28rem] max-w-full">
			<RangeHistogram
				title="Τιμή ανά επισκέπτη"
				subtitle="Τιμές χωρίς προμήθειες και φόρους"
				minLabel="Ελάχιστη τιμή"
				maxLabel="Μέγιστη τιμή"
				data={priceDistribution}
				min={8}
				max={420}
				bind:value={priced}
			/>
			<p class="mt-4 text-body-sm text-muted-foreground">Range: {priced[0]} – {priced[1]}</p>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-[28rem] max-w-full flex-col gap-10">
			<RangeHistogram
				size="sm"
				title="Small"
				data={priceDistribution}
				min={8}
				max={420}
				minLabel="Ελάχιστη τιμή"
				maxLabel="Μέγιστη τιμή"
				bind:value={small}
			/>
			<RangeHistogram
				size="default"
				title="Default"
				data={priceDistribution}
				min={8}
				max={420}
				minLabel="Ελάχιστη τιμή"
				maxLabel="Μέγιστη τιμή"
				bind:value={medium}
			/>
			<RangeHistogram
				size="lg"
				title="Large"
				data={priceDistribution}
				min={8}
				max={420}
				minLabel="Ελάχιστη τιμή"
				maxLabel="Μέγιστη τιμή"
				bind:value={large}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-[28rem] max-w-full">
			<RangeHistogram
				disabled
				title="Τιμή ανά επισκέπτη"
				subtitle="Τιμές χωρίς προμήθειες και φόρους"
				minLabel="Ελάχιστη τιμή"
				maxLabel="Μέγιστη τιμή"
				data={priceDistribution}
				min={8}
				max={420}
				bind:value={disabledRange}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Ceiling">
	{#snippet template()}
		<div class="w-[28rem] max-w-full">
			<RangeHistogram
				title="Τιμή ανά επισκέπτη"
				subtitle="Τιμές χωρίς προμήθειες και φόρους"
				minLabel="Ελάχιστη τιμή"
				maxLabel="Μέγιστη τιμή"
				data={priceDistribution}
				min={8}
				max={420}
				bind:value={ceiling}
			/>
			<p class="mt-4 text-body-sm text-muted-foreground">
				Max handle at the ceiling renders as “€420+”. Range: {ceiling[0]} – {ceiling[1]}
			</p>
		</div>
	{/snippet}
</Story>
