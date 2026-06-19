<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type AccordionItemContext = {
		readonly value: string;
		readonly open: boolean;
		readonly disabled: boolean;
		readonly triggerId: string;
		readonly contentId: string;
	};
	export const [getAccordionItemContext, setAccordionItemContext] =
		createContext<AccordionItemContext>('AccordionItem');
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
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
		disabled?: boolean;
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
		triggerId: `${id}-trigger`,
		contentId: `${id}-content`
	});
</script>

<div
	bind:this={ref}
	data-slot="accordion-item"
	data-state={open ? 'open' : 'closed'}
	class={cn('border-b border-border last:border-b-0', className)}
	{...restProps}
>
	{@render children?.()}
</div>
