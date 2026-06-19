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

{#if ctx.open}
	<div
		bind:this={ref}
		use:portal
		role="listbox"
		id={ctx.contentId}
		aria-labelledby={ctx.triggerId}
		data-slot="select-content"
		data-state="open"
		tabindex={-1}
		use:floating={{
			reference: ctx.triggerEl,
			placement: 'bottom-start',
			sideOffset: 4,
			onPlaced: setMinWidth
		}}
		use:dismissable={{ onDismiss: () => ctx.setOpen(false), ignore: [ctx.triggerEl] }}
		use:autofocusSelected
		{onkeydown}
		transition:scale={{ start: 0.95, duration: 120 }}
		class={cn(
			'z-50 max-h-72 overflow-y-auto rounded-control border border-border bg-popover p-1 text-popover-foreground shadow-overlay outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
