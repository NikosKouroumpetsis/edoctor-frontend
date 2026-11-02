<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SearchPill } from '$shared/ui/molecules/search-pill';
	import { Chip } from '$shared/ui/primitives/chip';
	import { ListHeader } from '$shared/ui/organisms/list-header';

	const kinds = ['Όλα', 'Πρώτο είδος', 'Δεύτερο είδος'];

	const { Story } = defineMeta({
		title: 'Organisms/ListHeader',
		component: ListHeader,
		tags: ['autodocs']
	});
</script>

<Story name="Title, search and chips">
	{#snippet template()}
		<ListHeader title="Ο τίτλος της λίστας" chipsLabel="Είδος">
			{#snippet search()}
				<SearchPill
					placeholder="Αναζήτηση στη λίστα"
					clearLabel="Καθαρισμός αναζήτησης"
					submitLabel="Αναζήτηση"
					listLabel="Προτάσεις"
					suggests={false}
					onSubmit={() => {}}
				/>
			{/snippet}
			{#snippet chips()}
				{#each kinds as kind, index (kind)}
					<Chip
						label={kind}
						href="#"
						selected={index === 0}
						variant="tinted"
						textClass="text-body-sm"
					/>
				{/each}
			{/snippet}
		</ListHeader>
	{/snippet}
</Story>
