<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { DiffBox } from '$shared/ui/molecules/diff-box';

	const { Story } = defineMeta({
		title: 'Molecules/DiffBox',
		component: DiffBox,
		tags: ['autodocs'],
		args: {
			rows: [
				{ id: 'was', label: 'Ήταν', value: 'Σάββατο 14 Νοεμβρίου · 17:30', struck: true },
				{ id: 'next', label: 'Νέα ώρα', value: 'Δευτέρα 16 Νοεμβρίου · 09:00' }
			],
			note: 'Το ραντεβού μένει επιβεβαιωμένο. Ο ασθενής ενημερώνεται αυτόματα.'
		}
	});
</script>

<Story name="Playground" />

<!-- Two totals, nothing struck and no note (the 70's «Διάρκεια · Σύνολο υπηρεσιών»). -->
<Story
	name="Totals"
	args={{
		rows: [
			{ id: 'minutes', label: 'Διάρκεια', value: '40 λεπτά' },
			{ id: 'sum', label: 'Σύνολο υπηρεσιών', value: '75 €' }
		],
		note: null
	}}
/>
