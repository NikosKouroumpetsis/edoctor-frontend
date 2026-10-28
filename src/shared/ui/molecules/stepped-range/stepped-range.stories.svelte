<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SteppedRange } from '$shared/ui/molecules/stepped-range';

	// Duration picker from the reference mockup — 7 discrete stops. The labels are
	// demo content supplied by the story; the molecule itself is i18n-agnostic.
	const durationSteps = ['30 λεπτά', '1 ώρα', '1,5 ώρα', '2 ώρες', '3 ώρες', '4 ώρες', '5+ ώρες'];

	// The application's meta (`molecules/stepped-range`); each story shows the chosen range under the control.
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
	const steps = ['30 λεπτά', '1 ώρα', '1,5 ώρα', '2 ώρες', '3 ώρες', '4 ώρες', '5+ ώρες'];
	const range = (value: [number, number]) => `Εύρος: ${steps[value[0]]} – ${steps[value[1]]}`;

	let full = $state<[number, number]>([0, 6]);
	let half = $state<[number, number]>([0, 1]);
	let small = $state<[number, number]>([1, 4]);
	let medium = $state<[number, number]>([1, 4]);
	let large = $state<[number, number]>([1, 4]);
	let disabledRange = $state<[number, number]>([0, 3]);
</script>

<!-- Reproduces the full-range mockup [0, 6]. -->
<Story name="Default">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<SteppedRange {...args} bind:value={full} />
			<p class="mt-6 text-body-sm text-muted-foreground">{range(full)}</p>
		</div>
	{/snippet}
</Story>

<!-- Reproduces the short-range mockup [0, 1]. -->
<Story name="Half">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<SteppedRange {...args} bind:value={half} />
			<p class="mt-6 text-body-sm text-muted-foreground">{range(half)}</p>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-section-lg">
			<div class="w-full max-w-narrow">
				<SteppedRange {...args} size="sm" title="Μικρό" bind:value={small} />
				<p class="mt-6 text-body-sm text-muted-foreground">{range(small)}</p>
			</div>
			<div class="w-full max-w-narrow">
				<SteppedRange {...args} size="default" title="Κανονικό" bind:value={medium} />
				<p class="mt-6 text-body-sm text-muted-foreground">{range(medium)}</p>
			</div>
			<div class="w-full max-w-narrow">
				<SteppedRange {...args} size="lg" title="Μεγάλο" bind:value={large} />
				<p class="mt-6 text-body-sm text-muted-foreground">{range(large)}</p>
			</div>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<SteppedRange {...args} disabled title="Διάρκεια" bind:value={disabledRange} />
			<p class="mt-6 text-body-sm text-muted-foreground">{range(disabledRange)}</p>
		</div>
	{/snippet}
</Story>
