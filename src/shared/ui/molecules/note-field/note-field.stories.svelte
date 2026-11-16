<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { NoteField } from '$shared/ui/molecules/note-field';

	const { Story } = defineMeta({
		title: 'Molecules/NoteField',
		component: NoteField,
		tags: ['autodocs'],
		args: {
			label: 'Μήνυμα προς τον ασθενή (προαιρετικό)',
			labelAs: 'h3',
			placeholder: 'Ό,τι θέλετε να ξέρει',
			value: '',
			counter: '0/500',
			error: null,
			maxLength: 500,
			height: 'short',
			onInput: () => {}
		}
	});
</script>

<Story name="Playground" />

<Story
	name="Written"
	args={{
		value: 'Αυτή την ώρα έχω ήδη άλλον ασθενή. Μπορείτε να κλείσετε για αύριο το πρωί.',
		counter: '74/500'
	}}
/>

<Story name="Refused" args={{ error: 'Το κείμενο είναι πολύ μεγάλο.', height: 'note' }} />
