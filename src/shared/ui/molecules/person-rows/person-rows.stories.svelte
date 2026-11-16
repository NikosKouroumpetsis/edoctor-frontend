<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PersonRows } from '$shared/ui/molecules/person-rows';

	const { Story } = defineMeta({
		title: 'Molecules/PersonRows',
		component: PersonRows,
		tags: ['autodocs'],
		args: {
			label: 'Πρόσφατοι ασθενείς',
			rows: [
				{
					id: 'p1',
					name: 'Ιωάννα Καρρά',
					lines: ['+30 697 765 4321 · 4 επισκέψεις · τελευταία 22 Οκτωβρίου']
				},
				{
					id: 'p3',
					name: 'Καλλιόπη Ζέρβα',
					lines: ['+30 697 100 2003 · 1 επίσκεψη · τελευταία 2 Νοεμβρίου'],
					note: 'Χωρίς λογαριασμό eDoctor'
				},
				{ id: 'new', name: 'Νέος ασθενής', lines: ['Όνομα, επώνυμο και κινητό'], glyph: 'add' }
			],
			onSelect: () => {}
		}
	});
</script>

<Story name="Playground" />

<Story
	name="One Person"
	args={{ rows: [{ id: 'p1', name: 'Ιωάννα Καρρά', lines: ['+30 697 765 4321'] }] }}
/>

<Story
	name="Lines With Links"
	args={{
		look: 'lines',
		label: 'Οι ασθενείς μου',
		selectedId: 'p1',
		rows: [
			{
				id: 'p4',
				name: 'Νίκος Μαυρίδης',
				lines: ['Αίτημα · σήμερα, 17:30', 'Το κλείνει: Ελένη Μαυρίδη (μητέρα)'],
				href: '#p4'
			},
			{
				id: 'p1',
				name: 'Ιωάννα Καρρά',
				lines: ['Επόμενο: Δευτέρα 16 Νοεμβρίου, 11:00 · 4 επισκέψεις'],
				href: '#p1'
			},
			{
				id: 'p3',
				name: 'Καλλιόπη Ζέρβα',
				lines: ['1 επίσκεψη · τελευταία 2 Νοεμβρίου'],
				note: 'Χωρίς λογαριασμό eDoctor',
				href: '#p3'
			}
		]
	}}
/>
