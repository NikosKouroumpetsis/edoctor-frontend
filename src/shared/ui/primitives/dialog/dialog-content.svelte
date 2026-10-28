<script lang="ts" module>
	export type DialogSize = 'sm' | 'md' | 'lg';

	/** Panel max-width; without a size the application's dialog (`max-w-text`, 480). */
	const dialogSizes: Record<DialogSize, string> = {
		sm: 'max-w-text',
		md: 'max-w-form',
		lg: 'max-w-content'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { portal, focusTrap, escapeKeydown, Presence, scrollLock } from '$shared/lib/headless';
	import { getDialogContext } from './dialog.svelte';

	/** The close «×» needs a name in the page's language: required while it is shown. */
	type CloseProps =
		| { showClose?: true; closeLabel: string }
		| { showClose: false; closeLabel?: string };

	let {
		ref = $bindable(null),
		class: className,
		size = 'sm',
		showClose = true,
		closeLabel,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: DialogSize;
		children?: Snippet;
	} & CloseProps = $props();

	const ctx = getDialogContext();
	// In the DOM until its CSS leave ends (U-12.2): the backdrop fades and the panel shrinks to 95 % as it fades.
	const presence = new Presence(() => ctx.open, { duration: 'standard' });
</script>

{#if presence.present}
	<div
		use:portal
		use:presence.track
		data-slot="dialog-overlay"
		data-state={presence.state}
		aria-hidden="true"
		inert={presence.closing}
		class="fixed inset-0 z-50 bg-overlay transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 starting:opacity-0"
		onclick={() => ctx.setOpen(false)}
	></div>
	<!-- `use:portal` is declared before `use:focusTrap` so the node is relocated to
	     <body> before focus moves in (relocating a focused node would blur it). The panel keeps 24 to the
	     screen's edges (`inset-x-6`, the application's backdrop `p-6`) and centres within its cap. It closes on
	     its backdrop or an Escape inside it, never on a press in a portalled Select or Popover of its content.
	     It opens with the focus on itself, not on the «×» (U-09.7): no ring on open; Tab reaches the «×» first.
	     It enters from 95 % and transparent (`starting:`, after the move to <body>: a moved node is styled anew)
	     and leaves the same way (`data-[state=closed]:`), 250 ms on Airbnb's curve; the trap and
	     Escape let go as the leave starts, which gives the focus back to the trigger; the scroll lock goes with
	     the node, at the leave's end (no page shift under a backdrop still fading, on bars that take room). -->
	<div
		bind:this={ref}
		use:portal
		role="dialog"
		tabindex={-1}
		aria-modal={ctx.modal}
		id={ctx.contentId}
		aria-labelledby={ctx.titleId}
		aria-describedby={ctx.descriptionId}
		data-slot="dialog-content"
		data-state={presence.state}
		inert={presence.closing}
		use:presence.track
		use:focusTrap={{ enabled: presence.open }}
		use:escapeKeydown={{ enabled: presence.open, onEscape: () => ctx.setOpen(false) }}
		use:scrollLock={ctx.modal}
		class={cn(
			'fixed inset-x-6 top-1/2 z-50 mx-auto grid -translate-y-1/2 gap-4 rounded-xl border border-border bg-card p-card shadow-soft outline-none',
			'transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0',
			dialogSizes[size],
			className
		)}
		{...restProps}
	>
		{#if showClose}
			<button
				type="button"
				aria-label={closeLabel}
				data-slot="dialog-close"
				onclick={() => ctx.setOpen(false)}
				class="absolute top-0 right-0 grid size-touch place-items-center rounded-full opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Ionicon name="close" class="icon-sm" />
			</button>
		{/if}
		{@render children?.()}
	</div>
{/if}
