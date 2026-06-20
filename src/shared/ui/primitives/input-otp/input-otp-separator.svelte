<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import MinusIcon from '~icons/lucide/minus';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { children?: Snippet } = $props();
</script>

<div
	bind:this={ref}
	role="separator"
	data-slot="input-otp-separator"
	class={cn('flex items-center text-muted-foreground', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{:else}
		<MinusIcon class="size-4" />
	{/if}
</div>
