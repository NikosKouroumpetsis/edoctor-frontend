<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FactRow } from '$shared/ui/molecules/fact-row';

	const { Story } = defineMeta({
		title: 'Molecules/FactRow',
		component: FactRow,
		tags: ['autodocs'],
		args: { row: 'when', label: 'Ημέρα και ώρα', values: ['Δευτέρα 16 Νοεμβρίου · 11:00'] }
	});
</script>

<Story name="Playground" />

<Story name="A Card Of Facts">
	{#snippet template()}
		<section class="w-full max-w-form rounded-md border border-line-2 bg-card p-4">
			<FactRow
				row="when"
				label="Ημέρα και ώρα"
				values={['Δευτέρα 16 Νοεμβρίου · 11:00']}
				change={{ label: 'Αλλαγή', ariaLabel: 'Αλλαγή: Ημέρα και ώρα', href: '#' }}
			/>
			<FactRow
				row="place"
				label="Ιατρείο"
				values={['Πατησίων 45, Αθήνα']}
				hint="1ος όροφος"
				phone={{ label: '210 321 0101', dial: '+302103210101' }}
			/>
			<FactRow
				row="person"
				label="Στοιχεία"
				pairs={[
					{ id: 'mobile', label: 'Κινητό', value: '+30 697 765 4321', dial: '+306977654321' },
					{ id: 'email', label: 'Email', value: 'ioanna.karra@example.gr' },
					{ id: 'id', label: 'Αριθμός', value: '23048501234' }
				]}
			/>
			<FactRow
				row="amount"
				label="Κόστος"
				breakdown={{
					lines: [
						{ label: 'Επίσκεψη', amount: '60 €' },
						{ label: 'Καρδιογράφημα', amount: '25 €' }
					],
					totalLabel: 'Σύνολο',
					total: '85 €'
				}}
			/>
			<FactRow row="single" label="Κόστος" values={['45 €']} emphasis hint="Ενδεικτική τιμή." />
			<FactRow
				row="final"
				label="Κόστος"
				values={['40 €']}
				emphasis
				notes={['Τελική τιμή που ορίσατε.']}
				hint="Ενδεικτική τιμή."
			/>
		</section>
	{/snippet}
</Story>

<Story
	name="Never Given"
	args={{ row: 'amka', label: 'ΑΜΚΑ', values: ['Δεν έχει δοθεί'], muted: true }}
/>
