<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatePanel } from '$shared/ui/molecules/state-panel';

	const { Story } = defineMeta({
		title: 'Molecules/StatePanel',
		component: StatePanel,
		tags: ['autodocs']
	});
</script>

<Story name="A failed list">
	{#snippet template()}
		<StatePanel
			glyph="cloud-offline-outline"
			title="Δεν μπορέσαμε να φορτώσουμε τη λίστα"
			description="Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά."
			actionLabel="Δοκιμάστε ξανά"
			onAction={() => {}}
		/>
	{/snippet}
</Story>

<Story name="Nothing found">
	{#snippet template()}
		<StatePanel
			glyph="search"
			title="Δεν βρέθηκε κάτι για «xyz»"
			actionLabel="Καθαρισμός αναζήτησης"
			actionHref="#"
		/>
	{/snippet}
</Story>

<Story name="Empty, no way on">
	{#snippet template()}
		<StatePanel glyph="document-text-outline" title="Δεν υπάρχει κάτι ακόμα" />
	{/snippet}
</Story>
