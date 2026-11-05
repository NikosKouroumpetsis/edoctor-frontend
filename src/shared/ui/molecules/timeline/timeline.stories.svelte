<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Timeline } from '$shared/ui/molecules/timeline';

	// U-73.1 Ε2: a group in time, the newest first; past three the others open in their place.
	const { Story } = defineMeta({
		title: 'Molecules/Timeline',
		component: Timeline,
		tags: ['autodocs'],
		args: {
			icon: 'school-outline',
			title: 'Σπουδές',
			moreLabel: 'Εμφάνιση όλων (4)',
			fewerLabel: 'Εμφάνιση λιγότερων',
			items: [
				{ id: 'a', when: '2016 – σήμερα', title: 'Ειδικότητα Παθολογίας', detail: 'Ευαγγελισμός' },
				{ id: 'b', when: '2014 – 2016', title: 'Μεταπτυχιακό', detail: 'ΕΚΠΑ' },
				{ id: 'c', when: '2013', title: 'Πτυχίο Ιατρικής', detail: 'ΕΚΠΑ' },
				{ id: 'd', title: 'Ένα στοιχείο χωρίς χρονιά' }
			]
		}
	});
</script>

<Story name="Default" />
