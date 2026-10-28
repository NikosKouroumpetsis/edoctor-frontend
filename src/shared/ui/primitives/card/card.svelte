<script lang="ts" module>
	/**
	 * The application's card (its `Card` molecule, U-09.2): ONE shell, the soft card surface with the 70 % hairline and
	 * the 24 inset, a column, no size. The kit's state cards (`ResultsCount`, `KeyValueList`, a `framed` empty state)
	 * draw it with their own inset after it: `cn(cardShellClasses, 'gap-2 p-5')`.
	 */
	export const cardShellClasses =
		'flex flex-col rounded-xl border border-border/70 bg-card/95 p-6 shadow-soft';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(cardShellClasses, 'text-card-foreground', className)}
	{...restProps}
>
	{@render children?.()}
</div>
