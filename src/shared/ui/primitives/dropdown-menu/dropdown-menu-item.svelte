<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import { getDropdownMenuContext } from './dropdown-menu.svelte';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		closeOnSelect = true,
		icon,
		href,
		disabled,
		children,
		onclick,
		...restProps
	}: WithElementRef<
		Omit<HTMLButtonAttributes, 'onclick'> & Omit<HTMLAnchorAttributes, 'onclick'>,
		HTMLElement
	> & {
		variant?: 'default' | 'destructive';
		closeOnSelect?: boolean;
		/** A 16 glyph before the words, in the item's colour (danger when destructive), the application's `icon`. */
		icon?: IoniconName;
		/** Web only: the item is a link to this page (already resolved by the caller), not a button. */
		href?: string;
		onclick?: (event: MouseEvent) => void;
	} = $props();

	const ctx = getDropdownMenuContext();

	const itemClass =
		"relative flex min-h-touch w-full items-center gap-2 rounded-sm px-2 py-1.5 text-body-sm outline-none select-none hover:bg-accent/10 focus:bg-accent/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-danger-text data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:focus:bg-destructive/10 [&_svg:not([class*='size-'])]:size-4";

	function select(event: MouseEvent) {
		if (disabled) return;
		onclick?.(event);
		if (closeOnSelect) {
			ctx.setOpen(false);
			// A link leaves the page: the focus follows it, never back to the trigger.
			if (!href) ctx.triggerEl?.focus();
		}
	}
</script>

{#if href && !disabled}
	<a
		bind:this={ref}
		{href}
		role="menuitem"
		data-slot="dropdown-menu-item"
		data-variant={variant}
		data-roving-item
		tabindex={-1}
		onclick={select}
		class={cn(itemClass, className)}
		{...restProps}
	>
		{#if icon}
			<Ionicon name={icon} data-slot="dropdown-menu-item-icon" class="icon-sm" />
		{/if}
		{@render children?.()}
	</a>
{:else}
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
		onclick={select}
		class={cn(itemClass, className)}
		{...restProps}
	>
		{#if icon}
			<Ionicon name={icon} data-slot="dropdown-menu-item-icon" class="icon-sm" />
		{/if}
		{@render children?.()}
	</button>
{/if}
