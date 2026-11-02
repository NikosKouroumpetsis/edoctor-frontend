<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { LinkRows } from '$shared/ui/molecules/link-rows';

	const { Story } = defineMeta({
		title: 'Molecules/LinkRows',
		component: LinkRows,
		tags: ['autodocs']
	});
</script>

<Story name="Other texts">
	{#snippet template()}
		<LinkRows
			title="Άλλα κείμενα"
			rows={[
				{ key: 'one', label: 'Το πρώτο κείμενο', href: '#', icon: 'document-text-outline' },
				{ key: 'two', label: 'Το δεύτερο κείμενο', href: '#', icon: 'document-text-outline' },
				{
					key: 'question',
					label: 'Μια ερώτηση σε δύο γραμμές όταν δεν χωρά σε μία;',
					eyebrow: 'Συχνές ερωτήσεις',
					href: '#',
					icon: 'help-circle-outline'
				}
			]}
		/>
	{/snippet}
</Story>
