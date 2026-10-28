<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type AccordionType = 'single' | 'multiple';

	export type AccordionContext = {
		readonly type: AccordionType;
		readonly disabled: boolean;
		isOpen: (value: string) => boolean;
		toggle: (value: string) => void;
	};
	export const [getAccordionContext, setAccordionContext] =
		createContext<AccordionContext>('Accordion');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(),
		type = 'single',
		collapsible = false,
		disabled = false,
		class: className,
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string | string[];
		type?: AccordionType;
		/** Single: a press on the open item closes it (the application's `collapsible`, off by default). */
		collapsible?: boolean;
		disabled?: boolean;
		onValueChange?: (value: string | string[] | undefined) => void;
	} = $props();

	setAccordionContext({
		get type() {
			return type;
		},
		get disabled() {
			return disabled;
		},
		isOpen(v) {
			if (type === 'multiple') return Array.isArray(value) && value.includes(v);
			return value === v;
		},
		toggle(v) {
			if (disabled) return;
			if (type === 'multiple') {
				const current = Array.isArray(value) ? value : [];
				value = current.includes(v) ? current.filter((i) => i !== v) : [...current, v];
			} else {
				value = value === v ? (collapsible ? undefined : v) : v;
			}
			onValueChange?.(value);
		}
	});
</script>

<div bind:this={ref} data-slot="accordion" class={cn('w-full', className)} {...restProps}>
	{@render children?.()}
</div>
