<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	/**
	 * `default` the line between items (the FAQ); `card` the criteria's bordered cards (M-34, K4.5): the item framed
	 * on the card surface, its trigger and its content inset 16. As the application's, the card keeps the default
	 * item's classes under its own (its `border-b last:border-b-0` included, see the report's open points).
	 */
	export type AccordionItemVariant = 'default' | 'card';

	export type AccordionItemContext = {
		readonly value: string;
		readonly open: boolean;
		readonly disabled: boolean;
		readonly variant: AccordionItemVariant;
		readonly triggerId: string;
		readonly contentId: string;
	};
	export const [getAccordionItemContext, setAccordionItemContext] =
		createContext<AccordionItemContext>('AccordionItem');

	const accordionItemBase = 'overflow-hidden border-b border-border/60 last:border-b-0';
	export const accordionItemVariants: Record<AccordionItemVariant, string> = {
		default: '',
		card: 'rounded-lg border border-border/60 bg-card'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';
	import { getAccordionContext } from './accordion.svelte';

	let {
		ref = $bindable(null),
		value,
		disabled = false,
		variant = 'default',
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
		disabled?: boolean;
		variant?: AccordionItemVariant;
	} = $props();

	const accordion = getAccordionContext();
	const id = useId(undefined, 'accordion');
	const open = $derived(accordion.isOpen(value));

	setAccordionItemContext({
		get value() {
			return value;
		},
		get open() {
			return open;
		},
		get disabled() {
			return disabled || accordion.disabled;
		},
		get variant() {
			return variant;
		},
		triggerId: `${id}-trigger`,
		contentId: `${id}-content`
	});
</script>

<div
	bind:this={ref}
	data-slot="accordion-item"
	data-variant={variant}
	data-state={open ? 'open' : 'closed'}
	class={cn(accordionItemBase, accordionItemVariants[variant], className)}
	{...restProps}
>
	{@render children?.()}
</div>
