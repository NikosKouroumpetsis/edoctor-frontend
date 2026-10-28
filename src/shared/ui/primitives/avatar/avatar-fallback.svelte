<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getAvatarContext, type AvatarSize } from './avatar.svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();

	const ctx = getAvatarContext();

	// The application's initials per size (U-07.1): semibold, `label-md` (tight in the 32 circle) up to `title-sm`.
	const fallbackTextSizes: Record<AvatarSize, string> = {
		sm: 'text-label-md leading-tight',
		md: 'text-label-md',
		lg: 'text-label-lg',
		xl: 'text-title-sm'
	};
</script>

{#if ctx.status !== 'loaded'}
	<span
		bind:this={ref}
		data-slot="avatar-fallback"
		class={cn(
			'flex size-full items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground',
			fallbackTextSizes[ctx.size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</span>
{/if}
