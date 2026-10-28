<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { getAccordionContext } from './accordion.svelte';
	import { getAccordionItemContext } from './accordion-item.svelte';

	let {
		ref = $bindable(null),
		showChevron = false,
		toggleOnClick = true,
		onclick,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		/**
		 * The muted 20 chevron that turns over (180°) as the item opens, on the content's 220 ms and curve (the
		 * application's, off by default; U-09.11).
		 */
		showChevron?: boolean;
		/**
		 * Off: the press calls `onclick` only, the item stays as it is (the criteria open their panel instead); the
		 * application's `toggleOnPress`. A caller's `preventDefault` also keeps it.
		 */
		toggleOnClick?: boolean;
	} = $props();

	const accordion = getAccordionContext();
	const item = getAccordionItemContext();
</script>

<!-- The application's `AccordionTrigger`: a 48 row, its content and the optional chevron at the ends, 16 apart.
     Its item clips (`overflow-hidden`, the application's) at the trigger's edges, so the web's ring is inset (as
     `PillTabs`); on the card it takes the card's corners. -->
<h3 class="flex">
	<button
		bind:this={ref}
		type="button"
		id={item.triggerId}
		aria-expanded={item.open}
		aria-controls={item.contentId}
		data-slot="accordion-trigger"
		data-state={item.open ? 'open' : 'closed'}
		disabled={item.disabled}
		onclick={(event) => {
			onclick?.(event);
			if (toggleOnClick && !event.defaultPrevented) accordion.toggle(item.value);
		}}
		class={cn(
			'flex min-h-touch w-full flex-1 flex-row items-center justify-between gap-4 py-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:opacity-50',
			item.variant === 'card' && 'rounded-lg px-4',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showChevron}
			<Ionicon
				name="chevron-down"
				data-testid={`${item.value}-accordion-chevron`}
				class={cn(
					'icon-md shrink-0 text-muted-foreground transition-transform duration-accordion ease-accordion',
					item.open && 'rotate-180'
				)}
			/>
		{/if}
	</button>
</h3>
