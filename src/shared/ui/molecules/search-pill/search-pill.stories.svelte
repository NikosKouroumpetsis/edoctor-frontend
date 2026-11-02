<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { matchesSearch, searchWords } from '$shared/lib/text';
	import { SearchPill, type SearchPillGroup } from '$shared/ui/molecules/search-pill';

	const topics = ['Αιματολογικές εξετάσεις', 'Προληπτικός έλεγχος', 'Διατροφή και καρδιά'];
	const titles = [
		'Πώς να διαβάσετε σωστά τις αιματολογικές σας εξετάσεις',
		'Καλοκαιρινή ενυδάτωση: πόσο νερό χρειάζεστε',
		'Η καρδιά σας και το πιάτο σας'
	];

	function groupsFor(value: string): SearchPillGroup[] {
		const words = searchWords(value);
		return [
			{
				id: 'topics',
				label: 'Θέματα',
				options: topics
					.filter((topic) => matchesSearch(topic, words))
					.map((topic) => ({
						id: topic,
						title: topic,
						subtitle: 'Θέμα',
						icon: 'medkit-outline' as const
					}))
			},
			{
				id: 'texts',
				label: 'Κείμενα',
				options: titles
					.filter((title) => matchesSearch(title, words))
					.map((title) => ({
						id: title,
						title,
						subtitle: 'Κείμενο',
						icon: 'document-text-outline' as const
					}))
			}
		];
	}

	const { Story } = defineMeta({
		title: 'Molecules/SearchPill',
		component: SearchPill,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let value = $state('αιμα');
	let submitted = $state('');
	const groups = $derived(groupsFor(value));
</script>

<Story name="With suggestions">
	{#snippet template()}
		<div class="flex flex-col gap-4 pb-placeholder-xl">
			<SearchPill
				bind:value
				placeholder="Αναζήτηση στα κείμενα"
				clearLabel="Καθαρισμός αναζήτησης"
				submitLabel="Αναζήτηση"
				listLabel="Προτάσεις"
				{groups}
				emptyLabel="Δεν βρέθηκαν αποτελέσματα"
				onSubmit={(words) => (submitted = words)}
				onPick={(option) => (submitted = option.title)}
			/>
			<p class="text-body-sm text-muted-foreground">{submitted}</p>
		</div>
	{/snippet}
</Story>

<Story name="Without suggestions">
	{#snippet template()}
		<SearchPill
			placeholder="Αναζήτηση στα κείμενα"
			clearLabel="Καθαρισμός αναζήτησης"
			submitLabel="Αναζήτηση"
			listLabel="Προτάσεις"
			suggests={false}
			onSubmit={() => {}}
		/>
	{/snippet}
</Story>
