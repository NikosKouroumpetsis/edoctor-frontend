<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { scale } from 'svelte/transition';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import {
		portal,
		dismissable,
		floating,
		handleRovingKeydown,
		createTypeahead,
		getRovingItems,
		type Placement
	} from '$shared/lib/headless';
	import { getDropdownMenuContext } from './dropdown-menu.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placement = 'bottom',
		align = 'start',
		sideOffset = 6,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
	} = $props();

	const ctx = getDropdownMenuContext();
	const typeahead = createTypeahead();
	const resolvedPlacement = $derived(`${placement}-${align}` as Placement);

	function autofocusFirst(node: HTMLElement) {
		getRovingItems(node)[0]?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			ctx.setOpen(false);
			ctx.triggerEl?.focus();
			return;
		}
		const moved = handleRovingKeydown(event, ref!, { orientation: 'vertical' });
		if (moved) return;
		if (event.key.length === 1) typeahead.onInput(event.key, getRovingItems(ref!));
	}
</script>

{#if ctx.open}
	<div
		bind:this={ref}
		use:portal
		role="menu"
		id={ctx.contentId}
		aria-labelledby={ctx.triggerId}
		data-slot="dropdown-menu-content"
		data-state="open"
		tabindex={-1}
		use:floating={{ reference: ctx.triggerEl, placement: resolvedPlacement, sideOffset }}
		use:dismissable={{ onDismiss: () => ctx.setOpen(false), ignore: [ctx.triggerEl] }}
		use:autofocusFirst
		{onkeydown}
		transition:scale={{ start: 0.95, duration: 120 }}
		class={cn(
			'z-50 min-w-40 overflow-y-auto rounded-control border border-border bg-popover p-1 text-popover-foreground shadow-overlay outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
