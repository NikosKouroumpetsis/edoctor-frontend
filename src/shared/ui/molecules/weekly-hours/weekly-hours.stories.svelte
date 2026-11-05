<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { WeeklyHours } from '$shared/ui/molecules/weekly-hours';

	// U-68.1 Π5: the week by groups of days; the closed days last, today's line with its badge.
	const { Story } = defineMeta({
		title: 'Molecules/WeeklyHours',
		component: WeeklyHours,
		tags: ['autodocs'],
		args: {
			closedLabel: 'Κλειστό',
			todayLabel: 'Σήμερα',
			rows: [
				{ id: 'a', days: 'Δευ–Παρ', ranges: ['09:00–14:00', '17:00–20:00'], today: true },
				{ id: 'b', days: 'Σάβ', ranges: ['09:00–13:00'], today: false },
				{ id: 'c', days: 'Κυρ', ranges: [], today: false }
			]
		}
	});
</script>

<Story name="Default" />
