<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';
	import CheckIcon from '~icons/lucide/check';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getSelectContext } from './select.svelte';

	let {
		ref = $bindable(null),
		value,
		label,
		class: className,
		disabled,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		value: string;
		/** Display label registered for the trigger value. Defaults to text content. */
		label?: string;
	} = $props();

	const ctx = getSelectContext();
	const selected = $derived(ctx.value === value);

	// Register the display label. We intentionally do NOT unregister on unmount:
	// option elements only exist while the listbox is open, but <SelectValue>
	// must keep showing the chosen label after it closes, so the label is cached
	// on the (always-mounted) root.
	onMount(() => {
		ctx.registerItem(value, label ?? ref?.textContent?.trim() ?? value);
	});
</script>

<button
	bind:this={ref}
	type="button"
	role="option"
	aria-selected={selected}
	data-slot="select-item"
	data-state={selected ? 'checked' : 'unchecked'}
	data-roving-item
	data-value={value}
	data-disabled={disabled ? '' : undefined}
	{disabled}
	tabindex={-1}
	onclick={() => !disabled && ctx.select(value)}
	class={cn(
		'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-base outline-none select-none hover:bg-accent/10 focus:bg-accent/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	{#if selected}
		<span class="absolute right-2 flex size-4 items-center justify-center">
			<CheckIcon class="size-4" />
		</span>
	{/if}
</button>
