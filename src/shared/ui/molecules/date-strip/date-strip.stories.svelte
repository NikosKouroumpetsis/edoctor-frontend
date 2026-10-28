<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { DateStrip, type DateStripDay } from '$shared/ui/molecules/date-strip';

	const WEEKDAYS = ['Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ', 'Δευ', 'Τρί'];
	// The application's 14 days from Wednesday 29 July, every fifth weekday closed.
	const days: DateStripDay[] = Array.from({ length: 14 }, (_, index) => {
		const date = new Date(Date.UTC(2026, 6, 29 + index));
		const number = date.getUTCDate();
		const month = date.getUTCMonth() === 6 ? 'Ιουλ' : 'Αυγ';
		const label = `${WEEKDAYS[index % 7]} ${number}`;
		return {
			accessibleLabel: `${label} ${month}`,
			disabled: index % 7 === 4,
			label,
			sublabel: month,
			value: date.toISOString().slice(0, 10)
		};
	});
	const scrollLabels = { previous: 'Προηγούμενες ημέρες', next: 'Επόμενες ημέρες' };
	const noop = () => {};

	// The application's meta (`molecules/date-strip`): the second day chosen; the web names the group.
	const { Story } = defineMeta({
		title: 'Molecules/DateStrip',
		component: DateStrip,
		tags: ['autodocs'],
		args: {
			days,
			icon: 'calendar-outline',
			onChange: noop,
			testIdPrefix: 'story-day',
			value: days[1].value,
			'aria-label': 'Ημέρες'
		},
		argTypes: { controlsFrom: { control: 'select', options: ['tablet', 'split', 'laptop'] } }
	});
</script>

<script lang="ts">
	let interactive = $state(days[1].value);
	let arrows = $state(days[2].value);
	let tablet = $state(days[2].value);
</script>

<Story name="Playground" />

<!-- A strip whose press selects the day; it opened on the selected day and stays where the reader left it. -->
<Story name="Interactive">
	{#snippet template(args)}
		<DateStrip {...args} bind:value={interactive} />
	{/snippet}
</Story>

<!-- Opens on a day further along the window. -->
<Story name="Opens On Later Day" args={{ value: days[9].value }} />

<Story name="Without Icon" args={{ icon: undefined }} />

<!-- A closed day stays in the strip, dimmed and not pressable. -->
<Story name="With Closed Days" args={{ value: days[0].value }} />

<!-- Web only (a pointer's screen): ‹ › from 1128, a page = the whole cards in view. -->
<Story
	name="Arrows On Laptop"
	parameters={{ layout: 'fullscreen' }}
	globals={{ viewport: { value: 'z1128', isRotated: false } }}
>
	{#snippet template(args)}
		<div class="mx-auto max-w-content p-card">
			<DateStrip {...args} {scrollLabels} bind:value={arrows} />
		</div>
	{/snippet}
</Story>

<Story
	name="Arrows From Tablet"
	parameters={{ layout: 'fullscreen' }}
	globals={{ viewport: { value: 'z744', isRotated: false } }}
>
	{#snippet template(args)}
		<div class="p-card">
			<DateStrip {...args} {scrollLabels} controlsFrom="tablet" bind:value={tablet} />
		</div>
	{/snippet}
</Story>
