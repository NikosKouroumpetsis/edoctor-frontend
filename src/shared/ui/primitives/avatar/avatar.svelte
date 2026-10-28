<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type AvatarStatus = 'loading' | 'loaded' | 'error';
	/** The application's avatar sizes (U-07.1): 32 / 40 / 48 / 64, `md` by default. */
	export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
	export type AvatarContext = {
		status: AvatarStatus;
		size: AvatarSize;
	};
	export const [getAvatarContext, setAvatarContext] = createContext<AvatarContext>('Avatar');

	/** Root box size; <Avatar.Fallback> scales its initials to match. */
	export const avatarSizes: Record<AvatarSize, string> = {
		sm: 'size-avatar-sm',
		md: 'size-avatar-md',
		lg: 'size-avatar-lg',
		xl: 'size-avatar-xl'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		size = 'md',
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
