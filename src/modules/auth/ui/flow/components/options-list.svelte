<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { cn } from '$shared/lib/utils';

	let {
		label,
		items,
		value,
		onSelect
	}: {
		label: string;
		items: { value: string; label: string }[];
		value: string;
		onSelect: (value: string) => void;
	} = $props();
</script>

<div role="listbox" aria-label={label} class="pb-3">
	{#each items as item (item.value)}
		{@const selected = item.value === value}
		<button
			type="button"
			role="option"
			aria-selected={selected}
			data-testid={`auth-option-${item.value}`}
			class="flex min-h-control-lg w-full flex-row items-center gap-4 px-6 py-2 text-start transition-colors duration-standard ease-standard outline-none focus-visible:bg-background can-hover:hover:bg-background"
			onclick={() => onSelect(item.value)}
		>
			<span class={cn('min-w-0 flex-1 text-body-lg font-medium', selected && 'text-primary-text')}
				>{item.label}</span
			>
			{#if selected}<Ionicon name="checkmark" class="icon-md text-primary" />{/if}
		</button>
	{/each}
</div>
