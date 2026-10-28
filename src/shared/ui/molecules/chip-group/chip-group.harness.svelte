<script lang="ts">
	import { untrack } from 'svelte';
	import { Chip } from '$shared/ui/primitives/chip';
	import { ChipGroup } from './index';

	let {
		type = 'single',
		initial = 'morning',
		withRemovable = false
	}: { type?: 'single' | 'multiple'; initial?: string; withRemovable?: boolean } = $props();
	let chosen = $state(untrack(() => initial));
	let removed = $state(false);
</script>

<button type="button" class="size-touch">Πριν</button>
<ChipGroup {type} aria-label="Ώρα">
	{#if withRemovable && !removed}
		<Chip label="Επιλεγμένο" removable onRemove={() => (removed = true)} />
	{/if}
	{#each ['morning', 'noon', 'evening'] as slot (slot)}
		<Chip label={slot} selected={chosen === slot} onclick={() => (chosen = slot)} />
	{/each}
</ChipGroup>
