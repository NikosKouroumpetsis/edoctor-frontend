<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import SearchIcon from '~icons/lucide/search';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getCommandContext } from './command.svelte';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLInputAttributes, HTMLInputElement> = $props();

	const ctx = getCommandContext();

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			ctx.move(1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			ctx.move(-1);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			ctx.selectActive();
		}
	}
</script>

<div class="flex items-center gap-2 border-b border-border px-3" data-slot="command-input-wrapper">
	<SearchIcon class="size-4 shrink-0 opacity-50" />
	<input
		bind:this={ref}
		id={ctx.inputId}
		role="combobox"
		aria-expanded="true"
		aria-controls={ctx.listId}
		aria-activedescendant={ctx.activeId}
		autocomplete="off"
		data-slot="command-input"
		value={ctx.search}
		oninput={(e) => ctx.setSearch(e.currentTarget.value)}
		{onkeydown}
		class={cn(
			'flex h-11 w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...restProps}
	/>
</div>
