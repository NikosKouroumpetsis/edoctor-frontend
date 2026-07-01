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

	// Initials track the root avatar size set on the shared context.
	const fallbackTextSizes: Record<AvatarSize, string> = {
		sm: 'text-label-md',
		default: 'text-body-sm',
		lg: 'text-body-md'
	};
</script>

{#if ctx.status !== 'loaded'}
	<span
		bind:this={ref}
		data-slot="avatar-fallback"
		class={cn(
			'flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground',
			fallbackTextSizes[ctx.size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</span>
{/if}
