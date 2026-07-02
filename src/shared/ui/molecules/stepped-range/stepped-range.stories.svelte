<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SteppedRange } from '$shared/ui/molecules/stepped-range';

	// Duration picker from the reference mockup — 7 discrete stops. The labels are
	// demo content supplied by the story; the molecule itself is i18n-agnostic.
	const durationSteps = ['30 λεπτά', '1 ώρα', '1,5 ώρα', '2 ώρες', '3 ώρες', '4 ώρες', '5+ ώρες'];

	const { Story } = defineMeta({
		title: 'Molecules/Stepped range',
		component: SteppedRange,
		tags: ['autodocs'],
		args: {
			title: 'Διάρκεια',
			steps: durationSteps,
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
	const durationSteps = ['30 λεπτά', '1 ώρα', '1,5 ώρα', '2 ώρες', '3 ώρες', '4 ώρες', '5+ ώρες'];

	let playground = $state<[number, number]>([0, 6]);
	let full = $state<[number, number]>([0, 6]);
	let half = $state<[number, number]>([0, 1]);
	let small = $state<[number, number]>([1, 4]);
	let medium = $state<[number, number]>([1, 4]);
	let large = $state<[number, number]>([1, 4]);
	let disabledRange = $state<[number, number]>([0, 3]);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-[32rem] max-w-full">
			<SteppedRange {...args} bind:value={playground} />
			<p class="mt-6 text-body-sm text-muted-foreground">
				Range: {args.steps[playground[0]]} – {args.steps[playground[1]]}
			</p>
		</div>
	{/snippet}
</Story>

<!-- Reproduces bar_02_all.png: full range [0, 6]. -->
<Story name="Default">
	{#snippet template()}
		<div class="w-[32rem] max-w-full">
			<SteppedRange title="Διάρκεια" steps={durationSteps} bind:value={full} />
		</div>
	{/snippet}
</Story>

<!-- Reproduces bar_02_half.png: short range [0, 1]. -->
<Story name="Half">
	{#snippet template()}
		<div class="w-[32rem] max-w-full">
			<SteppedRange title="Διάρκεια" steps={durationSteps} bind:value={half} />
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-[32rem] max-w-full flex-col gap-12">
			<SteppedRange size="sm" title="Small" steps={durationSteps} bind:value={small} />
			<SteppedRange size="default" title="Default" steps={durationSteps} bind:value={medium} />
			<SteppedRange size="lg" title="Large" steps={durationSteps} bind:value={large} />
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-[32rem] max-w-full">
			<SteppedRange disabled title="Διάρκεια" steps={durationSteps} bind:value={disabledRange} />
		</div>
	{/snippet}
</Story>
