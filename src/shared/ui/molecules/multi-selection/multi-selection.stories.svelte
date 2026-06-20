<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MultiSelection } from '$shared/ui/molecules/multi-selection';

	const { Story } = defineMeta({
		title: 'Molecules/Multi selection',
		component: MultiSelection,
		tags: ['autodocs']
	});

	const options = [
		{ value: 'cardio', label: 'Cardiology' },
		{ value: 'derma', label: 'Dermatology' },
		{ value: 'neuro', label: 'Neurology' },
		{ value: 'pedia', label: 'Pediatrics' }
	];
</script>

<script lang="ts">
	let value = $state<string[]>([]);
	let preselected = $state<string[]>(['cardio', 'neuro']);
</script>

<Story name="Default">
	{#snippet template()}
		<div class="w-96"><MultiSelection label="Specialties" {options} bind:value /></div>
	{/snippet}
</Story>

<Story name="Pre-selected">
	{#snippet template()}
		<div class="w-96">
			<MultiSelection label="Specialties" {options} bind:value={preselected} />
			<p class="mt-2 text-body-sm text-muted-foreground">Selected: {preselected.join(', ')}</p>
		</div>
	{/snippet}
</Story>
