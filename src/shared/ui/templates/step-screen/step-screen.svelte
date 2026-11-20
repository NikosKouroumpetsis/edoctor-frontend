<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * Where a step screen stands (P-W4 §3.5): `page` a page of its own (a `<main>` the screen's height, «←» beside its
	 * column from 950), `pane` the right column of a list that splits from 950 (a `<section>` in the page's `<main>`, «←»
	 * in its flow at every width, the change's widths), `solo` the one column in the middle of the wide screen when
	 * nothing stands on its left (U-139.1): the `pane` of 744–949 — 640 with its 40 a side — at every width from 744;
	 * `centred` the right column of a list that splits from 1128 and centres what it opens (`SplitView from="laptop"
	 * centred`, D-W51-46): the `solo` column below 1128, from 1128 the box the split's centre gives it (640, no inset of
	 * its own); `menu` the right column of a MENU of sections, which splits from 950 and centres what a section opens
	 * (`SplitView widths="menu" centred`, D-W52-40): the `solo` column below 950, from 950 the split's own box and the
	 * section's smaller title, as the sections beside the same menu.
	 */
	export type StepScreenPlacement = 'page' | 'pane' | 'solo' | 'centred' | 'menu';

	/** The frame of every step screen (record §3.3, §8.2): «←», the title, the content, «Άκυρο» and the step's action. */
	export type StepScreenProps = {
		title: string;
		subtitle?: string;
		/** The subtitle's id, for a control of the content that it describes (`aria-describedby`). */
		subtitleId?: string;
		/** The `page`'s tab title, already composed by the caller (the other placements leave the page's own). */
		pageTitle?: string;
		/** Where «←» leads; `null` for a page with nothing behind it (a link that opens it alone): no «←» at all. */
		backHref: string | null;
		onBack: (event: MouseEvent) => void;
		/** «Πίσω», already localized. */
		backLabel: string;
		/** «←» by default; «‹» where the caller's pages go back with it. */
		backIcon?: IoniconName;
		saveLabel: string;
		saveDisabled?: boolean;
		saveLoading?: boolean;
		/** «Άκυρο» (or «Να μείνει»); `null` leaves the primary alone at the bar's end (one way on). */
		cancelLabel: string | null;
		/**
		 * The bar of «Άκυρο / action» (by default). `false` for a screen's own states that have nothing to save — its wait, a
		 * failure, a refusal: their one way on is in their words.
		 */
		bar?: boolean;
		/** From 950 the list stands beside the screen: its rows are the way back, so «←» hides there. */
		besideList?: boolean;
		/**
		 * A line that must ALWAYS be in sight, in the bar over «Άκυρο / action» (a limit the content reached, however
		 * long the content is), already localized. `''` keeps its place ready and empty — a reader of the screen hears
		 * the words when they come (`aria-live`); left out, the bar has no such place. While it has words the bar stays
		 * at the bottom of the screen from 744 too (below 744 it always is).
		 */
		barNote?: string;
		/** The screen's end after its bar: below 744 under the content, the bar pinned beneath it; from 744 last. */
		footer?: Snippet;
		onCancel: () => void;
		onSave: () => void;
		placement?: StepScreenPlacement;
		testId?: string;
		backTestId?: string;
		cancelTestId?: string;
		saveTestId?: string;
		barNoteTestId?: string;
		children?: Snippet;
	};

	// The box of each placement. `page`: its own page, white to the bottom however short (W8-Δ1). `pane`
	// (`appt.css:313-333`): one column of 560 inside the change's widths — 640 at 744–949, from 950 the right column's
	// 656 / 688 / 704 with its insets (48, 64 from 1128), 🔴 U-167 (D-W45-56) in the MIDDLE of that column, the same inset
	// on both sides. `solo` (U-139.1, `55-relatives/appt.css:463`): the 640 of 744–949 at every width from it, in the
	// middle of the screen. `centred` (`64-switch/sw.css:197-198`): `solo` below 1128, the split's own box from it.
	const paneColumn =
		'mx-auto w-full px-gutter-sm pt-3 pb-page-bar tablet:max-w-pane-column tablet:px-reading-gap tablet:pt-6 tablet:pb-pane-inset-lg';
	const boxClasses: Record<StepScreenPlacement, string> = {
		page: 'min-h-dvh bg-card px-gutter-sm pt-3 pb-page-bar tablet:min-h-page tablet:px-gutter-lg tablet:pt-section tablet:pb-section-lg',
		pane: `${paneColumn} split:max-w-split-sub split:px-pane-inset split:pt-section laptop:max-w-split-sub-lg laptop:px-pane-inset-lg laptop:pt-reading-gap desktop:max-w-split-sub-xl`,
		solo: paneColumn,
		centred: `${paneColumn} laptop:max-w-none laptop:px-0 laptop:pt-0 laptop:pb-0`,
		menu: `${paneColumn} split:max-w-none split:px-0 split:pt-0 split:pb-0`
	};
	// The column inside: 560 from 744; in the split's centre from 1128 its 640 whole (`.l-detail .w-sub`).
	const columnClasses: Record<StepScreenPlacement, string> = {
		page: 'tablet:max-w-form',
		pane: 'tablet:max-w-form',
		solo: 'tablet:max-w-form',
		centred: 'tablet:max-w-form laptop:max-w-none',
		menu: 'tablet:max-w-form split:max-w-none'
	};
	// «←»: beside the column from 950 on its own page; in the flow at every width in a column.
	const backClasses: Record<StepScreenPlacement, string> = {
		page: 'flex flex-row tablet:mb-4 split:absolute split:top-0 split:right-full split:mr-5 split:mb-0',
		pane: 'flex flex-row tablet:mb-4',
		solo: 'flex flex-row tablet:mb-4',
		centred: 'flex flex-row tablet:mb-4',
		menu: 'flex flex-row tablet:mb-4'
	};
	const paneTitle =
		'mt-3 mb-6 text-heading-lg font-semibold text-foreground tablet:mt-0 tablet:text-heading-xl';
	const titleClasses: Record<StepScreenPlacement, string> = {
		page: `${paneTitle} split:mt-1`,
		pane: paneTitle,
		solo: paneTitle,
		centred: paneTitle,
		// `57-settings/set.css` `.s-h`: from 950 a section's title beside its menu is the smaller 24.
		menu: `${paneTitle} split:text-heading-md`
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { RoundLink } from '$shared/ui/molecules/round-link';
	import { Button } from '$shared/ui/primitives/button';

	let {
		title,
		subtitle,
		subtitleId,
		pageTitle,
		backHref,
		onBack,
		backLabel,
		backIcon = 'arrow-back',
		saveLabel,
		saveDisabled = false,
		saveLoading = false,
		cancelLabel,
		bar = true,
		besideList = false,
		barNote,
		footer,
		onCancel,
		onSave,
		placement = 'page',
		testId,
		backTestId,
		cancelTestId,
		saveTestId,
		barNoteTestId,
		children
	}: StepScreenProps = $props();
</script>

<svelte:head>
	{#if placement === 'page' && pageTitle}
		<title>{pageTitle}</title>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<!-- 🔴 U-102 (record §3.3, §8.2): a change, a cancellation, a refusal is a screen of its own, never a modal — «←» at the
     top left, the title, the content; «Άκυρο» on the left and the action fully round on the right (U-104.2), pinned to
     the bottom below 744 (the application's, U-81.2), in the flow of a centred 560 column from 744. No colour under the
     pointer (D-W3-27). As `page` it is the page (`<main>`, its tab's title); in a list's right column or alone in the
     middle a section of its page, whose title the page keeps. A screen's `footer` comes last, after the bar from 744.
     🔴 D-W52-59α: a `barNote` is a line over the bar's buttons that is always in sight (a limit a long list reached). -->
<svelte:element
	this={placement === 'page' ? 'main' : 'section'}
	data-slot="step-screen"
	data-placement={placement}
	data-testid={testId}
	class={boxClasses[placement]}
>
	<div class={cn('relative mx-auto w-full', columnClasses[placement])}>
		{#if backHref !== null}
			<div class={cn(backClasses[placement], besideList && 'split:hidden')}>
				<RoundLink
					href={backHref}
					label={backLabel}
					icon={backIcon}
					onclick={onBack}
					testId={backTestId}
				/>
			</div>
		{/if}
		<svelte:element this={placement === 'page' ? 'h1' : 'h2'} class={titleClasses[placement]}>
			{title}
		</svelte:element>
		{#if subtitle}
			<p id={subtitleId} class="-mt-3.5 mb-6 text-body-md text-muted-foreground">{subtitle}</p>
		{/if}
		{@render children?.()}
		{#if bar && barNote}
			<!-- Below 744 the bar is pinned and now a line taller: the content ends that much higher, so its last row
			     is never under it. -->
			<div
				aria-hidden="true"
				data-slot="step-screen-note-room"
				class="h-control-lg tablet:hidden"
			></div>
		{/if}
		{#if bar}
			<div
				data-slot="step-screen-bar"
				data-noted={barNote ? '' : undefined}
				class={cn(
					'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card tablet:static tablet:mt-6',
					// The line must stay in sight: from 744 the bar holds the bottom of the screen while it has words.
					barNote && 'tablet:sticky tablet:bottom-0'
				)}
			>
				{#if barNote !== undefined}
					<!-- The place is there before its words, so they are announced when they come; text alone (U-65.6), the
					     muted line of the kit, no colour that flashes (U-100). -->
					<div aria-live="polite" data-slot="step-screen-bar-note" data-testid={barNoteTestId}>
						{#if barNote}
							<p class="px-5 pt-3 text-body-sm text-muted-foreground tablet:px-0 tablet:pt-4">
								{barNote}
							</p>
						{/if}
					</div>
				{/if}
				{#if cancelLabel === null}
					<!-- `appt.css:381` `.a-sbar.one`: the one way on, at the bar's end. -->
					<div
						class="flex flex-row justify-end px-5 pt-3 pb-safe-area-action tablet:px-0 tablet:pt-6 tablet:pb-0"
					>
						<Button
							tone="accent"
							radius="full"
							hover={false}
							label={saveLabel}
							loading={saveLoading}
							disabled={saveDisabled}
							onclick={onSave}
							textClass="text-body-lg"
							data-testid={saveTestId}
						/>
					</div>
				{:else}
					<ActionBar
						preset="plain"
						secondaryLabel={cancelLabel}
						onSecondaryClick={onCancel}
						secondaryTestId={cancelTestId}
						primaryLabel={saveLabel}
						onPrimaryClick={onSave}
						primaryDisabled={saveDisabled}
						primaryLoading={saveLoading}
						primaryShape="pill"
						primaryTestId={saveTestId}
						hover={false}
						class="tablet:px-0 tablet:pt-6 tablet:pb-0"
					/>
				{/if}
			</div>
		{/if}
		{@render footer?.()}
	</div>
</svelte:element>
