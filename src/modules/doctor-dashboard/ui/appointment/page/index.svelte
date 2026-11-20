<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { APPOINTMENT_DAY_TIME_SEPARATOR } from '$shared/lib/appointment-when';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { ButtonStack, type ButtonStackAction } from '$shared/ui/molecules/button-stack';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { FactRow } from '$shared/ui/molecules/fact-row';
	import { InfoBand } from '$shared/ui/molecules/info-band';
	import { LinkCard } from '$shared/ui/molecules/link-card';
	import { NoticeCard, type NoticeCardTone } from '$shared/ui/molecules/notice-card';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { StatusHeading } from '$shared/ui/molecules/status-heading';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Rating } from '$shared/ui/primitives/rating';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import {
		buildDoctorAppointmentBlock,
		buildDoctorAppointmentHead,
		buildDoctorAppointmentLog,
		buildDoctorAppointmentPatientBox,
		buildDoctorAppointmentRows,
		buildDoctorAppointmentTerms,
		doctorAppointmentMessageTarget,
		type DoctorAppointmentBlock
	} from '$modules/doctor-dashboard/lib/detail';
	import type { DoctorAppointmentStep } from '$modules/doctor-dashboard/lib/paths';
	import { buildDoctorReviewCard } from '$modules/doctor-dashboard/lib/reviews';
	import type { DoctorCardAnswer } from '$modules/doctor-dashboard/ui/card';
	import { getDoctorAppointmentMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
	import Log from '../components/log.svelte';
	import Patient from '../components/patient.svelte';
	import { useDoctorAppointment } from '../hooks';
	import type { DoctorAppointmentProps } from '../types';

	let { locale, appointmentId, links }: DoctorAppointmentProps = $props();

	const options = $derived({ locale });
	const read = useDoctorAppointment({
		appointmentId: () => appointmentId,
		locale: () => locale
	});
	const appointment = $derived(read.appointment);

	const head = $derived(
		appointment ? buildDoctorAppointmentHead(appointment, read.now, locale) : null
	);
	// 🔴 D-W51-51 / 52 · D-W51-62: what screens 70 / 71 just saved here (the screen's memory, never the address) — its
	// green card.
	const memory = getDoctorAppointmentMemoryOptional();
	const block = $derived(
		appointment
			? buildDoctorAppointmentBlock({
					appointment,
					now: read.now,
					done: read.done,
					saved: memory?.doneOf(appointment.id) ?? null,
					locale
				})
			: null
	);
	const patient = $derived(
		appointment ? buildDoctorAppointmentPatientBox(appointment, locale) : null
	);
	const rows = $derived(appointment ? buildDoctorAppointmentRows(appointment, locale) : []);
	const terms = $derived(appointment ? buildDoctorAppointmentTerms(appointment, locale) : null);
	const log = $derived(appointment ? buildDoctorAppointmentLog(appointment, locale) : []);
	// 🔴 U-193.1 (D-W51-87): «Μήνυμα» opens the conversation, or one the doctor starts with this patient (the doctor writes
	// first). 🔴 D-W51-71: never for a patient without an account (he has nowhere to read it).
	const messageTarget = $derived(appointment ? doctorAppointmentMessageTarget(appointment) : null);
	const conversationHref = $derived(
		!messageTarget
			? null
			: 'conversationId' in messageTarget
				? links.conversation(messageTarget.conversationId)
				: links.newConversation(messageTarget.patient)
	);

	// 🔴 D-W51-49 · D-W51-51 / 52 · D-W51-62 · U-102: «Απόρριψη», «Ακύρωση ραντεβού», every «Αλλαγή» and «Διόρθωση»
	// open screens 69 / 70 / 71 as one more step of the history (`page.state.doctorAppointment.depth` 1), so leaving them
	// comes back here; a new tab keeps the link's own way.
	const steps = useHistorySteps('doctorAppointment');
	const openStep = (step: DoctorAppointmentStep) => (event: MouseEvent) => {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		steps.open(links.step(step), 1);
	};
	// 🔴 D-W51-73 (`sw.js:1064-1070` `pt-open` / `pt-back`): the name opens the patient's card of screen 73 one step on
	// (`page.state.doctorPatient.depth` 1), so the card's «‹» comes back here; a new tab keeps the link's own way.
	const patientSteps = useHistorySteps('doctorPatient');
	const patientHref = $derived(
		appointment?.patientKey ? links.patient(appointment.patientKey) : null
	);
	function openPatient(event: MouseEvent) {
		if (!patientHref || !isPlainClick(event)) return;
		event.preventDefault();
		patientSteps.open(patientHref, 1);
	}
	// 🔴 D-W51-90 (`sw.js:989` `ap-back`, live a11 / w10): opened from a line of the doctor's notifications (one step on,
	// `page.state.doctorNotification.depth` 1), «‹» goes back to the list through the history — at every width, as the
	// card's «‹» when something else opened it; a link alone keeps its own way back (the list of 67).
	const fromNotifications = useHistorySteps('doctorNotification');
	// 🔴 D-W52-91 · U-219.2 (`sw.js` `ap-back` from `rev`): opened from a review of «Κριτικές» (one step on,
	// `page.state.doctorReview.depth` 1), «‹» goes back to that same review through the history, at every width too.
	const fromReviews = useHistorySteps('doctorReview');
	const backFrom = $derived(
		fromNotifications.depth > 0 ? 'notifications' : fromReviews.depth > 0 ? 'reviews' : null
	);
	const backToList = $derived(backFrom !== null);
	function back(event: MouseEvent) {
		if (!backToList || !isPlainClick(event)) return;
		event.preventDefault();
		(backFrom === 'reviews' ? fromReviews : fromNotifications).leave(links.back, 1);
	}
	// 🔴 U-220.1 · D-W52-89: the patient's published review of this visit, over «Χρονολόγιο».
	const review = $derived(
		read.review ? buildDoctorReviewCard(read.review, { visits: [], openReports: [] }, locale) : null
	);
	// 🔴 D-W51-49 (`sw.js:438`): «Ακύρωση ραντεβού» only with the server's `canCancel`, never for a request (refused instead).
	const cancelShown = $derived(
		Boolean(appointment?.actions.canCancel) && appointment?.status !== 'pending'
	);

	const tones: Record<DoctorAppointmentBlock['kind'], NoticeCardTone> = {
		request: 'warm',
		outcome: 'warm',
		done: 'done',
		closed: 'neutral',
		correction: 'neutral'
	};

	/**
	 * 🔴 U-189.1 · U-190.1 · D-W51-49 · D-W51-51 · D-W51-61: the answers the server allows, one under the other, the dark
	 * one last — a request's «Απόρριψη» (screen 69), «Αλλαγή» (screen 70, with `canReschedule`) and «Επιβεβαίωση»,
	 * «Δεν ήρθε · Ολοκληρώθηκε» for a visit begun (one tap each, the 66's hook, D-W51-25), «Διόρθωση» of a settled one
	 * (screen 71, U-102: a screen of its own, D-W51-62).
	 */
	const answers = $derived.by((): ButtonStackAction[] => {
		if (block?.kind === 'correction') {
			return [
				{
					id: 'correction',
					label: m.doctor_outcome_correct({}, options),
					href: links.step('correction'),
					onPress: openStep('correction'),
					testId: 'doctor-appointment-correct'
				}
			];
		}
		if (!block || (block.kind !== 'request' && block.kind !== 'outcome')) return [];
		const busy = read.answering;
		const one = (answer: DoctorCardAnswer, label: string, emphasis: boolean, testId: string) => ({
			id: answer,
			label,
			emphasis,
			loading: busy === answer,
			disabled: busy !== null && busy !== answer,
			onPress: () => read.answer(answer),
			testId
		});
		if (block.kind === 'request') {
			return [
				...(appointment?.actions.canReject
					? [
							{
								id: 'reject',
								label: m.doctor_today_reject({}, options),
								href: links.step('reject'),
								disabled: busy !== null,
								onPress: openStep('reject'),
								testId: 'doctor-appointment-reject'
							}
						]
					: []),
				...(appointment?.actions.canReschedule
					? [
							{
								id: 'move',
								label: m.booking_summary_change({}, options),
								href: links.step('time'),
								disabled: busy !== null,
								onPress: openStep('time'),
								testId: 'doctor-appointment-move'
							}
						]
					: []),
				...(block.confirm
					? [
							one(
								'confirm',
								m.doctor_today_confirm({}, options),
								true,
								'doctor-appointment-confirm'
							)
						]
					: [])
			];
		}
		return [
			...(block.outcomes.includes('NO_SHOW')
				? [one('NO_SHOW', m.doctor_today_no_show({}, options), false, 'doctor-appointment-no-show')]
				: []),
			...(block.outcomes.includes('COMPLETED')
				? [
						one(
							'COMPLETED',
							m.doctor_today_completed({}, options),
							true,
							'doctor-appointment-completed'
						)
					]
				: [])
		];
	});

	// D-W4-66 (the 51's buttons): below 744 each grows across its row, from 744 its own width; one line each.
	const ACTION_BOX = 'flex-auto whitespace-nowrap tablet:flex-none';
</script>

{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet stack()}
	<ButtonStack actions={answers} testId="doctor-appointment-answers" />
	{#if block?.kind === 'outcome'}
		<!-- 🔴 D-W51-61 (`sw.js:407`, `sw.css:221-222`): while the visit lasts «Ήρθε, είναι ακόμα στο ιατρείο» (`ARRIVED`,
		     one tap, only as the server offers it), then what each answer means for the patient. -->
		{#if block.arrive}
			<div class="mt-3 flex flex-row justify-center">
				<TextButton
					label={m.doctor_outcome_arrive({}, options)}
					tone="foreground"
					underline
					textClass="text-body-sm font-semibold"
					disabled={read.answering !== null}
					onclick={() => read.answer('ARRIVED')}
					data-testid="doctor-appointment-arrived"
				/>
			</div>
		{/if}
		<p
			data-testid="doctor-appointment-outcome-meaning"
			class="mt-2.5 text-label-lg font-normal text-muted-foreground"
		>
			{block.meaning}
		</p>
	{/if}
{/snippet}
{#snippet contact()}
	{#if patient?.call}
		<Button
			tone="outline"
			hover={false}
			href={`tel:${patient.call.dial}`}
			label={m.doctor_appointment_call({}, options)}
			textClass="text-body-sm"
			data-testid="doctor-appointment-call"
			class={ACTION_BOX}
		/>
	{/if}
	{#if conversationHref}
		<Button
			tone="outline"
			hover={false}
			href={conversationHref}
			label={m.doctor_appointment_message({}, options)}
			textClass="text-body-sm"
			data-testid="doctor-appointment-message"
			class={ACTION_BOX}
		/>
	{/if}
{/snippet}

<!-- 🔴 Wave 5.1 · screen 68 «Το ραντεβού», the doctor's side (D-W51-36 … 38; 88 §68, §71; `64-switch/sw.js:395-449`
     `apptBody`, `sw.css:170-189`): the approved 51 with the patient in the doctor's place. Below 744 the application's page
     with «‹» (back to the list, its pill and office kept); 744–1127 one column of 640 in the middle, «‹» still there;
     from 1128 beside the list of 67, in the middle of its column (U-167), no «‹». The head, what asks for an answer first
     (since step 7 the outcome's blocks and «Διόρθωση» to screen 71, D-W51-61), the patient's box WHOLE (U-182.7) with its
     «Αλλαγή» to screen 70 (D-W51-51 / 52: «Ημέρα και ώρα», «Υπηρεσίες», «Κόστος», only with the server's `actions`), «Οι
     όροι σας», «Χρονολόγιο», «Ακύρωση ραντεβού» at the end (D-W51-49). U-65.6: every word a text node. -->
<article
	data-testid="doctor-appointment"
	data-state={read.state}
	data-status={appointment?.status}
	class="mx-auto w-full max-w-split-solo px-gutter-sm pt-3 pb-section-lg tablet:px-0 tablet:pt-section laptop:max-w-none laptop:pt-0 laptop:pb-0"
>
	<IconButton
		icon="chevron-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.doctor_appointment_back({}, options)}
		href={links.back}
		onclick={back}
		data-testid="doctor-appointment-back"
		data-from={backFrom ?? undefined}
		class={backToList ? 'mb-3 flex' : 'mb-3 flex laptop:hidden'}
	/>

	{#if read.state === 'ready' && appointment && head && patient}
		<StatusHeading
			pill={head.status}
			day={head.day}
			time={head.time}
			separator={APPOINTMENT_DAY_TIME_SEPARATOR}
			sub={head.sub}
			pillTestId="doctor-appointment-status"
			titleTestId="doctor-appointment-when"
			subTestId="doctor-appointment-sub"
		/>

		{#if block}
			<NoticeCard
				tone={tones[block.kind]}
				title={block.text}
				lines={block.lines}
				role={block.kind === 'done' ? 'status' : undefined}
				action={answers.length > 0 ? stack : undefined}
				testId={`doctor-appointment-${block.kind}`}
				class="mb-4"
			/>
		{/if}

		<section
			data-testid="doctor-appointment-facts"
			class="rounded-md border border-line-2 bg-card p-4"
		>
			<Patient
				{patient}
				word={m.doctor_appointment_patient({}, options)}
				actions={patient.call || conversationHref ? contact : undefined}
				href={patientHref}
				onOpen={openPatient}
			/>
			{#each rows as row (row.id)}
				<FactRow
					row={row.id}
					label={row.label}
					values={row.values}
					emphasis={row.emphasis}
					pairs={row.pairs}
					breakdown={row.breakdown}
					notes={row.notes}
					hint={row.hint}
					change={row.change
						? {
								label: m.booking_summary_change({}, options),
								ariaLabel: m.booking_summary_change_label({ field: row.label }, options),
								href: links.step(row.change),
								step: row.change,
								onOpen: openStep(row.change)
							}
						: null}
					testId={`doctor-appointment-row-${row.id}`}
				/>
			{/each}
		</section>

		{#if terms}
			<InfoBand
				title={terms.title}
				lines={terms.lines}
				testId="doctor-appointment-terms"
				class="mt-3"
			/>
		{/if}

		{#if review}
			<!-- 🔴 U-220.1 (`sw.js:1130-1132` `w-aprv`): ONLY here — «Η κριτική του ασθενή ★ N · ημερομηνία ›» over
			     «Χρονολόγιο», to that review in «Κριτικές». -->
			<LinkCard
				href={links.review(review.id)}
				icon="star-outline"
				label={m.doctor_appointment_review({}, options)}
				name={m.doctor_appointment_review_label(
					{ rating: review.rating, date: review.day },
					options
				)}
				testId="doctor-appointment-review"
				class="mt-4"
			>
				{#snippet body()}
					<span class="flex flex-row flex-wrap items-center gap-x-2">
						<Rating variant="stars" starSize="xs" value={review.stars} class="gap-0.5" />
						<span class="text-body-sm font-semibold text-foreground">{review.day}</span>
					</span>
				{/snippet}
			</LinkCard>
		{/if}

		{#if log.length > 0}
			<Log title={m.doctor_appointment_log_title({}, options)} lines={log} />
		{/if}

		{#if cancelShown}
			<!-- `sw.js:438` (`.a-foot`, `.a-cancel`): the 51's way, the underlined link at the end (D-W51-49). -->
			<div class="mt-4">
				<!-- The screen's address, already resolved (a module knows no route). -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={links.step('cancel')}
					data-testid="doctor-appointment-cancel"
					class="inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					onclick={openStep('cancel')}
				>
					{m.doctor_appointment_cancel({}, options)}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
		{/if}
	{:else if read.state === 'missing'}
		<EmptyState
			titleAs="h2"
			title={m.doctor_appointment_not_found_title({}, options)}
			description={m.doctor_appointment_not_found_body({}, options)}
			actionLabel={m.doctor_appointments_title({}, options)}
			actionHref={links.back}
			actionTone="contrast"
			icon={calendarGlyph}
			class="pt-section-lg"
			testId="doctor-appointment-missing"
		/>
	{:else if read.state === 'failed'}
		<EmptyState
			titleAs="h2"
			title={m.doctor_appointment_error_title({}, options)}
			description={m.doctor_appointment_error_body({}, options)}
			actionLabel={m.doctor_today_retry({}, options)}
			onActionPress={() => read.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section-lg"
			testId="doctor-appointment-failed"
		/>
	{:else}
		<div
			data-testid="doctor-appointment-loading"
			aria-busy="true"
			aria-label={m.doctor_appointment_title({}, options)}
			class="grid gap-3"
		>
			<Skeleton class="h-6 w-1/4 rounded-full" />
			<Skeleton class="h-control-xs w-2/3 rounded-sm" />
			<Skeleton class="h-4.5 w-2/5 rounded-xs" />
			<Skeleton class="mt-2 h-pane-skeleton w-full rounded-md" />
			<Skeleton class="h-placeholder-lg w-full rounded-md" />
		</div>
	{/if}
</article>
