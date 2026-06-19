<script lang="ts">
	import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from './index';

	let { onSelect }: { onSelect?: (value: string) => void } = $props();
	const fruits = ['Apple', 'Banana', 'Cherry', 'Grape'];
</script>

<Command>
	<CommandInput placeholder="Search fruit" aria-label="Search fruit" />
	<CommandList>
		<CommandEmpty>No results.</CommandEmpty>
		{#each fruits as fruit (fruit)}
			<CommandItem value={fruit} onSelect={(v) => onSelect?.(v)}>{fruit}</CommandItem>
		{/each}
	</CommandList>
</Command>
