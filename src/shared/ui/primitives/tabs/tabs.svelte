<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	/**
	 * What draws the chosen tab's surface (U-12.4): `own` the tab itself (the server's draw, until the list has
	 * measured it), `handoff` the frame the list's pill takes over (the tab's shadow goes at once, without its
	 * transition), `pill` the one pill that slides from tab to tab.
	 */
	export type TabsSurface = 'own' | 'handoff' | 'pill';

	export type TabsContext = {
		readonly value: string | undefined;
		readonly orientation: 'horizontal' | 'vertical';
		readonly baseId: string;
		readonly surface: TabsSurface;
		setValue: (value: string) => void;
		setSurface: (surface: TabsSurface) => void;
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
	let surface = $state<TabsSurface>('own');

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
		get surface() {
			return surface;
		},
		setValue(next) {
			value = next;
			onValueChange?.(next);
		},
		setSurface(next) {
			surface = next;
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
