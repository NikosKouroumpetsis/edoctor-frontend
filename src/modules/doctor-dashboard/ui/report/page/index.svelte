<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoteField } from '$shared/ui/molecules/note-field';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH } from '$modules/doctor-dashboard/config';
	import { useDoctorReviewReport } from '../hooks';
	import type { DoctorReviewReportProps } from '../types';

	let { locale, ratingId, reviewsHref }: DoctorReviewReportProps = $props();

	const options = $derived({ locale });
	const questionId = useId(undefined, 'doctor-review-report-question');
	// 🔴 D-W52-92 (U-102): opened from «Κριτικές» one step on (`page.state.doctorReview.depth` 1), «‹», «Άκυρο» and a sent
	// report go back that step, to the same review; a link alone goes to «Κριτικές» in place.
	const steps = useHistorySteps('doctorReview');
	const leave = () => steps.leave(reviewsHref, 1);
	const report = useDoctorReviewReport({
		locale: () => locale,
		ratingId: () => ratingId,
		onDone: leave
	});

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	const frame = $derived({
		title: m.doctor_my_review_report_title({}, options),
		backHref: reviewsHref,
		onBack: back,
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'solo' as const,
		onCancel: leave,
		backTestId: 'doctor-review-report-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 84, the report of ONE review (U-219.1 Ε3 Α, D-W52-87 / 92; `64-switch/sw.js` `rvSheet`): a PAGE,
     never a window (U-102, D-W52-92) — below 744 over the tabs with its bar at the bottom, from 744 alone in the middle.
     «Τι συμβαίνει με την κριτική του ασθενή …;», the five reasons one under the other (U-112), «Πείτε μας περισσότερα
     (προαιρετικό)» up to 1000, «Η κριτική μένει στη σελίδα σας …», «Άκυρο · Αποστολή αναφοράς». Every word a text node
     (U-65.6). -->
{#if report.state === 'ready'}
	<StepScreen
		{...frame}
		subtitle={m.doctor_my_review_report_question({ name: report.patient }, options)}
		subtitleId={questionId}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_my_review_report_send({}, options)}
		saveLoading={report.writing}
		onSave={() => report.submit()}
		testId="doctor-review-report"
		cancelTestId="doctor-review-report-cancel"
		saveTestId="doctor-review-report-send"
	>
		<RadioRows
			labelledby={questionId}
			value={report.reason}
			options={report.reasons}
			onChange={(next) => report.choose(next)}
			frame="always"
			testId="doctor-review-report-reasons"
		/>
		{#if report.error}
			<p
				role="alert"
				data-testid="doctor-review-report-required"
				class="mt-2 text-label-lg font-medium text-danger-text"
			>
				{report.error}
			</p>
		{/if}
		<div class="mt-6">
			<NoteField
				label={m.doctor_my_review_report_more({}, options)}
				labelAs="h3"
				placeholder=""
				value={report.text}
				counter={m.doctor_my_service_count(
					{ count: report.text.length, limit: DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH },
					options
				)}
				error={null}
				help={m.doctor_my_review_report_stays({}, options)}
				maxLength={DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH}
				height="short"
				onInput={(typed) => report.type(typed)}
				testId="doctor-review-report-text"
			/>
		</div>
		{#if report.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-review-report-failure"
			>
				{report.failure}
			</p>
		{/if}
	</StepScreen>
{:else if report.state === 'loading'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-review-report-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{:else}
	<!-- Nothing to send here: the read failed («Δοκιμάστε ξανά»), the review is no longer on the doctor's page, or it is
	     already reported — the page's words and ONE way back to «Κριτικές». -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={leave}
		testId="doctor-review-report-closed"
		saveTestId="doctor-review-report-leave"
	>
		{#if report.state === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_dashboard_load_error({}, options)}
				actionLabel={m.doctor_dashboard_retry({}, options)}
				onAction={() => report.retry()}
				testId="doctor-review-report-error"
				actionTestId="doctor-review-report-retry"
			/>
		{:else}
			<NoticeCard
				tone={report.state === 'reported' ? 'neutral' : 'warm'}
				role={report.state === 'reported' ? 'status' : 'alert'}
				title={report.state === 'reported'
					? m.doctor_my_reviews_reported({}, options)
					: m.doctor_my_review_gone({}, options)}
				testId={`doctor-review-report-${report.state}`}
			/>
		{/if}
	</StepScreen>
{/if}
