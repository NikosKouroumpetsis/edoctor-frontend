<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SegmentedControl } from '$shared/ui/molecules/segmented-control';

	const segments = [
		{ label: 'Όλα', value: 'all' },
		{ label: 'Επερχόμενα', value: 'upcoming' },
		{ label: 'Ιστορικό', value: 'history' }
	];

	// The application's meta (`molecules/segmented-control`); the web names the group.
	const { Story } = defineMeta({
		title: 'Molecules/SegmentedControl',
		component: SegmentedControl,
		tags: ['autodocs'],
		args: { segments, value: 'all', disabled: false, 'aria-label': 'Ραντεβού' },
		argTypes: { disabled: { control: 'boolean' } }
	});
</script>

<script lang="ts">
	let playground = $state('all');
	let two = $state('login');
	let long = $state('dates');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><SegmentedControl {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="Two Segments">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<SegmentedControl
				{...args}
				segments={[
					{ label: 'Είσοδος', value: 'login' },
					{ label: 'Εγγραφή', value: 'register' }
				]}
				bind:value={two}
			/>
		</div>
	{/snippet}
</Story>

<!-- A long label wraps, centred, and is never cut with «…». -->
<Story name="Long Label">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<SegmentedControl
				{...args}
				segments={[
					{ label: 'Ημερομηνίες', value: 'dates' },
					{ label: 'Έχω ευελιξία στις ημερομηνίες και στις ώρες', value: 'flexible' }
				]}
				bind:value={long}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true, value: 'upcoming' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><SegmentedControl {...args} /></div>
	{/snippet}
</Story>
