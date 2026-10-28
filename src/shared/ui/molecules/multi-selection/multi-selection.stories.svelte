<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MultiSelection } from '$shared/ui/molecules/multi-selection';

	const options = [
		{ label: 'Καρδιολογία', value: 'cardio' },
		{ label: 'Δερματολογία', value: 'derma' },
		{ label: 'Παιδιατρική', value: 'pediatrics' },
		{ label: 'Ορθοπεδική', value: 'ortho' }
	];

	// The application's meta (`molecules/multi-selection`).
	const { Story } = defineMeta({
		title: 'Molecules/Multi selection',
		component: MultiSelection,
		tags: ['autodocs'],
		args: { label: 'Ειδικότητες', options, disabled: false },
		argTypes: { disabled: { control: 'boolean' }, max: { control: 'number' } }
	});
</script>

<script lang="ts">
	let playground = $state<string[]>(['cardio']);
	let limited = $state<string[]>(['cardio']);
	let disabled = $state<string[]>(['cardio']);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><MultiSelection {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<!-- At two chosen, the rest are disabled. -->
<Story name="With Max" args={{ max: 2 }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><MultiSelection {...args} bind:value={limited} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><MultiSelection {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>
