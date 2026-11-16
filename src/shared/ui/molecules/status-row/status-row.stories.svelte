<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatusRow } from '$shared/ui/molecules/status-row';

	const { Story } = defineMeta({
		title: 'Molecules/StatusRow',
		component: StatusRow,
		tags: ['autodocs'],
		args: {
			title: 'Δευτέρα 16 Νοεμβρίου · 11:00',
			subtitle: 'Επανέλεγχος · 20 λεπτά · Πατησίων 45',
			pill: { label: 'Επιβεβαιωμένο', tone: 'success' },
			href: '#appointment'
		}
	});
</script>

<Story name="Playground" />

<Story name="A List">
	{#snippet template()}
		<div class="flex flex-col border-t border-line">
			<StatusRow
				title="Σήμερα · 17:30"
				subtitle="Επίσκεψη · 30 λεπτά · Κηφισίας 120"
				pill={{ label: 'Αίτημα', tone: 'warning' }}
				href="#a"
			/>
			<StatusRow
				title="Πέμπτη 2 Ιουλίου · 12:00"
				subtitle="Επίσκεψη · 30 λεπτά · Κηφισίας 120"
				pill={{ label: 'Δεν ήρθε', tone: 'muted' }}
				href="#b"
			/>
			<StatusRow title="Τρίτη 3 Μαρτίου · 09:30" href="#c" />
		</div>
	{/snippet}
</Story>
