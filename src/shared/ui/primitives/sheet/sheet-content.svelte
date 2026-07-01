<script lang="ts" module>
	export type SheetSide = 'top' | 'bottom' | 'left' | 'right';
	export type SheetSize = 'sm' | 'default' | 'lg';

	// Cross-axis extent depends on the side: max-width for left/right, height for
	// top/bottom. `default` reproduces the previous fixed extent (`max-w-sm` /
	// `h-auto`); sm/lg pin a smaller/larger panel.
	const sheetSizeBySide: Record<SheetSide, Record<SheetSize, string>> = {
		right: { sm: 'max-w-xs', default: 'max-w-sm', lg: 'max-w-md' },
		left: { sm: 'max-w-xs', default: 'max-w-sm', lg: 'max-w-md' },
		top: { sm: 'h-1/4', default: 'h-auto', lg: 'h-1/2' },
		bottom: { sm: 'h-1/4', default: 'h-auto', lg: 'h-1/2' }
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import XIcon from '~icons/lucide/x';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, focusTrap, dismissable, scrollLock } from '$shared/lib/headless';
	import { getDialogContext } from '$shared/ui/primitives/dialog/dialog.svelte';

	let {
		ref = $bindable(null),
		class: className,
		side = 'right',
		size = 'default',
		showClose = true,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		side?: SheetSide;
		size?: SheetSize;
		showClose?: boolean;
		children?: Snippet;
	} = $props();

	const ctx = getDialogContext();

	const sideClasses: Record<SheetSide, string> = {
		right: 'inset-y-0 right-0 h-full w-3/4 border-l',
		left: 'inset-y-0 left-0 h-full w-3/4 border-r',
		top: 'inset-x-0 top-0 border-b',
		bottom: 'inset-x-0 bottom-0 border-t'
	};

	const flyParams = $derived(
		{
			right: { x: 320, duration: 200 },
			left: { x: -320, duration: 200 },
			top: { y: -320, duration: 200 },
			bottom: { y: 320, duration: 200 }
		}[side]
	);
</script>

{#if ctx.open}
	<div
		use:portal
		data-slot="sheet-overlay"
		transition:fade={{ duration: 150 }}
		class="fixed inset-0 z-50 bg-black/50"
	></div>
	<!-- `use:portal` before `use:focusTrap`: relocate to <body> before focusing in. -->
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		aria-modal={ctx.modal}
		id={ctx.contentId}
		aria-labelledby={ctx.titleId}
		aria-describedby={ctx.descriptionId}
		data-slot="sheet-content"
		data-state="open"
		data-side={side}
		use:focusTrap={{ enabled: true }}
		use:dismissable={{ onDismiss: () => ctx.setOpen(false) }}
		use:scrollLock={ctx.modal}
		transition:fly={flyParams}
		class={cn(
			'fixed z-50 flex flex-col gap-4 bg-card p-card shadow-soft',
			sideClasses[side],
			sheetSizeBySide[side][size],
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showClose}
			<button
				type="button"
				aria-label="Close"
				data-slot="sheet-close"
				onclick={() => ctx.setOpen(false)}
				class="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<XIcon class="size-4" />
			</button>
		{/if}
	</div>
{/if}
