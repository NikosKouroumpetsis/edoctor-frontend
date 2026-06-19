<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type DropdownMenuRadioContext = {
		readonly value: string | undefined;
		select: (value: string) => void;
	};
	export const [getDropdownMenuRadioContext, setDropdownMenuRadioContext] =
		createContext<DropdownMenuRadioContext>('DropdownMenuRadioGroup');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		onValueChange?: (value: string) => void;
	} = $props();

	setDropdownMenuRadioContext({
		get value() {
			return value;
		},
		select(next) {
			value = next;
			onValueChange?.(next);
		}
	});
</script>

<div
	bind:this={ref}
	role="group"
	data-slot="dropdown-menu-radio-group"
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</div>
