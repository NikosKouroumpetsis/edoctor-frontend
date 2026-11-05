<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ExpandableText } from '$shared/ui/molecules/expandable-text';

	const long =
		'Η γιατρός εξήγησε με υπομονή όλα τα αποτελέσματα, απάντησε σε κάθε ερώτηση και έδωσε σαφείς οδηγίες για τα επόμενα βήματα. '.repeat(
			5
		);

	// U-66.1 Π7: four lines and «Εμφάνιση περισσότερων», which opens the text in its place.
	const { Story } = defineMeta({
		title: 'Molecules/ExpandableText',
		component: ExpandableText,
		tags: ['autodocs'],
		args: { text: long, moreLabel: 'Εμφάνιση περισσότερων', textClass: 'text-body-sm' }
	});
</script>

<Story name="Cut" />

<Story name="Short" args={{ text: 'Πολύ καλή εμπειρία.' }} />

<Story name="Search" args={{ query: 'υπομονή', whole: true }} />
