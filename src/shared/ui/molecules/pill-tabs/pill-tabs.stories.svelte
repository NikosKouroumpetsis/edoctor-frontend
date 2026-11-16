<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PillTabs } from '$shared/ui/molecules/pill-tabs';

	const tabs = [
		{ label: 'Ερμού 17', value: 'a' },
		{ label: 'Πανεπιστημίου 40', value: 'b' },
		{ label: 'Λεωφόρος Κηφισίας 120', value: 'c' }
	];
	const noop = () => {};

	// The application's meta (`molecules/pill-tabs`): three offices, the first chosen; the web names the tab list.
	const { Story } = defineMeta({
		title: 'Molecules/PillTabs',
		component: PillTabs,
		tags: ['autodocs'],
		args: { tabs, value: 'a', onChange: noop, 'aria-label': 'Ιατρεία' }
	});
</script>

<script lang="ts">
	let interactive = $state('a');
</script>

<Story name="Playground" />

<Story name="With Heading" args={{ heading: 'Επιλέξτε σημείο' }} />

<!-- Pills whose press selects the tab. -->
<Story name="Interactive">
	{#snippet template(args)}
		<PillTabs {...args} bind:value={interactive} />
	{/snippet}
</Story>

<Story name="Two Tabs" args={{ tabs: tabs.slice(0, 2) }} />

<!-- No tabs draw nothing: one place is not a choice. -->
<Story name="Empty" args={{ tabs: [] }} />

<!-- Screen 66 (`solid`): the chip's fill, the chosen one filled dark (Airbnb's «Σήμερα · Επερχόμενα»). -->
<Story
	name="Solid"
	args={{
		variant: 'solid',
		tabs: [
			{ label: 'Σήμερα', value: 'today' },
			{ label: 'Επερχόμενα', value: 'upcoming' }
		],
		value: 'today',
		'aria-label': 'Ραντεβού'
	}}
/>
