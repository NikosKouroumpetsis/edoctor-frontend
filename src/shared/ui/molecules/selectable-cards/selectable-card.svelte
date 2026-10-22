<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getSelectableCardsContext } from './selectable-cards.svelte';

	let {
		ref = $bindable(null),
		value,
		title,
		description,
		icon,
		disabled,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		value: string;
		title: string;
		description?: string;
		icon?: Snippet;
	} = $props();

	const group = getSelectableCardsContext();
	const selected = $derived(group.isSelected(value));
	const isDisabled = $derived(disabled || group.disabled);
	// Single roving tab stop: the first selected item, else the first registered item.
	const firstSelected = $derived(group.items.find((i) => group.isSelected(i)));
	const tabbable = $derived(firstSelected ? firstSelected === value : group.items[0] === value);

	onMount(() => {
		group.register(value);
		return () => group.unregister(value);
	});
</script>

<button
	bind:this={ref}
	type="button"
	role={group.type === 'single' ? 'radio' : 'checkbox'}
	aria-checked={selected}
	data-slot="selectable-card"
	data-state={selected ? 'selected' : 'unselected'}
	data-roving-item
	data-value={value}
	data-disabled={isDisabled ? '' : undefined}
	disabled={isDisabled}
	tabindex={tabbable ? 0 : -1}
	onclick={() => group.toggle(value)}
	class={cn(
		'flex min-h-touch w-full cursor-pointer items-center justify-between gap-4 rounded-md border-2 bg-card p-card text-left transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out outline-none select-none',
		'active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=selected]:border-foreground data-[state=selected]:bg-foreground/5 data-[state=selected]:shadow-raised data-[state=unselected]:border-input',
		'data-[state=unselected]:hover:border-muted-foreground data-[state=unselected]:focus-visible:border-muted-foreground',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{:else}
		<span class="flex min-w-0 flex-col gap-1">
			<span class="text-title-md text-foreground">{title}</span>
			{#if description}
				<span class="text-body-sm text-muted-foreground">{description}</span>
			{/if}
		</span>
		{#if icon}
			<span class="shrink-0 text-foreground">{@render icon()}</span>
		{/if}
	{/if}
</button>
