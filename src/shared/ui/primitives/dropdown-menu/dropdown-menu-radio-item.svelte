<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import CircleIcon from '~icons/lucide/circle';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getDropdownMenuRadioContext } from './dropdown-menu-radio-group.svelte';

	let {
		ref = $bindable(null),
		value,
		class: className,
		disabled,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & { value: string } = $props();

	const group = getDropdownMenuRadioContext();
	const checked = $derived(group.value === value);
</script>

<button
	bind:this={ref}
	type="button"
	role="menuitemradio"
	aria-checked={checked}
	data-slot="dropdown-menu-radio-item"
	data-state={checked ? 'checked' : 'unchecked'}
	data-roving-item
	data-disabled={disabled ? '' : undefined}
	{disabled}
	tabindex={-1}
	onclick={() => !disabled && group.select(value)}
	class={cn(
		'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-body-sm outline-none select-none hover:bg-accent/10 focus:bg-accent/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{...restProps}
>
	<span class="absolute left-2 flex size-4 items-center justify-center">
		{#if checked}<CircleIcon class="size-2 fill-current" />{/if}
	</span>
	{@render children?.()}
</button>
