<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import RoundLink from './round-link.svelte';
	import type { BookingChangeFrameProps } from '../types';

	let {
		title,
		subtitle,
		backHref,
		onBack,
		saveLabel,
		saveDisabled = false,
		saveLoading = false,
		onCancel,
		onSave,
		locale,
		testId,
		children
	}: BookingChangeFrameProps = $props();

	const options = $derived({ locale });
</script>

<svelte:head>
	<title>{m.booking_meta_title({ title }, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 U-102 (record §3.3): a «Αλλαγή» is a screen of its own, never a modal — «←» at the top left, the title, the content;
     «Άκυρο» on the left and «Αποθήκευση» fully round on the right (U-104.2), pinned to the bottom below 744 (the
     application's, U-81.2), in the flow of a centred 560 column from 744. No colour under the pointer (D-W3-27). White
     to the bottom however short (W8-Δ1): the screen's height, less the bar's from 744. -->
<main
	data-slot="booking-change-screen"
	data-testid={testId}
	class="min-h-dvh bg-card px-gutter-sm pt-3 pb-page-bar tablet:min-h-page tablet:px-gutter-lg tablet:pt-section tablet:pb-section-lg"
>
	<div class="relative mx-auto w-full tablet:max-w-form">
		<div
			class="flex flex-row tablet:mb-4 split:absolute split:top-0 split:right-full split:mr-5 split:mb-0"
		>
			<RoundLink
				href={backHref}
				label={m.booking_back({}, options)}
				icon="arrow-back"
				onclick={onBack}
				testId="booking-back"
			/>
		</div>
		<h1
			class="mt-3 mb-6 text-heading-lg font-semibold text-foreground tablet:mt-0 tablet:text-heading-xl split:mt-1"
		>
			{title}
		</h1>
		{#if subtitle}
			<p class="-mt-3.5 mb-6 text-body-md text-muted-foreground">{subtitle}</p>
		{/if}
		{@render children?.()}
		<div
			data-slot="booking-change-bar"
			class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card tablet:static tablet:mt-6"
		>
			<ActionBar
				preset="plain"
				secondaryLabel={m.booking_change_cancel({}, options)}
				onSecondaryClick={onCancel}
				secondaryTestId="booking-cancel"
				primaryLabel={saveLabel ?? m.booking_change_save({}, options)}
				onPrimaryClick={onSave}
				primaryDisabled={saveDisabled}
				primaryLoading={saveLoading}
				primaryShape="pill"
				primaryTestId="booking-save"
				hover={false}
				class="tablet:px-0 tablet:pt-6 tablet:pb-0"
			/>
		</div>
	</div>
</main>
