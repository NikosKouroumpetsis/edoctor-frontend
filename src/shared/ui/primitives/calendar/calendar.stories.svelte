<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CalendarDate } from '@internationalized/date';
	import { Calendar } from '$shared/ui/primitives/calendar';

	const { Story } = defineMeta({
		title: 'Primitives/Calendar',
		component: Calendar,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let value = $state<CalendarDate | undefined>(undefined);
	let withValue = $state<CalendarDate | undefined>(new CalendarDate(2026, 6, 24));
	let bounded = $state<CalendarDate | undefined>(new CalendarDate(2026, 6, 15));
</script>

<Story name="Default">
	{#snippet template()}
		<Calendar bind:value />
	{/snippet}
</Story>

<Story name="With value">
	{#snippet template()}
		<Calendar bind:value={withValue} />
	{/snippet}
</Story>

<Story name="Min/max range">
	{#snippet template()}
		<Calendar
			bind:value={bounded}
			minValue={new CalendarDate(2026, 6, 10)}
			maxValue={new CalendarDate(2026, 6, 20)}
		/>
	{/snippet}
</Story>
