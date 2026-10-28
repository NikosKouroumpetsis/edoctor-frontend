<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CalendarDate } from '@internationalized/date';
	import { Calendar } from '$shared/ui/primitives/calendar';

	// The application's meta (`molecules/calendar`): June 2026 with the 20th chosen, the month arrows in Greek.
	const { Story } = defineMeta({
		title: 'Primitives/Calendar',
		component: Calendar,
		tags: ['autodocs'],
		args: { previousMonthLabel: 'Προηγούμενος μήνας', nextMonthLabel: 'Επόμενος μήνας' }
	});
</script>

<script lang="ts">
	let playground = $state<CalendarDate | undefined>(new CalendarDate(2026, 6, 20));
	let ranged = $state<CalendarDate | undefined>(new CalendarDate(2026, 6, 20));
	let empty = $state<CalendarDate | undefined>(undefined);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Calendar {...args} bind:value={playground} />
	{/snippet}
</Story>

<Story name="With Range">
	{#snippet template(args)}
		<Calendar
			{...args}
			bind:value={ranged}
			minValue={new CalendarDate(2026, 6, 5)}
			maxValue={new CalendarDate(2026, 6, 25)}
		/>
	{/snippet}
</Story>

<!-- No day chosen yet. -->
<Story name="Without Value">
	{#snippet template(args)}
		<Calendar {...args} bind:value={empty} />
	{/snippet}
</Story>
