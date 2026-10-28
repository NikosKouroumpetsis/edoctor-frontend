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
		getRovingItems
	} from '$shared/lib/headless';
	import { getSelectContext } from './select.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const ctx = getSelectContext();
	const typeahead = createTypeahead();
	// In the DOM until its CSS leave ends (U-12.2): it grows from 95 % as it fades in, and back out.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });

	// On open, focus the selected option (or the first) so keyboard nav starts there.
	function autofocusSelected(node: HTMLElement) {
		const items = getRovingItems(node);
		const selected = items.find((i) => i.dataset.value === ctx.value);
		(selected ?? items[0])?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			ctx.setOpen(false);
			ctx.triggerEl?.focus();
			return;
		}
		const moved = handleRovingKeydown(event, ref!, { orientation: 'vertical' });
		if (moved) return;
		if (event.key.length === 1) {
			typeahead.onInput(event.key, getRovingItems(ref!));
		}
	}

	function setMinWidth(result: { x: number; y: number }) {
		void result;
		if (ref && ctx.triggerEl) ref.style.minWidth = `${ctx.triggerEl.offsetWidth}px`;
	}
</script>

{#if presence.present}
	<div
		bind:this={ref}
		use:portal
		use:presence.track
		role="listbox"
		id={ctx.contentId}
		aria-labelledby={ctx.triggerId}
		data-slot="select-content"
		data-state={presence.state}
		inert={presence.closing}
		tabindex={-1}
		use:floating={{
			reference: ctx.triggerEl,
			placement: 'bottom-start',
			sideOffset: step(1),
			onPlaced: setMinWidth
		}}
		use:dismissable={{
			enabled: presence.open,
			onDismiss: () => ctx.setOpen(false),
			ignore: [ctx.triggerEl]
		}}
		use:autofocusSelected
		{onkeydown}
		class={cn(
			'z-50 max-h-menu-max-h overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay outline-none',
			'transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
