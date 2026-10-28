<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { GuidanceCard } from '$shared/ui/organisms/guidance-card';

	// The application's meta (`organisms/guidance-card`, U-14.2): its words, its two stories.
	const { Story } = defineMeta({
		title: 'Organisms/GuidanceCard',
		component: GuidanceCard,
		tags: ['autodocs'],
		args: {
			eyebrow: 'Πριν ξεκινήσεις',
			title: 'Οδηγίες σύνδεσης',
			body: 'Λίγα πράγματα να έχεις υπόψη σου πριν συνδεθείς.',
			rules: [
				'Χρησιμοποίησε το email της εγγραφής σου.',
				'Ο κωδικός έχει τουλάχιστον 8 χαρακτήρες.',
				'Κράτα ενεργοποιημένη την επαλήθευση δύο βημάτων.'
			]
		}
	});
</script>

<Story name="Playground" />

<Story name="Single Rule" args={{ rules: ['Χρησιμοποίησε το email της εγγραφής σου.'] }} />
