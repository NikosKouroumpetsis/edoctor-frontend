<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type AvatarStatus = 'loading' | 'loaded' | 'error';
	export type AvatarSize = 'sm' | 'default' | 'lg';
	export type AvatarContext = {
		status: AvatarStatus;
		size: AvatarSize;
	};
	export const [getAvatarContext, setAvatarContext] = createContext<AvatarContext>('Avatar');

	/** Root box size; <Avatar.Fallback> scales its initials to match. */
	export const avatarSizes: Record<AvatarSize, string> = {
		sm: 'size-8',
		default: 'size-10',
		lg: 'size-12'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		size = 'default',
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> & { size?: AvatarSize } = $props();

	// Shared, reactive load status (mutated by <Avatar.Image>) plus the root size,
	// exposed as a live getter so <Avatar.Fallback> always reads the current value.
	let status = $state<AvatarStatus>('loading');
	const ctx: AvatarContext = {
		get status() {
			return status;
		},
		set status(next) {
			status = next;
		},
		get size() {
			return size;
		}
	};
	setAvatarContext(ctx);
</script>

<span
	bind:this={ref}
	data-slot="avatar"
	data-status={ctx.status}
	class={cn('relative flex shrink-0 overflow-hidden rounded-full', avatarSizes[size], className)}
	{...restProps}
>
	{@render children?.()}
</span>
