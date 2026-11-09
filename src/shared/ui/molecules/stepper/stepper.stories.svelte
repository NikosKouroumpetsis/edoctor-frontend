<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Stepper } from '$shared/ui/molecules/stepper';

	// The application's meta (`molecules/stepper`): only JSON-serializable args; each story holds its own value.
	const { Story } = defineMeta({
		title: 'Molecules/Stepper',
		component: Stepper,
		tags: ['autodocs'],
		args: {
			decreaseLabel: 'Μείωση',
			disabled: false,
			emptyValueLabel: 'Κενό',
			helperText: 'Πόσες ώρες πριν σταματά η κράτηση για μια ώρα (0-72).',
			increaseLabel: 'Αύξηση',
			label: 'Ελάχιστος χρόνος πριν την κράτηση (ώρες)',
			max: 72,
			min: 0,
			step: 1
		},
		argTypes: {
			variant: { control: 'inline-radio', options: ['default', 'counter'] },
			disabled: { control: 'boolean' },
			error: { control: 'text' },
			helperText: { control: 'text' },
			label: { control: 'text' },
			max: { control: 'number' },
			min: { control: 'number' },
			step: { control: 'number' }
		}
	});
</script>

<script lang="ts">
	let playground = $state('2');
	let invalid = $state('2');
	let minimum = $state('2');
	let disabled = $state('2');
	let counter = $state('3');
	// A sample `valueLabel` (the caller's words): a floor, «Υπόγειο / Ισόγειο / 1ος …».
	const floorWords = (n: number) => (n < 0 ? 'Υπόγειο' : n === 0 ? 'Ισόγειο' : `${n}ος`);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Stepper {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Δώστε έναν αριθμό από 0 έως 72.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Stepper {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="At Minimum" args={{ min: 2 }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Stepper {...args} bind:value={minimum} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Stepper {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>

<!-- `counter` (Airbnb's counters): one 64 box, the title inside on the left, «−» value «+» in 36 circles. -->
<Story
	name="Counter"
	args={{ variant: 'counter', label: 'Όροφος', helperText: '', min: -1, max: 20, hover: false }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<Stepper {...args} valueLabel={floorWords} bind:value={counter} />
		</div>
	{/snippet}
</Story>
