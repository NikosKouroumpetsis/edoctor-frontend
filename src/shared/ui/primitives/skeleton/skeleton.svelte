<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'children'>> = $props();
</script>

<!-- The application's skeleton: the muted surface at 95 %, `rounded-lg`, breathing 0.9 ⇄ 0.4 (850 ms each way).
     Decorative: the region that waits says it is busy (`aria-busy`), not each placeholder. -->
<div
	bind:this={ref}
	aria-hidden="true"
	data-slot="skeleton"
	class={cn('animate-skeleton overflow-hidden rounded-lg bg-muted/95', className)}
	{...restProps}
></div>
