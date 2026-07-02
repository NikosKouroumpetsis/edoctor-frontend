<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type SelectableCardsContext = {
		readonly type: 'single' | 'multiple';
		readonly disabled: boolean;
		readonly items: string[];
		isSelected: (value: string) => boolean;
		toggle: (value: string) => void;
		register: (value: string) => void;
		unregister: (value: string) => void;
	};

	export const [getSelectableCardsContext, setSelectableCardsContext] =
		createContext<SelectableCardsContext>('SelectableCards');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { handleRovingKeydown, useId } from '$shared/lib/headless';

	let {
		ref = $bindable(null),
		value = $bindable(),
		type = 'single',
		disabled = false,
		orientation = 'vertical',
		label,
		class: className,
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string | string[];
		type?: 'single' | 'multiple';
		disabled?: boolean;
		orientation?: 'vertical' | 'horizontal';
		label?: string;
		onValueChange?: (value: string | string[] | undefined) => void;
	} = $props();

	const labelId = useId();
	let items = $state<string[]>([]);

	const context = setSelectableCardsContext({
		get type() {
			return type;
		},
		get disabled() {
			return disabled;
		},
		get items() {
			return items;
		},
		register(v) {
			if (!items.includes(v)) items.push(v);
		},
		unregister(v) {
			items = items.filter((i) => i !== v);
		},
		isSelected(v) {
			if (type === 'multiple') return Array.isArray(value) && value.includes(v);
			return value === v;
		},
		toggle(v) {
			if (disabled) return;
			if (type === 'multiple') {
				const current = Array.isArray(value) ? value : [];
				value = current.includes(v) ? current.filter((i) => i !== v) : [...current, v];
			} else {
				// Radiogroup semantics: selecting sets the value; re-selecting keeps it.
				value = v;
			}
			onValueChange?.(value);
		}
	});

	function onkeydown(event: KeyboardEvent) {
		const moved = handleRovingKeydown(event, ref!, { orientation });
		// Single (radiogroup): arrow keys move focus AND select the focused card.
		if (type === 'single' && moved?.dataset.value) context.toggle(moved.dataset.value);
	}
</script>

<div class={cn('w-full', className)} data-slot="selectable-cards">
	{#if label}
		<p id={labelId} class="mb-4 text-heading-md text-foreground">{label}</p>
	{/if}
	<div
		bind:this={ref}
		role={type === 'single' ? 'radiogroup' : 'group'}
		data-orientation={orientation}
		aria-labelledby={label ? labelId : undefined}
		{onkeydown}
		class="flex gap-3 data-[orientation=vertical]:flex-col"
		{...restProps}
	>
		{@render children?.()}
	</div>
</div>
