<script lang="ts" module>
	export type SheetSide = 'top' | 'bottom' | 'left' | 'right';
	export type SheetSize = 'sm' | 'md' | 'lg';

	// Cross-axis extent depends on the side: a named max-width for left/right, a
	// height for top/bottom; sm/lg pin a smaller/larger panel than `md`.
	const sheetSizeBySide: Record<SheetSide, Record<SheetSize, string>> = {
		right: { sm: 'max-w-narrow', md: 'max-w-text', lg: 'max-w-form' },
		left: { sm: 'max-w-narrow', md: 'max-w-text', lg: 'max-w-form' },
		top: { sm: 'h-1/4', md: 'h-auto', lg: 'h-1/2' },
		bottom: { sm: 'h-1/4', md: 'h-auto', lg: 'h-1/2' }
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { portal, focusTrap, escapeKeydown, Presence, scrollLock } from '$shared/lib/headless';
	import { getDialogContext } from '$shared/ui/primitives/dialog/dialog.svelte';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	/** The close «×» needs a name in the page's language: required while it is shown. */
	type CloseProps =
		| { showClose?: true; closeLabel: string }
		| { showClose: false; closeLabel?: string };

	let {
		ref = $bindable(null),
		class: className,
		side = 'right',
		size,
		showClose = true,
		closeLabel,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		side?: SheetSide;
		size?: SheetSize;
		children?: Snippet;
	} & CloseProps = $props();

	const ctx = getDialogContext();

	// Without a size, the application's sheet: 360 at the sides (`max-w-narrow`), the content's height at the top/bottom.
	const resolvedSize = $derived<SheetSize>(
		size ?? (side === 'left' || side === 'right' ? 'sm' : 'md')
	);

	const sideClasses: Record<SheetSide, string> = {
		right: 'inset-y-0 right-0 h-full w-3/4 border-l',
		left: 'inset-y-0 left-0 h-full w-3/4 border-r',
		top: 'inset-x-0 top-0 border-b',
		bottom: 'inset-x-0 bottom-0 border-t'
	};

	// Its whole size beyond its edge, the way in (`starting:`) and the way out (`data-[state=closed]:`), U-12.2.
	const slideClasses: Record<SheetSide, string> = {
		right: 'starting:translate-x-full data-[state=closed]:translate-x-full',
		left: 'starting:-translate-x-full data-[state=closed]:-translate-x-full',
		top: 'starting:-translate-y-full data-[state=closed]:-translate-y-full',
		bottom: 'starting:translate-y-full data-[state=closed]:translate-y-full'
	};

	// In the DOM until its CSS leave ends: the panel slides back to its edge while the backdrop fades.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });
</script>

{#if presence.present}
	<div
		use:portal
		use:presence.track
		data-slot="sheet-overlay"
		data-state={presence.state}
		aria-hidden="true"
		inert={presence.closing}
		class="fixed inset-0 z-50 bg-overlay transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 starting:opacity-0"
		onclick={() => ctx.setOpen(false)}
	></div>
	<!-- `use:portal` before `use:focusTrap`: relocate to <body> before focusing in. It slides in from its edge and out
	     to it (U-09.8, the side menu of `SiteNavbar` from the right) while the backdrop fades, 250 ms on Airbnb's
	     curve, in CSS (U-12.2: `starting:` after the move to <body>, `data-[state=closed]:` on the way out); the
	     focus lands on the panel, not on the «×» (U-09.7), which is first in the Tab order, and goes back to the
	     trigger as the leave starts. -->
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		tabindex={-1}
		aria-modal={ctx.modal}
		id={ctx.contentId}
		aria-labelledby={ctx.titleId}
		aria-describedby={ctx.descriptionId}
		data-slot="sheet-content"
		data-state={presence.state}
		data-side={side}
		inert={presence.closing}
		use:presence.track
		use:focusTrap={{ enabled: presence.open }}
		use:escapeKeydown={{ enabled: presence.open, onEscape: () => ctx.setOpen(false) }}
		use:scrollLock={ctx.modal}
		class={cn(
			'fixed z-50 flex flex-col gap-4 bg-card p-card shadow-soft outline-none',
			'transition-[translate] duration-standard ease-standard data-[state=closed]:pointer-events-none',
			slideClasses[side],
			sideClasses[side],
			sheetSizeBySide[side][resolvedSize],
			className
		)}
		{...restProps}
	>
		{#if showClose}
			<button
				type="button"
				aria-label={closeLabel}
				data-slot="sheet-close"
				onclick={() => ctx.setOpen(false)}
				class="absolute top-0 right-0 grid size-touch place-items-center rounded-full opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Ionicon name="close" class="icon-sm" />
			</button>
		{/if}
		{@render children?.()}
	</div>
{/if}
