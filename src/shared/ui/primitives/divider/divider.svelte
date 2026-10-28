<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type DividerOrientation = 'horizontal' | 'vertical';
	export type DividerSpacing = 'md' | 'none';

	const orientationClasses: Record<DividerOrientation, string> = {
		horizontal: 'border-t border-border/60',
		vertical: 'self-stretch border-l border-border/60'
	};

	/**
	 * The application's `getDividerClassName`: a hairline edge, padded `py-4` below it unless `none`. The vertical
	 * line takes `mx-4` (U-06.6): a padding would sit on one side of its left edge only, 0 left and 32 right.
	 */
	export function dividerClasses({
		orientation = 'horizontal',
		spacing = 'md'
	}: { orientation?: DividerOrientation; spacing?: DividerSpacing } = {}): string {
		const pad = spacing === 'none' ? '' : orientation === 'horizontal' ? 'py-4' : 'mx-4';
		return [orientationClasses[orientation], pad].filter(Boolean).join(' ');
	}

	export type DividerProps = HTMLAttributes<HTMLDivElement> & {
		orientation?: DividerOrientation;
		spacing?: DividerSpacing;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		orientation = 'horizontal',
		spacing = 'md',
		class: className,
		children,
		...restProps
	}: DividerProps = $props();
</script>

<!-- A block that draws its leading edge (and may hold content below it), unlike the bare `Separator` line. -->
<div
	data-slot="divider"
	data-orientation={orientation}
	class={cn(dividerClasses({ orientation, spacing }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
