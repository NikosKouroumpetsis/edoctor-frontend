<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { TimeSlotGrid } from '$shared/ui/molecules/time-slot-grid';

	const slots = [
		'09:00',
		'09:30',
		'10:00',
		'10:30',
		'11:00',
		'11:30',
		'12:00',
		'16:00',
		'16:30'
	].map((label) => ({ label, value: label }));
	const noop = () => {};

	// The application's meta (`molecules/time-slot-grid`): nine times, 10:00 chosen; the web names the group.
	const { Story } = defineMeta({
		title: 'Molecules/TimeSlotGrid',
		component: TimeSlotGrid,
		tags: ['autodocs'],
		args: {
			emptyText: 'Δεν υπάρχουν διαθέσιμες ώρες αυτή την ημέρα.',
			onChange: noop,
			slots,
			value: '10:00',
			'aria-label': 'Ώρες'
		}
	});
</script>

<script lang="ts">
	let interactive = $state<string | undefined>('10:00');
</script>

<Story name="Playground" />

<Story name="Nothing Selected" args={{ value: undefined }} />

<!-- A grid whose press selects the slot (the solid primary chip). -->
<Story name="Interactive">
	{#snippet template(args)}
		<TimeSlotGrid {...args} bind:value={interactive} />
	{/snippet}
</Story>

<Story name="Three Columns" args={{ columns: 3 }} />

<Story name="Empty" args={{ slots: [] }} />

<!-- Four columns on a phone, five from the tablet, six from the laptop. -->
<Story name="By Zone" args={{ columns: { laptop: 6, phone: 4, tablet: 5 } }} />
