<script lang="ts" module>
	import type { ChangeFramePlacement } from '../types';

	// The box of each placement. `page`: the booking's own page (record §3.3), white to the bottom however short (W8-Δ1).
	// `pane` (`appt.css:313-333`): one column of 560 inside the change's widths — 640 at 744–949, from 950 the right
	// column's 656 / 688 / 704 with its insets (48, 64 from 1128, 80 on the left from 1440). `solo` (U-139.1,
	// `55-relatives/appt.css:463`): the 640 of 744–949 at every width from it, in the middle of the screen.
	const paneColumn =
		'mx-auto w-full px-gutter-sm pt-3 pb-page-bar tablet:max-w-pane-column tablet:px-reading-gap tablet:pt-6 tablet:pb-pane-inset-lg';
	const boxClasses: Record<ChangeFramePlacement, string> = {
		page: 'min-h-dvh bg-card px-gutter-sm pt-3 pb-page-bar tablet:min-h-page tablet:px-gutter-lg tablet:pt-section tablet:pb-section-lg',
		pane: `${paneColumn} split:mx-0 split:max-w-split-sub split:px-pane-inset split:pt-section laptop:max-w-split-sub-lg laptop:px-pane-inset-lg laptop:pt-reading-gap desktop:max-w-split-sub-xl desktop:pl-pane-inset-xl`,
		solo: paneColumn
	};
	// «←»: beside the column from 950 on the booking's page; in the flow at every width in the right column.
	const backClasses: Record<ChangeFramePlacement, string> = {
		page: 'flex flex-row tablet:mb-4 split:absolute split:top-0 split:right-full split:mr-5 split:mb-0',
		pane: 'flex flex-row tablet:mb-4',
		solo: 'flex flex-row tablet:mb-4'
	};
	const paneTitle =
		'mt-3 mb-6 text-heading-lg font-semibold text-foreground tablet:mt-0 tablet:text-heading-xl';
	const titleClasses: Record<ChangeFramePlacement, string> = {
		page: `${paneTitle} split:mt-1`,
		pane: paneTitle,
		solo: paneTitle
	};
</script>

<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { Button } from '$shared/ui/primitives/button';
	import RoundLink from './round-link.svelte';
	import type { ChangeFrameProps } from '../types';

	let {
		title,
		subtitle,
		backHref,
		onBack,
		saveLabel,
		saveDisabled = false,
		saveLoading = false,
		cancelLabel,
		bar = true,
		besideList = false,
		footer,
		onCancel,
		onSave,
		locale,
		placement = 'page',
		testId,
		children
	}: ChangeFrameProps = $props();

	const options = $derived({ locale });
	const primary = $derived(saveLabel ?? m.booking_change_save({}, options));
</script>

<svelte:head>
	{#if placement === 'page'}
		<title>{m.booking_meta_title({ title }, options)}</title>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<!-- 🔴 U-102 (record §3.3, §8.2): a «Αλλαγή» is a screen of its own, never a modal — «←» at the top left, the title, the
     content; «Άκυρο» on the left and «Αποθήκευση» fully round on the right (U-104.2), pinned to the bottom below 744 (the
     application's, U-81.2), in the flow of a centred 560 column from 744. No colour under the pointer (D-W3-27). On the
     booking's page it is the page (`<main>`, its tab's title); in an appointment's right column (`pane`, U-136.2) or
     alone in the middle (`solo`, U-139.1) a section of its page, whose title the page keeps. A screen's `footer` comes
     last, after the bar from 744 (screen 55's «Διαγραφή συγγενή»). -->
<svelte:element
	this={placement === 'page' ? 'main' : 'section'}
	data-slot="booking-change-screen"
	data-placement={placement}
	data-testid={testId}
	class={boxClasses[placement]}
>
	<div class="relative mx-auto w-full tablet:max-w-form">
		<div class={cn(backClasses[placement], besideList && 'split:hidden')}>
			<RoundLink
				href={backHref}
				label={m.booking_back({}, options)}
				icon="arrow-back"
				onclick={onBack}
				testId="booking-back"
			/>
		</div>
		<svelte:element this={placement === 'page' ? 'h1' : 'h2'} class={titleClasses[placement]}>
			{title}
		</svelte:element>
		{#if subtitle}
			<p class="-mt-3.5 mb-6 text-body-md text-muted-foreground">{subtitle}</p>
		{/if}
		{@render children?.()}
		{#if bar}
			<div
				data-slot="booking-change-bar"
				class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card tablet:static tablet:mt-6"
			>
				{#if cancelLabel === null}
					<!-- `appt.css:381` `.a-sbar.one`: the one way on, at the bar's end. -->
					<div
						class="flex flex-row justify-end px-5 pt-3 pb-safe-area-action tablet:px-0 tablet:pt-6 tablet:pb-0"
					>
						<Button
							tone="accent"
							radius="full"
							hover={false}
							label={primary}
							loading={saveLoading}
							disabled={saveDisabled}
							onclick={onSave}
							textClass="text-body-lg"
							data-testid="booking-save"
						/>
					</div>
				{:else}
					<ActionBar
						preset="plain"
						secondaryLabel={cancelLabel ?? m.booking_change_cancel({}, options)}
						onSecondaryClick={onCancel}
						secondaryTestId="booking-cancel"
						primaryLabel={primary}
						onPrimaryClick={onSave}
						primaryDisabled={saveDisabled}
						primaryLoading={saveLoading}
						primaryShape="pill"
						primaryTestId="booking-save"
						hover={false}
						class="tablet:px-0 tablet:pt-6 tablet:pb-0"
					/>
				{/if}
			</div>
		{/if}
		{@render footer?.()}
	</div>
</svelte:element>
