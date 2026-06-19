<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type RadioGroupContext = {
		readonly value: string | undefined;
		readonly name: string | undefined;
		readonly disabled: boolean;
		readonly required: boolean;
		readonly items: string[];
		select: (value: string) => void;
		register: (value: string) => void;
		unregister: (value: string) => void;
	};
	export const [getRadioGroupContext, setRadioGroupContext] =
		createContext<RadioGroupContext>('RadioGroup');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { handleRovingKeydown } from '$shared/lib/headless';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		name,
		disabled = false,
		required = false,
		orientation = 'vertical',
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		orientation?: 'horizontal' | 'vertical';
		onValueChange?: (value: string) => void;
	} = $props();

	let items = $state<string[]>([]);

	setRadioGroupContext({
		get value() {
			return value;
		},
		get name() {
			return name;
		},
		get disabled() {
			return disabled;
		},
		get required() {
			return required;
		},
		get items() {
			return items;
		},
		select(next) {
			if (disabled) return;
			value = next;
			onValueChange?.(next);
		},
		register(v) {
			if (!items.includes(v)) items.push(v);
		},
		unregister(v) {
			items = items.filter((i) => i !== v);
		}
	});

	function onkeydown(event: KeyboardEvent) {
		if (disabled) return;
		const next = handleRovingKeydown(event, ref!, { orientation });
		const nextValue = next?.dataset.value;
		if (nextValue) {
			value = nextValue;
			onValueChange?.(nextValue);
		}
	}
</script>

<div
	bind:this={ref}
	role="radiogroup"
	aria-required={required}
	aria-orientation={orientation}
	data-slot="radio-group"
	{onkeydown}
	class={cn('grid gap-3', className)}
	{...restProps}
>
	{@render children?.()}
</div>
