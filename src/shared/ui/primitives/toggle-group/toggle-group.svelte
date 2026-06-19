<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';
	import type { ToggleSize, ToggleVariant } from '$shared/ui/primitives/toggle';

	export type ToggleGroupContext = {
		readonly type: 'single' | 'multiple';
		readonly variant: ToggleVariant;
		readonly size: ToggleSize;
		readonly disabled: boolean;
		readonly items: string[];
		isPressed: (value: string) => boolean;
		toggle: (value: string) => void;
		register: (value: string) => void;
		unregister: (value: string) => void;
	};
	export const [getToggleGroupContext, setToggleGroupContext] =
		createContext<ToggleGroupContext>('ToggleGroup');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { handleRovingKeydown } from '$shared/lib/headless';

	let {
		ref = $bindable(null),
		value = $bindable(),
		type = 'single',
		variant = 'default',
		size = 'default',
		disabled = false,
		orientation = 'horizontal',
		class: className,
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string | string[];
		type?: 'single' | 'multiple';
		variant?: ToggleVariant;
		size?: ToggleSize;
		disabled?: boolean;
		orientation?: 'horizontal' | 'vertical';
		onValueChange?: (value: string | string[] | undefined) => void;
	} = $props();

	let items = $state<string[]>([]);

	setToggleGroupContext({
		get type() {
			return type;
		},
		get variant() {
			return variant;
		},
		get size() {
			return size;
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
		isPressed(v) {
			if (type === 'multiple') return Array.isArray(value) && value.includes(v);
			return value === v;
		},
		toggle(v) {
			if (disabled) return;
			if (type === 'multiple') {
				const current = Array.isArray(value) ? value : [];
				value = current.includes(v) ? current.filter((i) => i !== v) : [...current, v];
			} else {
				value = value === v ? undefined : v;
			}
			onValueChange?.(value);
		}
	});

	function onkeydown(event: KeyboardEvent) {
		handleRovingKeydown(event, ref!, { orientation });
	}
</script>

<div
	bind:this={ref}
	role="group"
	data-slot="toggle-group"
	data-orientation={orientation}
	{onkeydown}
	class={cn('flex w-fit items-center rounded-md data-[orientation=vertical]:flex-col', className)}
	{...restProps}
>
	{@render children?.()}
</div>
