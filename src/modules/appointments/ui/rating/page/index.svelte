<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { createForm } from '$shared/lib/form';
	import { isPlainClick } from '$shared/lib/navigation';
	import { personalQueryMeta } from '$shared/query';
	import { getSessionOptional } from '$shared/state/session';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { ReviewCard } from '$shared/ui/molecules/review-card';
	import { StarInput } from '$shared/ui/molecules/star-input';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Rating } from '$shared/ui/primitives/rating';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { InfoDialog } from '$shared/ui/templates/info-dialog';
	import { storeAppointmentRated } from '$modules/appointments/api/appointment';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import {
		readRatingFailure,
		submitRating,
		type OwnReviewFacts,
		type RatingSubmitRequest
	} from '$modules/appointments/api/rating';
	import { RATING_COMMENT_MAX_LENGTH } from '$modules/appointments/config';
	import { buildAppointmentContext } from '$modules/appointments/lib/change';
	import {
		clampRatingComment,
		emptyRatingForm,
		gradeLabel,
		gradeLine,
		gradeOf,
		halfStarLabel,
		ratingAspectRows,
		ratingCommentCounter,
		ratingFormMessages,
		ratingFormRules,
		ratingThenLines,
		ratingValuesOf,
		readRatingComment,
		readRatingInvitationView,
		readRatingOutcome,
		starValueText,
		toRatingSubmitRequest,
		type RatingAspectRow
	} from '$modules/appointments/lib/rating';
	import {
		ChangeContext,
		ChangeFrame,
		NoteField,
		useAppointmentSteps
	} from '$modules/appointments/ui/change-screen';
	import { getAppointmentsMemoryOptional } from '$modules/appointments/ui/memory';
	import type { AppointmentRatingProps } from '../types';

	let props: AppointmentRatingProps = $props();

	const client = useQueryClient();
	const session = getSessionOptional();
	const memory = getAppointmentsMemoryOptional();
	const steps = useAppointmentSteps();
	const options = $derived({ locale: props.locale });
	const invitation = $derived(props.read.invitation);
	const appointment = $derived(props.visit.appointment);
	const appointmentHref = $derived(
		invitation ? props.links.appointment(invitation.appointmentId) : props.links.list('history')
	);

	let failure = $state<string | null>(null);
	// The server refused the review while the form was open (a blocker, a second one): the form locks with its words.
	let refusedWith = $state<string | null>(null);
	// The invitation is not this account's after all (the submit's `403`).
	let notAccessible = $state(false);
	// Once sent and answered, the form stays as it was while it goes back (the review is the 51's to show).
	let sent = $state(false);
	// One press sends once (U-138.1 «Υποβολή»): set before the mutation's own state catches up, freed when it settles.
	let sending = $state(false);
	let howOpen = $state(false);

	const invitationView = $derived(
		invitation ? readRatingInvitationView(invitation, props.locale) : null
	);
	const phase = $derived.by(() => {
		if (props.viewer === 'guest') return 'guest' as const;
		if (props.viewer === 'failed') return 'session-failed' as const;
		if (props.viewer === 'waiting') return 'loading' as const;
		if (notAccessible || props.read.refused || props.visit.missing) return 'refused' as const;
		if (props.read.failed || props.visit.failed) return 'failed' as const;
		if (!invitation || !appointment)
			return props.offline ? ('failed' as const) : ('loading' as const);
		if (invitationView?.kind === 'reviewed' && !sent) return 'loading' as const;
		if (refusedWith || invitationView?.kind === 'blocked') return 'blocked' as const;
		return 'form' as const;
	});
	const blockedMessage = $derived(
		refusedWith ?? (invitationView?.kind === 'blocked' ? invitationView.message : '')
	);

	// 🔴 D-W4-23: a link of an invitation already answered opens its appointment in this address's place, no refusal
	// shown — never while this form's own submit goes back with its notice.
	$effect(() => {
		const view = invitationView;
		if (view?.kind !== 'reviewed' || sent) return;
		untrack(() => {
			// The screen's address, already resolved (a module knows no route).
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(props.links.appointment(view.appointmentId), { replaceState: true });
		});
	});

	const context = $derived(
		appointment
			? buildAppointmentContext({
					appointment,
					doctor: props.doctor,
					withVisitor: true,
					locale: props.locale
				})
			: null
	);
	// The five aspects and the words, in the shared form (the contract's «Form state»): its rules — every aspect given,
	// no `<` `>`, the 2000 — are the lib's (`ratingFormRules`), and what travels is the lib's body (`request`).
	const form = createForm({
		initialValues: emptyRatingForm(),
		validators: ratingFormRules(),
		messages: untrack(() => ratingFormMessages(props.locale)),
		onSubmit: () => {
			if (!request) return;
			sending = true;
			failure = null;
			write.mutate(request);
		}
	});
	const comment = form.field('comment');

	const rows = $derived(ratingAspectRows(props.locale));
	const values = $derived(ratingValuesOf(form.values));
	const grade = $derived(gradeOf(values));
	const preview = $derived(
		grade === null
			? null
			: props.previewOf({ stars: grade, body: readRatingComment(comment.value).text ?? '' })
	);
	const then = $derived(
		ratingThenLines({
			authorName: props.authorName,
			expiresAt: invitation?.expiresAt ?? null,
			locale: props.locale
		})
	);
	const request = $derived(toRatingSubmitRequest(values, comment.value));

	const leave = () => steps.leave(appointmentHref);

	const write = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (body: RatingSubmitRequest) =>
			submitRating(props.read.invitation?.invitationId ?? '', body),
		onSuccess: (review: OwnReviewFacts | null) => {
			const appointmentId = invitation?.appointmentId;
			if (!appointmentId) return;
			sent = true;
			// D-W4-12: back on the visit, «Η αξιολόγηση υποβλήθηκε.» and its review «Σε έλεγχο» (the page's memory, D-W4-33).
			memory?.remember(appointmentId, { kind: 'rating' });
			if (review) {
				client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
				client.setQueryData(appointmentsQueryKeys.review(review.ratingId), review);
			}
			// 🔴 Review w4-w6 R1 MAJOR-1: the visit loses its invitation and names its review BEFORE the form goes back, so
			// the 51 never stands with «Αξιολογήστε» beside «Η αξιολόγηση υποβλήθηκε.» while (or if) the new read fails.
			storeAppointmentRated(client, appointmentId, review?.ratingId ?? null);
			void client.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
			leave();
		},
		onError: (error: unknown) => {
			const outcome = readRatingOutcome(readRatingFailure(error), props.locale);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the form; the stars and the words stay for the same person.
				session?.expire({});
				return;
			}
			if (outcome.kind === 'not-accessible') {
				notAccessible = true;
				return;
			}
			if (outcome.kind === 'blocked') {
				refusedWith = outcome.message;
				return;
			}
			failure = outcome.message;
		},
		onSettled: () => {
			sending = false;
		}
	}));

	function submit() {
		if (sending || sent || !request) return;
		void form.handleSubmit();
	}

	function setValue(id: RatingAspectRow['id'], value: number) {
		form.field(id).setValue(value);
		failure = null;
	}

	// The words' rule is said as they are written (D-W4-13), not only once the field is left.
	function writeComment(value: string) {
		form.setTouched('comment');
		comment.setValue(clampRatingComment(value));
		failure = null;
	}

	// «Δοκιμάστε ξανά»: the session's read, else the invitation's, else its visit's — whichever failed.
	function retry() {
		if (phase === 'session-failed') props.onRetrySession();
		else if (props.read.failed || !props.read.invitation) props.read.retry();
		else props.visit.retry();
	}

	// Review w4-w6 R1 NIT-1: «←» does what its link says — a refused invitation's «Τα ραντεβού μου» in this address's
	// place (never a step back into a visit that is not the reader's), else back to the visit.
	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		if (phase !== 'refused') return leave();
		// The screen's address, already resolved (a module knows no route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(props.links.list('upcoming'), { replaceState: true });
	}
