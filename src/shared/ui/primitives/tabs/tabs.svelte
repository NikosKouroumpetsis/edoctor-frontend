<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type TabsContext = {
		readonly value: string | undefined;
		readonly orientation: 'horizontal' | 'vertical';
		readonly baseId: string;
		setValue: (value: string) => void;
	};
	export const [getTabsContext, setTabsContext] = createContext<TabsContext>('Tabs');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = 'horizontal',
		class: className,
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		orientation?: 'horizontal' | 'vertical';
		onValueChange?: (value: string) => void;
	} = $props();

	const baseId = useId(undefined, 'tabs');

	setTabsContext({
		get value() {
			return value;
		},
		get orientation() {
			return orientation;
		},
		get baseId() {
			return baseId;
		},
		setValue(next) {
			value = next;
			onValueChange?.(next);
		}
	});
</script>

<div
	bind:this={ref}
	data-slot="tabs"
	data-orientation={orientation}
	class={cn('flex flex-col gap-2 data-[orientation=vertical]:flex-row', className)}
	{...restProps}
>
	{@render children?.()}
</div>
