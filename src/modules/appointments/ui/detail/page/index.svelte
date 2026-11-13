<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { buildDirectionsUrl } from '$shared/lib/directions';
	import { isPlainClick } from '$shared/lib/navigation';
	import { saveFile } from '$shared/lib/save-file';
	import { readServerNow } from '$shared/lib/server-clock';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import {
		APPOINTMENT_CALENDAR_TYPE,
		buildAppointmentCalendarFile
	} from '$modules/appointments/lib/calendar';
	import {
		appointmentCancelLinkLabel,
		appointmentOfficeLine,
		appointmentPhone,
		appointmentRateInvitationId,
		appointmentTabOf,
		buildAppointmentActionRows,
		buildAppointmentDoneNotice,
		buildAppointmentHeader,
		buildAppointmentNotices,
		buildAppointmentRows,
		buildAppointmentTerms,
		type AppointmentRow
	} from '$modules/appointments/lib/detail';
	import { appointmentDoctorHead } from '$modules/appointments/lib/list';
	import Actions from '../components/actions.svelte';
	import Ask from '../components/ask.svelte';
	import Card from '../components/card.svelte';
	import Header from '../components/header.svelte';
	import Notice from '../components/notice.svelte';
	import State from '../components/state.svelte';
	import Terms from '../components/terms.svelte';
	import type { AppointmentDetailProps } from '../types';

	let {
		locale,
		viewer,
		read,
		doctor,
		links,
		offline,
		done,
		justCanceled,
		message,
		onSignIn,
		onRetrySession,
		review
	}: AppointmentDetailProps = $props();

	const options = $derived({ locale });
	const appointment = $derived(read.appointment);
	const now = readServerNow();
	const tab = $derived(appointment ? appointmentTabOf(appointment, now) : 'upcoming');
	const upcoming = $derived(tab === 'upcoming');

	const state = $derived.by(() => {
		if (viewer === 'guest') return 'guest' as const;
		if (viewer === 'failed') return 'failed' as const;
		if (appointment) return 'ready' as const;
		if (read.missing) return 'missing' as const;
		if (read.failed || (offline && viewer === 'member')) return 'failed' as const;
		return 'loading' as const;
	});

	const head = $derived(doctor ? appointmentDoctorHead(doctor, locale) : doctor);
	const header = $derived(appointment ? buildAppointmentHeader(appointment, now, locale) : null);
	const notices = $derived(
		appointment
			? buildAppointmentNotices({
					appointment,
					actions: appointment.actions,
					justCanceled,
					locale
				})
			: []
	);
	const doneNotice = $derived(
		appointment && done ? buildAppointmentDoneNotice(done, appointment, locale) : null
	);
	const rows = $derived(
		appointment
			? buildAppointmentRows({ appointment, actions: appointment.actions, now, locale })
			: []
	);
	const terms = $derived(
		appointment
			? buildAppointmentTerms({ appointment, actions: appointment.actions, locale })
			: null
	);
	// 🔴 D-W4-31: the calendar's row only once its file can be written whole (a kept visit, its doctor's name known).
	const calendarFile = $derived(
		appointment
			? buildAppointmentCalendarFile({ appointment, doctorName: doctor?.name, locale })
			: null
	);
	// D-W4-32: the maps' directions to the address the patient reads on the card; never a map on the page (U-132.1).
	const directionsHref = $derived(
		appointment
			? buildDirectionsUrl({ address: appointmentOfficeLine(appointment.office, locale) })
			: null
	);
	const actionRows = $derived(
		appointment
			? buildAppointmentActionRows(appointment, now, locale).filter(
					(row) =>
						(row.id !== 'calendar' || calendarFile !== null) &&
						(row.id !== 'directions' || directionsHref !== null)
				)
			: []
	);
	const phone = $derived(appointment ? appointmentPhone(appointment) : null);
	const rateInvitationId = $derived(appointment ? appointmentRateInvitationId(appointment) : null);
	const cancelLabel = $derived(
		appointment ? appointmentCancelLinkLabel(appointment, appointment.actions, locale) : null
	);
	const profileHref = $derived(doctor?.doctorSlug ? links.doctor(doctor.doctorSlug) : null);

	/**
	 * U-102 / D-W3-31: «Αλλαγή», the cancellation and the rating are pages of their own, opened as one more step of the
	 * history (`page.state.appointment.depth` 1), so leaving them goes back to here; a new tab keeps the link's own way.
	 */
	function open(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		const target = event.currentTarget;
		const href = target instanceof HTMLAnchorElement ? target.getAttribute('href') : null;
		if (!href) return;
		event.preventDefault();
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(href, { state: { appointment: { depth: 1 } } });
	}

	function changeLabel(row: AppointmentRow): string {
		return row.change?.target === 'note' && !appointment?.patientNote
			? m.booking_summary_add_label({ field: row.label }, options)
			: m.booking_summary_change_label({ field: row.label }, options);
	}

	// D-W4-66 · U-81.2 · U-147.3 (live check w4-live-web-2 Δ; the application's `contact/index.tsx`: `flex-row flex-wrap`,
	// each `grow`): below 744 the shared `Button` as it is — its own 20 a side, one line — growing across its row, two side
	// by side while both fit, else one under the other; from 744 its own width. Never a size of this page's.
	const ACTION_BOX = 'flex-auto whitespace-nowrap tablet:flex-none';
	// The glyph before the label only from 744 (the application's buttons carry none): below it nothing stands in its
	// place — a glyph hidden by CSS kept its 12 beside the label, off the middle by 6 and 24 wider a row.
	const roomy = new MediaQuery(`(min-width: ${breakpoints.tablet}px)`, false);

	// D-W4-31: the browser hands the file over (`blob:`, revoked at once); its name a date, never a person.
	function addToCalendar() {
		if (!calendarFile) return;
		saveFile(
			new Blob([calendarFile.text], { type: APPOINTMENT_CALENDAR_TYPE }),
			calendarFile.fileName
		);
	}