</script>

{#snippet warnGlyph()}
	<StateGlyph name="alert-circle" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}

<!-- Screen 54 «Αξιολόγηση επίσκεψης» (record §10.2, U-138; `appt.js:380-412`): a screen of its own, never a window
     (U-102) — below 950 its own page, from 950 the right column beside the history (U-136.2). «Η επίσκεψή σας», the five
     aspects with the shared stars (a press whole, the same star again half, U-138.2), «Βαθμός κριτικής» by the server's
     formula, the words up to 2000 (U-65.6: no `<` `>`), the review as the doctor's profile will show it (U-138.4), the
     four lines, «Πώς λειτουργούν οι κριτικές» (D-W4-24: information, the profile's window) and «Πολιτική κριτικών»;
     «Άκυρο / Υποβολή», locked until all five are given and while it goes. 🔴 U-138.6: «αξιολόγηση» the act,
     «κριτική» what is published. -->
{#if phase === 'form' && context}
	<ChangeFrame
		title={m.ratings_form_title({}, options)}
		backHref={appointmentHref}
		onBack={back}
		saveLabel={m.ratings_form_submit({}, options)}
		saveDisabled={request === null || sent}
		saveLoading={sending}
		onCancel={leave}
		onSave={submit}
		locale={props.locale}
		placement="pane"
		testId="appointment-rating"
	>
		<ChangeContext {context} />
		<p class="mb-5 text-label-lg font-normal text-muted-foreground">
			{m.ratings_form_help({}, options)}
		</p>
		<ul data-testid="appointment-rating-aspects" class="border-b border-line">
			{#each rows as row (row.id)}
				{@const aspect = form.field(row.id)}
				<li
					data-slot="rating-aspect"
					data-aspect={row.id}
					class="flex flex-col gap-1 border-t border-line pt-3.5 pb-2.5 tablet:flex-row tablet:items-center tablet:justify-between tablet:gap-4 tablet:py-3"
				>
					<div class="min-w-0">
						<p class="text-body-md font-semibold text-foreground">{row.name}</p>
						<p class="text-label-lg font-normal text-muted-foreground">{row.hint}</p>
					</div>
					<div class="-ml-1 flex flex-row items-center">
						<StarInput
							value={aspect.value}
							aria-label={row.name}
							valueText={(value) => starValueText(value, props.locale)}
							disabled={sending || sent}
							onValueChange={(value) => setValue(row.id, value)}
							data-testid={`appointment-rating-stars-${row.id}`}
						/>
						<span
							aria-hidden="true"
							class="ml-2 min-w-indent text-body-md font-semibold text-foreground"
							data-testid={`appointment-rating-value-${row.id}`}
						>
							{halfStarLabel(aspect.value, props.locale)}
						</span>
					</div>
				</li>
			{/each}
		</ul>
		<div
			data-testid="appointment-rating-grade"
			class="mt-4 flex flex-row items-center justify-between gap-4 rounded-md bg-foreground/5 px-4 py-3.5"
		>
			<div class="min-w-0">
				<p class="text-body-sm font-semibold text-foreground">
					{m.ratings_form_grade_title({}, options)}
				</p>
				<p class="text-label-lg font-normal text-muted-foreground">
					{gradeLine(values, props.locale)}
				</p>
			</div>
			{#if grade !== null}
				<div class="flex shrink-0 flex-row items-center gap-2">
					<span class="text-title-md font-semibold text-foreground">
						{gradeLabel(grade, props.locale)}
					</span>
					<Rating variant="stars" value={grade} />
				</div>
			{/if}
		</div>
		<div class="mt-6">
			<NoteField
				label={m.ratings_form_comment_label({}, options)}
				labelAs="h3"
				placeholder={m.ratings_form_comment_placeholder({}, options)}
				value={comment.value}
				counter={ratingCommentCounter(comment.value, props.locale)}
				error={comment.error ?? null}
				help={m.ratings_form_comment_help({}, options)}
				maxLength={RATING_COMMENT_MAX_LENGTH}
				height="review"
				onInput={writeComment}
				testId="appointment-rating-comment"
			/>
		</div>
		{#if preview}
			<section data-testid="appointment-rating-preview" class="mt-6">
				<h3 class="mb-2.5 text-body-sm font-semibold text-foreground">
					{m.ratings_form_preview({}, options)}
				</h3>
				<div class="rounded-md border border-line-2 p-4">
					<ReviewCard
						layout="list"
						authorName={preview.authorName}
						authorInitial={preview.authorInitial}
						dateLabel={preview.dateLabel}
						rating={preview.rating}
						ratingLabel={preview.ratingLabel}
						body={preview.body}
					/>
				</div>
			</section>
		{/if}
		<ul class="mt-5 grid list-disc gap-1.5 ps-4 text-label-lg font-normal text-muted-foreground">
			{#each then as line, index (index)}
				<li>{line}</li>
			{/each}
		</ul>
		<div class="mt-3 flex flex-row flex-wrap gap-x-5">
			<button
				type="button"
				data-testid="appointment-rating-how"
				class="inline-flex min-h-touch min-w-touch items-center text-body-sm font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				onclick={() => (howOpen = true)}
			>
				{m.doctor_reviews_how({}, options)}
			</button>
			<!-- The screen's address, already resolved (a module knows no route). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={props.policyHref}
				data-testid="appointment-rating-policy"
				class="inline-flex min-h-touch min-w-touch items-center text-body-sm font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{m.doctor_reviews_how_policy({}, options)}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
		{#if failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="appointment-rating-failure"
			>
				{failure}
			</p>
		{/if}
	</ChangeFrame>
	<InfoDialog
		bind:open={howOpen}
		title={m.doctor_reviews_how({}, options)}
		blocks={props.how.blocks}
		links={props.how.links}
		closeLabel={m.doctor_window_close({}, options)}
		testId="appointment-rating-how-dialog"
	/>
{:else if phase === 'blocked' && context}
	<ChangeFrame
		title={m.ratings_form_title({}, options)}
		backHref={appointmentHref}
		onBack={back}
		cancelLabel={null}
		saveLabel={m.ratings_form_back({}, options)}
		onCancel={leave}
		onSave={leave}
		locale={props.locale}
		placement="pane"
		testId="appointment-rating-blocked"
	>
		<ChangeContext {context} />
		<p
			role="alert"
			data-testid="appointment-rating-blocker"
			class="rounded-md border border-line bg-background px-3.5 py-3 text-body-sm text-foreground"
		>
			{blockedMessage}
		</p>
	</ChangeFrame>
{:else}
	<ChangeFrame
		title={m.ratings_form_title({}, options)}
		backHref={phase === 'refused' ? props.links.list('upcoming') : appointmentHref}
		onBack={back}
		bar={false}
		onCancel={leave}
		onSave={leave}
		locale={props.locale}
		placement="pane"
		testId="appointment-rating-state"
	>
		<div data-state={phase} data-testid={`appointment-rating-${phase}`}>
			{#if phase === 'loading'}
				<div aria-busy="true" aria-label={m.ratings_form_title({}, options)} class="grid gap-3">
					<Skeleton class="h-placeholder-md w-full rounded-md" />
					<Skeleton class="h-placeholder-lg w-full rounded-md" />
					<Skeleton class="h-placeholder-lg w-full rounded-md" />
				</div>
			{:else if phase === 'refused'}
				<EmptyState
					titleAs="h3"
					title={m.ratings_invitation_refused_title({}, options)}
					description={m.ratings_invitation_refused_body({}, options)}
					actionLabel={m.ratings_invitation_appointments({}, options)}
					actionHref={props.links.list('upcoming')}
					actionTone="contrast"
					icon={warnGlyph}
					class="pt-section"
				/>
			{:else if phase === 'guest'}
				<EmptyState
					titleAs="h3"
					title={m.appointments_detail_guest_title({}, options)}
					description={m.appointments_detail_guest_body({}, options)}
					actionLabel={m.nav_login({}, options)}
					onActionPress={props.onSignIn}
					actionTone="contrast"
					icon={calendarGlyph}
					class="pt-section"
				/>
			{:else}
				<EmptyState
					titleAs="h3"
					title={m.ratings_invitation_failed_title({}, options)}
					description={m.ratings_invitation_failed_body({}, options)}
					actionLabel={m.ratings_invitation_retry({}, options)}
					onActionPress={retry}
					actionTone="contrast"
					icon={errorGlyph}
					class="pt-section"
				/>
			{/if}
		</div>
	</ChangeFrame>
{/if}
