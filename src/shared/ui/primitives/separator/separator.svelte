<script lang="ts" module>
	import type { DividerOrientation, DividerSpacing } from '$shared/ui/primitives/divider';

	// The application's `Separator` (`atoms/separator`): a 1px line, with its own margin unless `none`. The vertical
	// line stretches to its row's height and never grows along it (`flex-1` would make it share the row's width).
	const orientationClasses: Record<DividerOrientation, string> = {
		horizontal: 'h-px w-full bg-border/60',
		vertical: 'w-px self-stretch bg-border/60'
	};
	const spacingClasses: Record<DividerOrientation, Record<DividerSpacing, string>> = {
		horizontal: { md: 'my-2', none: '' },
		vertical: { md: 'mx-4', none: '' }
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		orientation = 'horizontal',
		spacing = 'md',
		decorative = true,
		'data-slot': dataSlot = 'separator',
		...restProps
	}: WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'children'>> & {
		orientation?: DividerOrientation;
		spacing?: DividerSpacing;
		/** A purely visual line (the default) or a separator assistive tech announces. */
		decorative?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot={dataSlot}
	role={decorative ? 'none' : 'separator'}
	aria-orientation={!decorative && orientation === 'vertical' ? 'vertical' : undefined}
	data-orientation={orientation}
	class={cn(
		'shrink-0',
		orientationClasses[orientation],
		spacingClasses[orientation][spacing],
		className
	)}
	{...restProps}
></div>
