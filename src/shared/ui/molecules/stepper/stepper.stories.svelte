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
