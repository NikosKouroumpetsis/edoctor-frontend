<script lang="ts" module>
	import { motion, spacing } from '$shared/design/tokens';

	/** The on-screen rectangle a modal grows out of and collapses back into (the tapped control's rect). */
	export type ModalOrigin = { x: number; y: number; width: number; height: number };
	/** The surface colour: `card` the route modals', `background` the full-screen search modals'. */
	export type ModalSurfaceTone = 'card' | 'background';

	/** The application's origin zoom (`MODAL_ANIMATION_DURATION`), the `zoom` motion token. */
	export const MODAL_ZOOM_DURATION = motion.duration.zoom;

	/** Where the zoom starts and ends: the move and scale that lay the surface over the control, its corner. */
	export type ModalZoomEnd = { transform: string; radius: string };

	const toneClasses: Record<ModalSurfaceTone, string> = {
		card: 'bg-card',
		background: 'bg-background'
	};

	/** A CSS function call, `name(a,b)`. */
	const cssFunction = (name: string, ...args: string[]) => `${name}(${args.join(',')})`;

	/**
	 * The application's zoom (`use-modal-animation`) as the CSS end it runs to and from (U-12.2): the move and the
	 * scale that put the surface — measured where CSS drew it (a full screen below 744, the centred dialog from 744),
	 * so no zone is read in JS — over `origin`, and the control's corner. `null` without an origin or a box: the
	 * surface then fades, on the same 220 ms and curves.
	 */
	export function zoomEnd(
		box: { left: number; top: number; width: number; height: number },
		origin: ModalOrigin | undefined
	): ModalZoomEnd | null {
		if (!origin || box.width === 0 || box.height === 0) return null;
		const shiftX = origin.x + origin.width / 2 - (box.left + box.width / 2);
		const shiftY = origin.y + origin.height / 2 - (box.top + box.height / 2);
		const scaleX = Math.max(origin.width / box.width, 0.1);
		const scaleY = Math.max(origin.height / box.height, 0.05);
		const fromRadius = Math.min(origin.height / 2, spacing.section);
		return {
			transform: [
				cssFunction('translate', `${shiftX}px`, `${shiftY}px`),
				cssFunction('scale', String(scaleX), String(scaleY))
			].join(' '),
			radius: `${fromRadius}px`
		};
	}

	/** Writes the zoom's end on the surface (the `modal-zoom-from` utility reads it); false when there is none. */
	function writeZoomEnd(node: HTMLElement, origin: ModalOrigin | undefined): boolean {
		const end = zoomEnd(node.getBoundingClientRect(), origin);
		if (!end) {
			node.style.removeProperty('--modal-zoom-from');
			node.style.removeProperty('--modal-zoom-radius');
			return false;
		}
		node.style.setProperty('--modal-zoom-from', end.transform);
		node.style.setProperty('--modal-zoom-radius', end.radius);
		return true;
	}

	/**
	 * The way in from `origin`: a node is measured only once it is laid out, and `@starting-style` reads only a
	 * node's first style, so the end is written after the measure and the node is put back in its place in <body>
	 * (styled anew there), before the focus moves in. `starting:modal-zoom-from` then opens it from the control.
	 */
	function zoomFrom(node: HTMLElement, origin: ModalOrigin | undefined) {
		if (writeZoomEnd(node, origin)) node.parentNode?.insertBefore(node, node.nextSibling);
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		escapeKeydown,
		focusTrap,
		isMoving,
		portal,
		Presence,
		scrollLock
	} from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		open = $bindable(false),
		onDismiss,
		sourceLayout,
		tone = 'card',
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		open?: boolean;
		/**
		 * An Escape inside the surface, or a press on its backdrop (from 744, where it shows); none ⇒ only its own
		 * controls. A Select or Popover of the content (portalled) never closes it.
		 */
		onDismiss?: () => void;
		/** Where the modal zooms from; without it, it fades. */
		sourceLayout?: ModalOrigin;
		tone?: ModalSurfaceTone;
		children: Snippet;
	} = $props();

	// In the DOM until its CSS leave ends (U-12.2): the zoom back into the control (or the fade), 220 ms.
	const presence = new Presence(() => open, { duration: 'zoom' });
	let surface = $state<HTMLElement | null>(null);

	// The way out ends where the control is now: measured before the surface takes `data-state="closed"`.
	// Only at rest: while the opening zoom still runs, the box it reports carries that zoom, and the end written
	// when it opened (measured before any transform) is the control's still (review r1, MINOR-1).
	$effect.pre(() => {
		if (!presence.open && surface && presence.present && !isMoving(surface))
			writeZoomEnd(surface, sourceLayout);
	});
</script>

{#if presence.present}
	<div
		use:portal
		use:presence.track
		data-slot="modal-screen-overlay"
		data-state={presence.state}
		aria-hidden="true"
		inert={presence.closing}
		class="fixed inset-0 z-50 hidden bg-overlay transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 tablet:block starting:opacity-0"
		onclick={() => onDismiss?.()}
	></div>
	<!-- One element, two shapes by CSS (SSR-safe): the whole screen below 744, from 744 the centred dialog of the
	     Airbnb filters (`h-fit` + auto margins centre it without a transform, so the zoom owns `transform`).
	     `use:portal` comes before `use:focusTrap`: the node moves to <body> before focus moves in, and lands on the
	     surface itself, not on its «×» (U-09.7). The zoom is CSS (U-12.2): it opens from the control on the
	     application's `out(cubic)` and closes into it on `in(cubic)`, 220 ms; without a control it fades. -->
	<div
		bind:this={surface}
		use:portal
		use:zoomFrom={sourceLayout}
		use:presence.track
		role="dialog"
		tabindex={-1}
		aria-modal="true"
		data-slot="modal-screen-surface"
		data-state={presence.state}
		data-tone={tone}
		inert={presence.closing}
		use:focusTrap={{ enabled: presence.open }}
		use:escapeKeydown={{
			enabled: Boolean(onDismiss) && presence.open,
			onEscape: () => onDismiss?.()
		}}
		use:scrollLock={true}
		class={cn(
			'fixed inset-0 z-50 m-0 flex flex-col overflow-hidden outline-none',
			'tablet:m-auto tablet:h-fit tablet:max-h-sheet-xl tablet:w-full tablet:max-w-dialog tablet:rounded-xl tablet:shadow-soft',
			'transition-[transform,border-radius,opacity] duration-zoom ease-zoom-in data-[state=closed]:pointer-events-none data-[state=closed]:ease-zoom-out',
			sourceLayout
				? 'data-[state=closed]:modal-zoom-from starting:modal-zoom-from'
				: 'data-[state=closed]:opacity-0 starting:opacity-0',
			toneClasses[tone],
			className
		)}
		{...restProps}
	>
		<!-- The application's `panelStyle`: it rises 18 into place and shows only past a third of the zoom
		     (`ease-modal-panel-in | out`: the rise on the zoom's curve, the fade on `linear()` points of it). -->
		<div
			use:presence.track
			data-slot="modal-screen-panel"
			data-state={presence.state}
			class="flex min-h-0 flex-1 flex-col transition-[translate,opacity] duration-zoom ease-modal-panel-in data-[state=closed]:translate-y-4.5 data-[state=closed]:opacity-0 data-[state=closed]:ease-modal-panel-out starting:translate-y-4.5 starting:opacity-0"
		>
			{@render children()}
		</div>
	</div>
{/if}
