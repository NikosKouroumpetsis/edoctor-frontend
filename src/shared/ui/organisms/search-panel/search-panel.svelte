<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * Whether the panel covers the screen: CSS chose its shape (`fixed` below 744, `absolute` under the bar from 744)
	 * and it is shown (no rect inside a hidden parent). Read from the element, so no zone is read in JS (U-03.1).
	 */
	export function coversScreen(node: HTMLElement): boolean {
		return getComputedStyle(node).position === 'fixed' && node.getClientRects().length > 0;
	}

	export type SearchPanelProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
		open?: boolean;
		/** The panel's name; on the phone also its header's title (the application's search modal). */
		title: string;
		/** The «×» name of the phone's header, already localized. */
		closeLabel: string;
		/** Every close: the «×», Escape, a press outside (from 744). */
		onClose?: () => void;
		/** Presses on it do not close the panel (the bar whose segments open it). */
		anchor?: HTMLElement | null;
		/** The phone's pinned bar (an `ActionBar`); the dropdown has none (Airbnb's). */
		footer?: Snippet;
		testId?: string;
		/** Places and sizes the dropdown from 744 (`tablet:w-popover-lg`, `tablet:right-0 tablet:left-auto`). */
		class?: string;
		children: Snippet;
	};
</script>

<script lang="ts">
	import { dismissable, focusTrap, Presence, scrollLock, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { ModalHeader } from '$shared/ui/molecules/modal-header';

	let {
		open = $bindable(false),
		title,
		closeLabel,
		onClose,
		anchor,
		footer,
		testId,
		class: className,
		children,
		...restProps
	}: SearchPanelProps = $props();

	const titleId = useId(undefined, 'search-panel-title');
	let node = $state<HTMLElement | null>(null);
	let covering = $state(false);
	// Drawn at all: an open panel inside the bar hidden below 744 (a resize, a rotation) takes no Escape and no
	// press of the page (review R1 of dyad 4, NIT-2).
	let shown = $state(false);
	// In the DOM until its CSS fade out ends (U-12.2), 250 ms on Airbnb's curve as it fades in.
	const presence = new Presence(() => open, { duration: 'standard' });

	function close() {
		if (!open) return;
		open = false;
		onClose?.();
	}

	// The shape is read once it is drawn and again when its box changes (a resize across 744).
	$effect(() => {
		if (!node) return;
		const panel = node;
		const measure = () => {
			shown = panel.getClientRects().length > 0;
			covering = coversScreen(panel);
		};
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(panel);
		return () => observer?.disconnect();
	});
</script>

<!-- One panel, two shapes by CSS (U-05.4, Airbnb): below 744 the whole screen with the search modal's header and
     the pinned footer — modal, so it holds the focus (on the panel, not on its «×», U-09.7) and the page's scroll;
     from 744 the dropdown card under the bar (`relative` parent), not modal: the focus stays on the bar. Escape and
     a press outside close both. The header's title names the panel in both shapes (a hidden label still names it).
     It fades in and out in CSS (U-12.2); its trap and keys let go as the fade out starts, the scroll lock when it
     leaves the DOM. -->
{#if presence.present}
	<div
		bind:this={node}
		use:presence.track
		role="dialog"
		aria-modal={covering || undefined}
		aria-labelledby={titleId}
		tabindex={-1}
		data-slot="search-panel"
		data-shape={covering ? 'screen' : 'dropdown'}
		data-state={presence.state}
		data-testid={testId}
		inert={presence.closing}
		use:dismissable={{ enabled: shown && presence.open, onDismiss: close, ignore: [anchor] }}
		use:focusTrap={{ enabled: covering && presence.open }}
		use:scrollLock={covering}
		class={cn(
			'fixed inset-0 z-50 flex flex-col bg-background outline-none',
			'transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 starting:opacity-0',
			'tablet:absolute tablet:inset-auto tablet:top-full tablet:left-0 tablet:mt-3 tablet:max-h-sheet-md tablet:w-full tablet:overflow-hidden tablet:rounded-xl tablet:bg-card tablet:shadow-overlay',
			className
		)}
		{...restProps}
	>
		<div data-slot="search-panel-header" class="tablet:hidden">
			<ModalHeader {title} {titleId} {closeLabel} closeElevated onClose={close} />
		</div>
		<div
			data-slot="search-panel-scroll"
			class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pt-1 pb-section tablet:px-2 tablet:pt-4 tablet:pb-6"
		>
			{@render children()}
		</div>
		{#if footer}
			<div data-slot="search-panel-footer" class="tablet:hidden">{@render footer()}</div>
		{/if}
	</div>
{/if}
