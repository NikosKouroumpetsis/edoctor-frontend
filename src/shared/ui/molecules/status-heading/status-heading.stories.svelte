<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatusHeading } from '$shared/ui/molecules/status-heading';

	const { Story } = defineMeta({
		title: 'Molecules/StatusHeading',
		component: StatusHeading,
		tags: ['autodocs'],
		args: {
			pill: { label: 'Επιβεβαιωμένο', tone: 'success' },
			day: 'Δευτέρα 16 Νοεμβρίου',
			time: '11:00',
			separator: ' · ',
			sub: 'Σε 2 ημέρες · Διάρκεια 20 λεπτά'
		}
	});
</script>

<Story name="Playground" />

<Story
	name="Waiting"
	args={{
		pill: { label: 'Αίτημα', tone: 'warning' },
		time: '17:30',
		sub: 'Σε 5 ώρες · Διάρκεια 30 λεπτά'
	}}
/>

<Story
	name="Over, The Length Alone"
	args={{ pill: { label: 'Ολοκληρώθηκε', tone: 'muted' }, sub: 'Διάρκεια 30 λεπτά' }}
/>
