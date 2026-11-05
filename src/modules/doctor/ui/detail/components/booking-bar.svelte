<script lang="ts">
	import type { SignInRequest } from '$shared/state/session';
	import { StickyActionBar } from '$shared/ui/organisms/sticky-action-bar';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { DoctorBookingContent } from '$modules/doctor/lib/detail';
	import Fee from './fee.svelte';
	import { doctorBookingActionGlyphs } from './icons';

	let {
		booking,
		loadingSummary,
		onBook,
		onOpenWhen,
		onSelectOffice,
		onSignIn,
		onRetry
	}: {
		booking: DoctorBookingContent;
		/** The bar's first line while the times come («Κλείστε ραντεβού online»). */
		loadingSummary: string;
		onBook: () => void;
		/** The time line opens the window «Διαθεσιμότητα» (on the chosen or the next day). */
		onOpenWhen: () => void;
		onSelectOffice: (officeId: string) => void;
		onSignIn: (request?: SignInRequest) => void;
		onRetry: () => void;
	} = $props();

	const supporting = $derived(
		booking.failed
			? `${booking.failed.message} ${booking.failed.retryLabel}`
			: (booking.whenLine ?? booking.elsewhere?.label)
	);
	const supportingAction = $derived.by(() => {
		if (booking.failed) return onRetry;
		if (booking.whenLine) return onOpenWhen;
		const elsewhere = booking.elsewhere;
		return elsewhere ? () => onSelectOffice(elsewhere.officeId) : undefined;
	});
</script>

<!-- 🔴 U-37 / U-38.1 / U-42.2 (the phone, < 744; the application's `DoctorStickyBookingBar`): `book` — the visit, its
     fee (a guest's «🔒 Συνδεθείτε για κόστος»; none without services), the chosen or next time «Αύριο · 10:00 · Nikis
     12» that opens the window (or case 3's «Διαθέσιμο στο ιατρείο …», which switches office) and «Κράτηση». Nothing to
     book: the statement, ONE button and the other way as a link; the guest is not sent to sign in. -->
{#if booking.mode === 'book'}
	<StickyActionBar
		zone="tablet"
		room="page"
		summary={booking.waiting ? loadingSummary : booking.serviceTitle}
		loading={booking.waiting}
		{supporting}
		{supportingAction}
		cta={{ label: booking.ctaLabel, onclick: () => onBook() }}
		ctaTestId="doctor-booking-cta"
		data-testid="doctor-booking-bar"
		data-mode={booking.mode}
	>
		{#snippet price()}
			{#if booking.fee}
				<Fee
					fee={booking.fee}
					placement="bar"
					{onSignIn}
					testId={booking.fee.kind === 'login' ? 'doctor-booking-sign-in' : 'doctor-booking-fee'}
				/>
			{/if}
		{/snippet}
	</StickyActionBar>
{:else if booking.primary}
	{@const primary = booking.primary}
	{@const other = booking.secondary}
	<StickyActionBar
		zone="tablet"
		room="page"
		layout="stack"
		summary={booking.statement ?? ''}
		cta={{
			label: primary.label,
			href: primary.href,
			icon: doctorBookingActionGlyphs[primary.kind]
		}}
		ctaTestId={`doctor-booking-action-${primary.kind}`}
		data-testid="doctor-booking-bar"
		data-mode={booking.mode}
	>
		{#snippet secondary()}
			{#if other}
				<TextButton
					label={other.label}
					href={other.href}
					tone="foreground"
					underline
					data-testid={`doctor-booking-action-${other.kind}`}
				/>
			{/if}
		{/snippet}
	</StickyActionBar>
{/if}
