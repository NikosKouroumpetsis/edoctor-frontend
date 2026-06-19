<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getDropdownMenuContext } from './dropdown-menu.svelte';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		closeOnSelect = true,
		disabled,
		children,
		onclick,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		variant?: 'default' | 'destructive';
		closeOnSelect?: boolean;
	} = $props();

	const ctx = getDropdownMenuContext();
</script>

<button
	bind:this={ref}
	type="button"
	role="menuitem"
	data-slot="dropdown-menu-item"
	data-variant={variant}
	data-roving-item
	data-disabled={disabled ? '' : undefined}
	{disabled}
	tabindex={-1}
	onclick={(e) => {
		if (disabled) return;
		onclick?.(e);
		if (closeOnSelect) {
			ctx.setOpen(false);
			ctx.triggerEl?.focus();
		}
	}}
	class={cn(
		"relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-body-sm outline-none select-none hover:bg-accent/10 focus:bg-accent/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-destructive data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:focus:bg-destructive/10 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</button>
