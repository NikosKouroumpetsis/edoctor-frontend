<script lang="ts" module>
	import type { ContainerWidth } from '$shared/ui/molecules/container';

	/** `display` the default title scale; `compact` for a title that is a whole sentence. */
	export type ModalScreenTitleSize = 'display' | 'compact';
	/** Where the content sits: `top` (default) or `center`, one balanced group in the middle (the sign-in). */
	export type ModalScreenContentAlignment = 'top' | 'center';

	const titleClasses: Record<ModalScreenTitleSize, string> = {
		compact: 'text-heading-md font-semibold text-foreground',
		display: 'text-display-sm font-semibold text-foreground'
	};

	const alignmentClasses: Record<ModalScreenContentAlignment, string> = {
		center: 'flex-1 justify-center',
		top: ''
	};

	export type ModalScreenBackProps =
		| { onBack: () => void; backLabel: string; backTestId?: string }
		| { onBack?: undefined; backLabel?: undefined; backTestId?: undefined };

	export type ModalScreenCloseProps =
		| { onClose: () => void; closeLabel: string; closeTestId?: string }
		| { onClose?: undefined; closeLabel?: undefined; closeTestId?: undefined };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { containerWidthClasses } from '$shared/ui/molecules/container';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import ModalScreenSurface, { type ModalOrigin } from './modal-screen-surface.svelte';

	let {
		open = $bindable(false),
		title,
		titleSize = 'display',
		isTitleLoading = false,
		contentAlignment = 'top',
		maxWidth = 'content',
		contentClass,
		footer,
		onBack,
		backLabel,
		backTestId,
		onClose,
		closeLabel,
		closeTestId,
		scrollToOffset,
		sourceLayout,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
		open?: boolean;
		title?: string;
		titleSize?: ModalScreenTitleSize;
		/** A skeleton bar in the title's place while the title loads. */
		isTitleLoading?: boolean;
		contentAlignment?: ModalScreenContentAlignment;
		/** The content column's cap (`containers`), the application's `maxWidth`. */
		maxWidth?: ContainerWidth;
		contentClass?: string;
		/** Pinned below the scroll area, outside it; it owns its padding (an `ActionBar`). */
		footer?: Snippet;
		/** The content offset (px) to scroll to whenever it changes to a number. */
		scrollToOffset?: number;
		/** Where the modal zooms from (a web addition: the route modal of the application slides up). */
		sourceLayout?: ModalOrigin;
		children: Snippet;
	} & ModalScreenBackProps &
		ModalScreenCloseProps = $props();

	const titleId = useId(undefined, 'modal-screen-title');
	const hasTitleBand = $derived(isTitleLoading || Boolean(title));
	let scroller = $state<HTMLElement | null>(null);

	function close() {
		onClose?.();
		open = false;
	}

	$effect(() => {
		if (scrollToOffset === undefined || !scroller) return;
		scroller.scrollTo?.({ top: scrollToOffset });
	});
</script>

<!-- The application's `ModalScreenTemplate`: «←» / «×» in 32 circles, the title band, the scroll column, the
     pinned footer. A route modal there; here the full screen below 744 and the Airbnb dialog from 744. -->
<ModalScreenSurface
	bind:open
	{sourceLayout}
	tone="card"
	onDismiss={onClose ? close : undefined}
	aria-labelledby={title && !isTitleLoading ? titleId : undefined}
	aria-busy={isTitleLoading || undefined}
	data-slot="modal-screen"
	{...restProps}
>
	<div data-slot="modal-screen-header" class="flex flex-row items-center justify-between px-4 py-2">
		{#if onBack}
			<IconButton
				icon="arrow-back"
				appearance="tint"
				surface="soft"
				size="xs"
				iconSize="md"
				aria-label={backLabel ?? ''}
				data-testid={backTestId}
				onclick={onBack}
			/>
		{:else}
			<span class="size-touch" aria-hidden="true"></span>
		{/if}
		{#if onClose}
			<IconButton
				icon="close"
				appearance="tint"
				surface="soft"
				size="xs"
				iconSize="md"
				aria-label={closeLabel ?? ''}
				data-testid={closeTestId}
				onclick={close}
			/>
		{:else}
			<span class="size-touch" aria-hidden="true"></span>
		{/if}
	</div>

	<div
		bind:this={scroller}
		data-slot="modal-screen-scroll"
		class={cn(
			'min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-gutter-sm pt-1 pb-6 tablet:pt-2 tablet:pb-section',
			contentAlignment === 'center' && 'flex flex-col'
		)}
	>
		<div
			data-slot="modal-screen-content"
			class={cn(
				'mx-auto flex w-full flex-col gap-section',
				containerWidthClasses.phone[maxWidth],
				alignmentClasses[contentAlignment],
				contentClass
			)}
		>
			{#if hasTitleBand}
				<div
					data-slot="modal-screen-title-band"
					class="flex min-h-touch flex-row items-start justify-between gap-4"
				>
					<div class="flex min-h-touch flex-1 flex-col justify-center">
						{#if isTitleLoading}
							<Skeleton class="h-control-sm w-2/3 rounded-full" />
						{:else}
							<h2 id={titleId} data-slot="modal-screen-title" class={titleClasses[titleSize]}>
								{title}
							</h2>
						{/if}
					</div>
				</div>
			{/if}
			{@render children()}
		</div>
	</div>

	{#if footer}
		<div data-slot="modal-screen-footer" class="border-t border-border/60 bg-card">
			<div class={cn('mx-auto w-full', containerWidthClasses.phone[maxWidth])}>
				{@render footer()}
			</div>
		</div>
	{/if}
</ModalScreenSurface>