</script>

{#snippet phoneGlyph()}
	<Ionicon name="call-outline" class="icon-md" />
{/snippet}
{#snippet chatGlyph()}
	<Ionicon name="chatbubble-outline" class="icon-md" />
{/snippet}

<!-- Review w4-w4 R1 MAJOR-2 (prototype `appt.js:268`, the application's `contact/index.tsx:28-38`): «Μήνυμα στον γιατρό»
     always; only the second changes, «Κλήση ιατρείου» while upcoming, «Κλείστε ξανά ραντεβού» in the history. D-W4-66: one
     line each (`ACTION_BOX`). -->
{#snippet buttons()}
	{#if message}
		<Button
			tone="outline"
			hover={false}
			label={m.appointments_detail_message({}, options)}
			leading={roomy.current ? chatGlyph : undefined}
			loading={message.busy}
			onclick={message.press}
			textClass="text-body-sm"
			data-testid="appointment-message"
			class={ACTION_BOX}
		/>
	{/if}
	{#if upcoming}
		{#if phone}
			<Button
				tone="outline"
				hover={false}
				href={`tel:${phone.dial}`}
				label={m.appointments_detail_call({}, options)}
				leading={roomy.current ? phoneGlyph : undefined}
				textClass="text-body-sm"
				data-testid="appointment-call"
				class={ACTION_BOX}
			/>
		{/if}
	{:else if profileHref}
		<Button
			tone="outline"
			hover={false}
			href={profileHref}
			label={m.appointments_detail_book_again({}, options)}
			textClass="text-body-sm"
			data-testid="appointment-book-again"
			class={ACTION_BOX}
		/>
	{/if}
{/snippet}

<!-- Screen 51 «Το ραντεβού» (record §7, U-135; P-W4 §4.2). Below 950 its own page with «‹» alone on its line (D-W4-66: the
     status under it, no capsule); from 950 the
     right column beside the list, «‹» hidden — 🔴 U-167 (D-W45-56): in the MIDDLE of that column, at most 720 wide with
     the same inset on both sides, never against the line. Its head, what it has to say (in the application's order),
     the card of
     screen 30 with «Αλλαγή» on its rows (U-135.2: no button fixed at the bottom), the doctor's terms, the rows of actions
     and the link that cancels. 🔴 U-132.1: no map; U-137.5: no word of a late cancellation; U-65.6: every word a person
     or the server wrote is a text node. -->
<article
	data-testid="appointment-page"
	data-state={state}
	class="mx-auto w-full max-w-content px-gutter-sm pt-3 pb-section-lg tablet:px-reading-gap tablet:pt-6 tablet:pb-pane-inset-lg split:max-w-document-wide split:px-pane-inset split:pt-section laptop:px-pane-inset-lg laptop:pt-reading-gap"
>
	<IconButton
		icon="arrow-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.appointments_detail_back({}, options)}
		href={links.list(tab)}
		data-testid="appointment-back"
		class="mb-3 flex split:hidden"
	/>

	{#if state === 'ready' && appointment && header}
		<Header {header} />

		{#if doneNotice}
			<Notice
				tone="done"
				text={doneNotice.title}
				lines={doneNotice.lines}
				testId="appointment-done"
			/>
		{/if}
		{#each notices as notice (notice.id)}
			<Notice
				tone={notice.tone}
				text={notice.text}
				lines={notice.lines}
				call={notice.call}
				testId={`appointment-notice-${notice.id}`}
			/>
		{/each}

		{#if rateInvitationId}
			<Ask
				title={m.ratings_ask_title({}, options)}
				body={m.ratings_ask_body({}, options)}
				cta={m.appointments_list_rate({}, options)}
				href={links.rating(rateInvitationId)}
				onOpen={open}
			/>
		{:else if review}
			{@render review()}
		{/if}

		<Card
			{head}
			{profileHref}
			{rows}
			actions={buttons}
			changeHref={(target) => links.step(appointment.id, target)}
			{changeLabel}
			onOpen={open}
		/>

		{#if terms}
			<Terms {terms} />
		{/if}

		<Actions rows={actionRows} {directionsHref} helpHref={links.help} onCalendar={addToCalendar} />

		{#if cancelLabel}
			<div class="mt-4">
				<!-- The screen's address, already resolved (a module knows no route). -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={links.step(appointment.id, 'cancel')}
					data-testid="appointment-cancel"
					class="inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					onclick={open}
				>
					{cancelLabel}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/if}
	{:else if state === 'guest'}
		<State
			kind="guest"
			title={m.appointments_detail_guest_title({}, options)}
			body={m.appointments_detail_guest_body({}, options)}
			action={{ label: m.nav_login({}, options), onPress: onSignIn }}
			label={m.appointments_detail_nav_title({}, options)}
		/>
	{:else if state === 'missing'}
		<State
			kind="missing"
			title={m.appointments_detail_not_found_title({}, options)}
			body={m.appointments_detail_not_found_body({}, options)}
			action={{
				label: m.appointments_detail_go_to_list({}, options),
				href: links.list('upcoming')
			}}
			label={m.appointments_detail_nav_title({}, options)}
		/>
	{:else if state === 'failed'}
		<State
			kind="failed"
			title={m.appointments_detail_error_title({}, options)}
			body={m.appointments_detail_error_body({}, options)}
			action={{
				label: m.appointments_detail_retry({}, options),
				onPress: viewer === 'failed' ? onRetrySession : read.retry
			}}
			label={m.appointments_detail_nav_title({}, options)}
		/>
	{:else}
		<State
			kind="loading"
			title=""
			body=""
			action={null}
			label={m.appointments_detail_nav_title({}, options)}
		/>
	{/if}
</article>
