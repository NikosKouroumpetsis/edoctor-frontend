<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Stepper } from '$shared/ui/molecules/stepper';

	// Only JSON-serializable args: the value lives in each story's `bind:value`.
	const { Story } = defineMeta({
		title: 'Molecules/Stepper',
		component: Stepper,
		tags: ['autodocs'],
		args: {
			label: 'Ελάχιστος χρόνος πριν την κράτηση (ώρες)',
			helperText: 'Πόσες ώρες πριν σταματά η κράτηση για μια ώρα (0-72).',
			min: 0,
			max: 72,
			step: 1,
			disabled: false
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
	let value = $state('2');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-narrow"><Stepper {...args} bind:value /></div>
	{/snippet}
</Story>

<Story name="With error" args={{ error: 'Δώστε έναν αριθμό από 0 έως 72.' }}>
	{#snippet template(args)}
		<div class="w-narrow"><Stepper {...args} bind:value /></div>
	{/snippet}
</Story>

<Story name="At minimum" args={{ min: 2 }}>
	{#snippet template(args)}
		<div class="w-narrow"><Stepper {...args} bind:value /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-narrow"><Stepper {...args} bind:value /></div>
	{/snippet}
</Story>
