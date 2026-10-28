<script lang="ts">
	import {
		Command,
		CommandInput,
		CommandList,
		CommandEmpty,
		CommandGroup,
		CommandItem
	} from './index';

	let { value = $bindable(''), early = false }: { value?: string; early?: boolean } = $props();
</script>

<Command bind:value>
	<CommandInput placeholder="Αναζήτηση εντολής" aria-label="Αναζήτηση εντολής" />
	<CommandList>
		<CommandEmpty>Δεν βρέθηκαν αποτελέσματα.</CommandEmpty>
		{#if early}
			<CommandGroup heading="Πρόσφατα">
				<CommandItem value="πρόσφατη αναζήτηση recent">Πρόσφατη αναζήτηση</CommandItem>
			</CommandGroup>
		{/if}
		<CommandGroup heading="Προτάσεις">
			<CommandItem value="ημερολόγιο calendar">Ημερολόγιο</CommandItem>
			<CommandItem value="αναζήτηση γιατρού search">Αναζήτηση γιατρού</CommandItem>
		</CommandGroup>
		<CommandGroup heading="Ρυθμίσεις">
			<CommandItem value="προφίλ profile">Προφίλ</CommandItem>
			<CommandItem value="ρυθμίσεις settings">Ρυθμίσεις</CommandItem>
		</CommandGroup>
	</CommandList>
</Command>
