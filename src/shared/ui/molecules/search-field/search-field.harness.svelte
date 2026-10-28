<script lang="ts">
	import { SearchField } from './index';

	let {
		withListbox = false,
		value = $bindable(''),
		onCommit = () => {},
		onClear = () => {}
	}: {
		withListbox?: boolean;
		value?: string;
		onCommit?: (id: string) => void;
		onClear?: () => void;
	} = $props();

	let activeId = $state<string | undefined>();
	const ids = ['option-cardiology', 'option-dermatology', 'option-neurology'];
</script>

{#if withListbox}
	<SearchField
		variant="active"
		bind:value
		bind:activeId
		placeholder="Ειδικότητα, γιατρός"
		aria-label="Τι ψάχνετε;"
		onBack={() => {}}
		backLabel="Πίσω"
		clearLabel="Καθαρισμός"
		{onClear}
		listboxId="suggestions"
		optionIds={ids}
		{onCommit}
	/>
	<div id="suggestions" role="listbox" aria-label="Προτάσεις">
		{#each ids as id (id)}
			<div {id} role="option" aria-selected={id === activeId} class="min-h-touch w-full">{id}</div>
		{/each}
	</div>
	<p data-testid="active">{activeId ?? 'none'}</p>
{:else}
	<SearchField bind:value placeholder="Ειδικότητα, γιατρός" aria-label="Τι ψάχνετε;" />
{/if}
