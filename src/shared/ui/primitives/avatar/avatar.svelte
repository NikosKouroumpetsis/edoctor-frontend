<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type AvatarStatus = 'loading' | 'loaded' | 'error';
	export type AvatarContext = {
		status: AvatarStatus;
	};
	export const [getAvatarContext, setAvatarContext] = createContext<AvatarContext>('Avatar');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();

	// Shared, reactive load status set by <Avatar.Image> and read by <Avatar.Fallback>.
	const ctx = $state<AvatarContext>({ status: 'loading' });
	setAvatarContext(ctx);
</script>

<span
	bind:this={ref}
	data-slot="avatar"
	data-status={ctx.status}
	class={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full', className)}
	{...restProps}
>
	{@render children?.()}
</span>
