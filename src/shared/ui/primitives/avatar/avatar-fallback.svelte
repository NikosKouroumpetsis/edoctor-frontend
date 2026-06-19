<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getAvatarContext } from './avatar.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();

	const ctx = getAvatarContext();
</script>

{#if ctx.status !== 'loaded'}
	<span
		bind:this={ref}
		data-slot="avatar-fallback"
		class={cn(
			'flex size-full items-center justify-center rounded-full bg-muted text-body-sm text-muted-foreground',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</span>
{/if}
