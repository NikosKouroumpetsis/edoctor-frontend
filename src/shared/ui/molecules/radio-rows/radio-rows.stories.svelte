<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';

	const { Story } = defineMeta({
		title: 'Molecules/RadioRows',
		component: RadioRows,
		tags: ['autodocs'],
		args: {
			label: 'Λόγος',
			value: null,
			frame: 'always',
			options: [
				{ value: 'unavailable', label: 'Δεν είμαι διαθέσιμος/η' },
				{ value: 'emergency', label: 'Έκτακτο περιστατικό' },
				{ value: 'other', label: 'Άλλος λόγος' }
			],
			onChange: () => {}
		}
	});
</script>

<Story name="Playground" />

<Story name="Chosen" args={{ value: 'emergency' }} />

<Story name="Framed Below 744 Only" args={{ frame: 'phone' }} />

<Story
	name="With A Note"
	args={{
		label: 'Τι έγινε τελικά;',
		value: 'COMPLETED',
		options: [
			{ value: 'COMPLETED', label: 'Ολοκληρώθηκε', note: 'όπως είναι τώρα' },
			{ value: 'NO_SHOW', label: 'Δεν ήρθε' }
		]
	}}
/>

<Story
	name="With A Note Under The Label"
	args={{
		label: 'Είδος',
		value: 'ARTICLE',
		notePlace: 'under',
		options: [
			{ value: 'ARTICLE', label: 'Άρθρο', note: 'Εξηγεί ένα θέμα υγείας, με υπότιτλους.' },
			{ value: 'ADVICE', label: 'Συμβουλή υγείας', note: 'Σύντομες, πρακτικές οδηγίες.' }
		]
	}}
/>

<Story
	name="With A Detail"
	args={{
		label: 'Ιατρείο',
		value: 'a',
		options: [
			{ value: 'a', label: 'Κηφισίας 120', detail: 'Λεωφ. Κηφισίας 120, Αθήνα 115 26' },
			{ value: 'b', label: 'Πατησίων 45', detail: 'Πατησίων 45, Αθήνα 104 33' }
		]
	}}
/>
