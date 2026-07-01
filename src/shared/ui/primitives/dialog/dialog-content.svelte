<script lang="ts" module>
	export type DialogSize = 'sm' | 'default' | 'lg';

	/** Panel max-width. */
	const dialogSizes: Record<DialogSize, string> = {
		sm: 'max-w-md',
		default: 'max-w-lg',
		lg: 'max-w-2xl'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import XIcon from '~icons/lucide/x';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, focusTrap, dismissable, scrollLock } from '$shared/lib/headless';
	import { getDialogContext } from './dialog.svelte';

	let {
		ref = $bindable(null),
		class: className,
		size = 'default',
		showClose = true,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: DialogSize;
		showClose?: boolean;
		children?: Snippet;
	} = $props();

	const ctx = getDialogContext();
</script>

{#if ctx.open}
	<div
		use:portal
		data-slot="dialog-overlay"
		transition:fade={{ duration: 150 }}
		class="fixed inset-0 z-50 bg-black/50"
	></div>
	<!-- `use:portal` is declared before `use:focusTrap` so the node is relocated to
	     <body> before focus moves in (relocating a focused node would blur it). -->
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		aria-modal={ctx.modal}
		id={ctx.contentId}
		aria-labelledby={ctx.titleId}
		aria-describedby={ctx.descriptionId}
		data-slot="dialog-content"
		data-state="open"
		use:focusTrap={{ enabled: true }}
		use:dismissable={{ onDismiss: () => ctx.setOpen(false) }}
		use:scrollLock={ctx.modal}
		transition:scale={{ start: 0.95, duration: 150 }}
		class={cn(
			'fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-panel border border-border bg-card p-card shadow-soft',
			dialogSizes[size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showClose}
			<button
				type="button"
				aria-label="Close"
				data-slot="dialog-close"
				onclick={() => ctx.setOpen(false)}
				class="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<XIcon class="size-4" />
			</button>
		{/if}
	</div>
{/if}
