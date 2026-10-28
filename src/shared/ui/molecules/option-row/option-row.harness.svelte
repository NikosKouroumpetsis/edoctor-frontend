<script lang="ts">
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { SuggestionGroupHeader } from '$shared/ui/molecules/suggestion-group-header';
	import { OptionRow } from './index';

	let { onSelect = () => {} }: { onSelect?: (id: string) => void } = $props();

	/** The typeahead of the criteria panel: the field drives the grouped rows (M-36), the focus stays in it. */
	const groups = [
		{
			id: 'specialties',
			label: 'Ειδικότητες',
			icon: 'medkit-outline',
			options: [
				{ id: 'cardiology', label: 'Καρδιολόγος' },
				{ id: 'cardiac-surgery', label: 'Καρδιοχειρουργός' }
			]
		},
		{
			id: 'doctors',
			label: 'Γιατροί',
			icon: 'person-outline',
			options: [{ id: 'maria', label: 'Μαρία Καρδαμίτση', supporting: 'Παθολόγος · Αθήνα' }]
		}
	] as const;
	const optionIds = groups.flatMap((group) => group.options.map((option) => `option-${option.id}`));

	let query = $state('Καρδ');
	let activeId = $state<string | undefined>();
	let chosen = $state<string | undefined>();

	function commit(id: string) {
		chosen = id;
		onSelect(id);
	}
</script>

<SearchField
	variant="active"
	bind:value={query}
	bind:activeId
	placeholder="Ειδικότητα, γιατρός"
	aria-label="Τι ψάχνετε;"
	onBack={() => {}}
	backLabel="Πίσω"
	onClear={() => {}}
	clearLabel="Καθαρισμός"
	listboxId="what-suggestions"
	{optionIds}
	onCommit={commit}
/>
<div id="what-suggestions" role="listbox" aria-label="Προτάσεις" class="flex flex-col gap-3.5">
	{#each groups as group (group.id)}
		<div role="group" aria-labelledby={`group-${group.id}`} class="flex flex-col gap-1">
			<SuggestionGroupHeader id={`group-${group.id}`} label={group.label} icon={group.icon} />
			{#each group.options as option (option.id)}
				<OptionRow
					accessibilityRole="option"
					id={`option-${option.id}`}
					active={activeId === `option-${option.id}`}
					isSelected={chosen === `option-${option.id}`}
					label={option.label}
					labelClass="font-medium"
					supportingLabel={'supporting' in option ? option.supporting : undefined}
					icon={group.icon}
					{query}
					onclick={() => commit(`option-${option.id}`)}
				/>
			{/each}
		</div>
	{/each}
</div>
