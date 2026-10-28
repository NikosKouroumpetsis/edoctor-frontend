<script lang="ts" module>
	/** The space between the content's groups: `tight` 12 (the criteria) or `loose` 20 (the filters). */
	export type FullscreenModalContentGap = 'tight' | 'loose';

	const contentGapClasses: Record<FullscreenModalContentGap, string> = {
		tight: 'gap-3',
		loose: 'gap-5'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { containerWidthClasses, type ContainerWidth } from '$shared/ui/molecules/container';
	import { ModalHeader } from '$shared/ui/molecules/modal-header';
	import { ModalScreenSurface, type ModalOrigin } from '$shared/ui/templates/modal-screen';

	let {
		open = $bindable(false),
		title,
		closeLabel,
		onClose,
		closeTestId,
		footer,
		contentGap = 'tight',
		contentWidth = 'form',
		contentClass,
		sourceLayout,
		hideContentFromA11y = false,
		overlay,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
		open?: boolean;
		title: string;
		closeLabel: string;
		/** The «×», Escape and (from 744) the backdrop; the modal closes after it. */
		onClose: () => void;
		closeTestId?: string;
		/** The pinned bar under the scroll area (an `ActionBar`). */
		footer?: Snippet;
		contentGap?: FullscreenModalContentGap;
		/** The column's cap from the tablet up (the application's `max-w-form`). */
		contentWidth?: ContainerWidth;
		contentClass?: string;
		/** The tapped control's rect: the modal zooms out of it and back into it (220 ms, whatever the motion setting, U-12.1). */
		sourceLayout?: ModalOrigin;
		/** A panel lies over the column: keep it from assistive tech and the keyboard (`inert`). */
		hideContentFromA11y?: boolean;
		/**
		 * Drawn last inside the surface, over the column (the application's `overlay`); the caller places it
		 * (`absolute inset-0 …`) and pairs it with `hideContentFromA11y`.
		 */
		overlay?: Snippet;
		children: Snippet;
	} = $props();

	const titleId = useId(undefined, 'fullscreen-modal-title');

	function close() {
		onClose();
		open = false;
	}
</script>

<!-- The application's two search modals in one (M-33): the zoom out of the pill or icon, `bg-background`, the
     `ModalHeader`, the padded column and the footer bar. On the web the same surface becomes the Airbnb filter
     dialog from 744 (title centred, «×» right). -->
<ModalScreenSurface
	bind:open
	{sourceLayout}
	tone="background"
	onDismiss={close}
	aria-labelledby={titleId}
	data-slot="fullscreen-modal"
	{...restProps}
>
	<ModalHeader {title} {titleId} {closeLabel} {closeTestId} closeElevated onClose={close} />
	<div
		data-slot="fullscreen-modal-scroll"
		inert={hideContentFromA11y}
		class="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-3.5 pt-1 pb-section tablet:px-6"
	>
		<div
			data-slot="fullscreen-modal-content"
			class={cn(
				'mx-auto flex w-full flex-col',
				contentGapClasses[contentGap],
				containerWidthClasses.tablet[contentWidth],
				contentClass
			)}
		>
			{@render children()}
		</div>
	</div>
	{@render footer?.()}
	{@render overlay?.()}
</ModalScreenSurface>
