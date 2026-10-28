<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { step } from '$shared/design/tokens';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import {
		Presence,
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
		sideOffset = step(1.5),
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		placement?: 'top' | 'bottom' | 'left' | 'right';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
	} = $props();

	const ctx = getDropdownMenuContext();
	// In the DOM until its CSS leave ends (U-12.2): it grows from 95 % as it fades in, and back out.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });
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

{#if presence.present}
	<div
		bind:this={ref}
		use:portal
		use:presence.track
		role="menu"
		id={ctx.contentId}
		aria-labelledby={ctx.triggerId}
		data-slot="dropdown-menu-content"
		data-state={presence.state}
		inert={presence.closing}
		tabindex={-1}
		use:floating={{ reference: ctx.triggerEl, placement: resolvedPlacement, sideOffset }}
		use:dismissable={{
			enabled: presence.open,
			onDismiss: () => ctx.setOpen(false),
			ignore: [ctx.triggerEl]
		}}
		use:autofocusFirst
		{onkeydown}
		class={cn(
			'z-50 min-w-menu-min-w overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay outline-none',
			'transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
