<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SheetDrag, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';

	let {
		open = $bindable(false),
		title,
		wrapTitle = false,
		closeLabel,
		onDismiss,
		footer,
		children,
		testId
	}: {
		open?: boolean;
		/** The small title in the middle of its bar. */
		title: string;
		/** A title with a person's name in it: on as many lines as it takes, never cut. */
		wrapTitle?: boolean;
		closeLabel: string;
		/** Instead of closing: the caller decides (a draft that asks first). */
		onDismiss?: () => void;
		/** What stays under the scroll, a line above it. */
		footer?: Snippet;
		children: Snippet;
		testId?: string;
	} = $props();

	const titleId = useId(undefined, 'action-dialog-title');
	const close = () => {
		if (onDismiss) onDismiss();
		else open = false;
	};
	const drag = new SheetDrag(close);
	const { onpointerdown, onpointermove, onpointerup, onpointercancel } = drag;
</script>

<!-- U-84 Π1 (Airbnb's settings sheet, IMG_2610): a small title, its rows or its words, its buttons. One element, two shapes
     by CSS: from 744 the 480 window with the 32 corner, below 744 the application's sheet as tall as its content, with its
     handle, dragged down to close. It may lie over another window, which stays locked and keeps its place. -->
<ModalScreenSurface
	bind:open
	shape="sheet"
	tone="card"
	onDismiss={close}
	aria-labelledby={titleId}
	data-slot="action-dialog"
	data-testid={testId}
	data-dragging={drag.dragged !== null || undefined}
	style={drag.dragged ? `transform: translateY(${drag.dragged}px)` : undefined}
	class={cn(
		'max-tablet:top-auto max-tablet:h-fit max-tablet:max-h-sheet-xl tablet:max-w-text',
		drag.dragged !== null && 'transition-none'
	)}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		data-slot="action-dialog-bar"
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		{onpointercancel}
		class={cn(
			'relative flex shrink-0 touch-none items-center justify-center px-control-xl tablet:touch-auto',
			wrapTitle
				? 'min-h-control-lg max-tablet:pt-4 max-tablet:pb-1 tablet:min-h-bar-top'
				: 'h-control-lg tablet:h-bar-top'
		)}
	>
		<span
			bind:this={drag.handle}
			aria-hidden="true"
			data-slot="action-dialog-handle"
			class="absolute top-2 left-1/2 h-1 w-drawer-handle -translate-x-1/2 rounded-xs bg-muted-foreground/45 tablet:hidden"
		></span>
		<h2
			id={titleId}
			class={cn(
				'text-center font-semibold text-foreground',
				wrapTitle ? 'text-bubble wrap-anywhere' : 'truncate text-body-lg max-tablet:pt-2'
			)}
		>
			{title}
		</h2>
		<IconButton
			icon="close"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={closeLabel}
			data-testid={testId ? `${testId}-close` : undefined}
			onclick={close}
			class="absolute top-2 right-4 tablet:top-3"
		/>
	</div>
	<div
		class={cn(
			'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pt-1',
			footer ? 'pb-6' : 'pb-safe-area-action tablet:pb-6'
		)}
	>
		{@render children()}
	</div>
	{#if footer}
		<div
			data-slot="action-dialog-footer"
			class="flex shrink-0 flex-row gap-3 border-t border-border/60 px-gutter-sm pt-3 pb-safe-area-3 tablet:pt-4 tablet:pb-6"
		>
			{@render footer()}
		</div>
	{/if}
</ModalScreenSurface>
