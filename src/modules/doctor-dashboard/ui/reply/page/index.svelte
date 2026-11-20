<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoteField } from '$shared/ui/molecules/note-field';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { DOCTOR_REVIEW_REPLY_MAX_LENGTH } from '$modules/doctor-dashboard/config';
	import Quote from '../components/quote.svelte';
	import { useDoctorReviewReply } from '../hooks';
	import type { DoctorReviewReplyProps } from '../types';

	let { locale, ratingId, reviewsHref }: DoctorReviewReplyProps = $props();

	const options = $derived({ locale });
	// 🔴 D-W52-92 (U-102): opened from «Κριτικές» one step on (`page.state.doctorReview.depth` 1), «‹», «Άκυρο» and a sent
	// reply go back that step, to the same review; a link alone goes to «Κριτικές» in place.
	const steps = useHistorySteps('doctorReview');
	const leave = () => steps.leave(reviewsHref, 1);
	const reply = useDoctorReviewReply({
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
		title:
			reply.mode === 'change'
				? m.doctor_my_review_reply_title_change({}, options)
				: m.doctor_my_review_reply_title_new({}, options),
		backHref: reviewsHref,
		onBack: back,
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		// 🔴 U-215 (`w-edit-1440.png`): alone in the middle of the screen, in the place of the list.
		placement: 'solo' as const,
		onCancel: leave,
		backTestId: 'doctor-review-reply-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 84, the reply to ONE review (U-218.1, U-219.1 Ε2 Α, U-219.2, D-W52-86 / 92; `64-switch/sw.js`
     `rvEditPage`): a PAGE, never a window (U-102) — below 744 over the tabs with its bar at the bottom, from 744 alone in
     the middle. The review and «Το ραντεβού: …» over the field, «Η απάντησή σας» up to 2000 with its count, ONLY in
     Greek (U-207.3: no choice of a language), «Φαίνεται δημόσια …» (and «Ως τότε …» for a change), «Μη γράφετε
     στοιχεία υγείας …», «Άκυρο · Αποστολή». Every word a text node (U-65.6). -->
{#if reply.state === 'ready' && reply.card}
	<StepScreen
		{...frame}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_my_review_reply_send({}, options)}
		saveLoading={reply.writing}
		onSave={() => reply.submit()}
		testId="doctor-review-reply"
		cancelTestId="doctor-review-reply-cancel"
		saveTestId="doctor-review-reply-send"
	>
		<Quote card={reply.card} {locale} />
		<NoteField
			label={m.doctor_my_review_reply_label({}, options)}
			labelAs="h3"
			placeholder={m.doctor_my_review_reply_placeholder({}, options)}
			value={reply.text}
			counter={m.doctor_my_service_count(
				{ count: reply.text.length, limit: DOCTOR_REVIEW_REPLY_MAX_LENGTH },
				options
			)}
			error={reply.error}
			help={reply.mode === 'change'
				? `${m.doctor_my_review_reply_public({}, options)} ${m.doctor_my_review_reply_hidden({}, options)}`
				: m.doctor_my_review_reply_public({}, options)}
			maxLength={DOCTOR_REVIEW_REPLY_MAX_LENGTH}
			height="review"
			onInput={(typed) => reply.type(typed)}
			testId="doctor-review-reply-text"
		/>
		<p data-testid="doctor-review-reply-privacy" class="mt-1 text-label-lg text-muted-foreground">
			{m.doctor_my_review_reply_privacy({}, options)}
		</p>
		{#if reply.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-review-reply-failure"
			>
				{reply.failure}
			</p>
		{/if}
	</StepScreen>
{:else if reply.state === 'loading'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-review-reply-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-placeholder-lg w-full rounded-lg" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{:else}
	<!-- Nothing to write here: the read failed («Δοκιμάστε ξανά»), or the review is no longer on the doctor's page — the
	     page's words and ONE way back to «Κριτικές». -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={leave}
		testId="doctor-review-reply-closed"
		saveTestId="doctor-review-reply-leave"
	>
		{#if reply.state === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_dashboard_load_error({}, options)}
				actionLabel={m.doctor_dashboard_retry({}, options)}
				onAction={() => reply.retry()}
				testId="doctor-review-reply-error"
				actionTestId="doctor-review-reply-retry"
			/>
		{:else}
			<NoticeCard
				tone="warm"
				role="alert"
				title={m.doctor_my_review_gone({}, options)}
				testId="doctor-review-reply-gone"
			/>
		{/if}
	</StepScreen>
{/if}
