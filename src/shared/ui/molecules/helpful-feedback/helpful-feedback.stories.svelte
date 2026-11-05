<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { HelpfulFeedback } from '$shared/ui/molecules/helpful-feedback';

	const reasons = [
		{ id: 'not-answered', label: 'Δεν απάντησε στην ερώτησή μου' },
		{ id: 'unclear', label: 'Δύσκολο στην κατανόηση' },
		{ id: 'outdated', label: 'Λάθος ή παλιά πληροφορία' }
	];

	// U-78 (`23-helpful` Π2, Π3): two thumbs and the words beside them; the reasons open only after «down».
	const { Story } = defineMeta({
		title: 'Molecules/HelpfulFeedback',
		component: HelpfulFeedback,
		tags: ['autodocs'],
		args: {
			value: null,
			reasons,
			question: 'Ήταν χρήσιμο;',
			thanks: 'Ευχαριστούμε για την απάντηση',
			undone: 'Η απάντηση αναιρέθηκε',
			upLabel: 'Ναι, ήταν χρήσιμο',
			downLabel: 'Όχι, δεν ήταν χρήσιμο',
			reasonsTitle: 'Τι δεν πήγε καλά; (προαιρετικό)',
			onVote: () => {}
		},
		argTypes: { size: { control: 'select', options: ['md', 'sm'] } }
	});
</script>

<Story name="Article" />

<Story name="Answered" args={{ value: 'up' }} />

<Story name="Reasons" args={{ value: 'down', reason: 'unclear' }} />

<Story name="Inside an answer" args={{ size: 'sm' }} />

<Story name="Failed" args={{ failedMessage: 'Η απάντηση δεν καταγράφηκε. Δοκιμάστε ξανά.' }} />
