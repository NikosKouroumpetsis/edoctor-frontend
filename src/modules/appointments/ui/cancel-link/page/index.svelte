<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { BulletList } from '$shared/ui/molecules/bullet-list';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { NoteField } from '$shared/ui/molecules/note-field';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { TermsBox } from '$shared/ui/molecules/terms-box';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH } from '$modules/appointments/config';
	import {
		cancelCopy,
		cancelMessageCounter,
		cancelReasonOptions,
		clampCancelMessage
	} from '$modules/appointments/lib/cancel';
	import {
		buildCancelLinkContext,
		buildCancelLinkTerms,
		cancelLinkPhone,
		cancelLinkThenLines
	} from '$modules/appointments/lib/cancel-link';
	import { ChangeContext } from '$modules/appointments/ui/change-screen';
	import { useAppointmentCancelLink } from '../hooks';
	import type { AppointmentCancelLinkProps } from '../types';

	let { locale, token }: AppointmentCancelLinkProps = $props();

	const options = $derived({ locale });
	const read = useAppointmentCancelLink({ token: () => token, locale: () => locale });
	const link = $derived(read.link);
	const copy = $derived(link ? cancelCopy(link, locale) : cancelCopy({ status: 'booked' }, locale));
	const context = $derived(link ? buildCancelLinkContext(link, locale) : null);
	const terms = $derived(link ? buildCancelLinkTerms(link, locale) : null);
	const phone = $derived(link ? cancelLinkPhone(link) : null);
	const reasonsId = $props.id();
	const reason = read.form.field('reason');
	const message = read.form.field('message');

	// 🔴 D-W51-72: a page opened alone from a message — no «←» (nothing is behind it), its own tab title, `noindex`.
	const frame = $derived({
		title: copy.title,
		pageTitle: `${copy.title} | ${m.brand_name({}, options)}`,
		backHref: null,
		onBack: () => {},
		backLabel: m.doctor_reason_back({}, options),
		placement: 'page' as const,
		onCancel: () => {},
		saveTestId: 'cancel-link-submit'
	});
</script>

{#snippet phoneGlyph()}
	<Ionicon name="call-outline" class="icon-md" />
{/snippet}
{#snippet linkGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet box()}
	{#if context}
		<ChangeContext {context} />
	{/if}
{/snippet}
{#snippet deadlineTerms()}
	{#if terms && terms.lines.length > 0}
		<TermsBox title={terms.title} lines={terms.lines} testId="cancel-link-terms" class="mb-4" />
	{/if}
{/snippet}

<!-- 🔴 Wave 5.1 · the cancel link's page (D-W51-72, U-198.1; 88 §73 Ε1 Α): screen 53 without an account and without its
     menu — the site's mark alone over it (the frame's), the box with the doctor, the day, the hour and the office, the
     terms, the patient's five reasons, the words up to 500, what will happen, ONE «Ακύρωση ραντεβού» (U-137.1). After the
     deadline «Για ακύρωση, καλέστε το ιατρείο» with the office's phone; a link that cancels nothing «Ο σύνδεσμος δεν ισχύει
     πια.» with nothing of the visit. 🔴 Nothing of the patient anywhere; every word a text node (U-65.6). -->
{#if read.state === 'form' && link}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={copy.submit}
		saveDisabled={!reason.value}
		saveLoading={read.sending}
		onSave={() => read.submit()}
		testId="cancel-link"
	>
		{@render box()}
		{@render deadlineTerms()}
		<h3 id={reasonsId} class="mt-6 mb-3 text-body-lg font-semibold text-foreground">
			{m.appointments_cancel_reason_label({}, options)}
		</h3>
		<RadioRows
			labelledby={reasonsId}
			value={reason.value || null}
			options={cancelReasonOptions(locale).map((option) => ({
				value: option.code,
				label: option.label
			}))}
			onChange={(value) => {
				reason.setValue(value);
				read.clearFailure();
			}}
			frame="always"
			testId="cancel-link-reasons"
		/>
		<div class="mt-6">
			<NoteField
				label={m.appointments_cancel_text_label({}, options)}
				labelAs="h3"
				placeholder={m.appointments_cancel_text_placeholder({}, options)}
				value={message.value}
				counter={cancelMessageCounter(message.value, locale)}
				error={null}
				maxLength={APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH}
				height="short"
				onInput={(value) => message.setValue(clampCancelMessage(value))}
				testId="cancel-link-text"
			/>
		</div>
		<BulletList items={cancelLinkThenLines(locale)} />
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="cancel-link-failure"
			>
				{read.failure}
			</p>
		{/if}
	</StepScreen>
{:else if read.state === 'late' && link}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel=""
		onSave={() => {}}
		bar={false}
		testId="cancel-link-late"
	>
		{@render box()}
		{@render deadlineTerms()}
		<div
			role="alert"
			data-testid="cancel-link-deadline"
			class="rounded-md border border-warning/40 bg-warning/10 px-3.5 py-3 text-body-sm text-foreground"
		>
			<p class="font-medium">{m.cancel_link_call_office({}, options)}</p>
			{#if phone}
				<Button
					tone="outline"
					hover={false}
					href={`tel:${phone.dial}`}
					label={m.appointments_detail_call_office({ phone: phone.label }, options)}
					leading={phoneGlyph}
					textClass="text-body-sm"
					class="mt-3"
					data-testid="cancel-link-call"
				/>
			{/if}
		</div>
	</StepScreen>
{:else if read.state === 'done'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel=""
		onSave={() => {}}
		bar={false}
		testId="cancel-link-done"
	>
		{@render box()}
		<NoticeCard
			tone="done"
			role="status"
			title={m.appointments_detail_canceled({}, options)}
			lines={[m.cancel_link_doctor_told({}, options)]}
			testId="cancel-link-done-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel=""
		onSave={() => {}}
		bar={false}
		testId="cancel-link-wait"
	>
		{#if read.state === 'gone'}
			<EmptyState
				titleAs="h3"
				title={m.cancel_link_gone({}, options)}
				icon={linkGlyph}
				class="pt-section"
				testId="cancel-link-gone"
			/>
		{:else if read.state === 'rate-limited' || read.state === 'failed'}
			<EmptyState
				titleAs="h3"
				title={read.state === 'rate-limited'
					? m.booking_details_errors_rate_limited({}, options)
					: m.appointments_detail_error_title({}, options)}
				description={read.state === 'failed'
					? m.appointments_detail_error_body({}, options)
					: undefined}
				actionLabel={m.doctor_today_retry({}, options)}
				onActionPress={() => read.retry()}
				actionTone="contrast"
				icon={errorGlyph}
				class="pt-section"
				testId={`cancel-link-${read.state}`}
			/>
		{:else}
			<div data-testid="cancel-link-loading" aria-busy="true" class="grid gap-3">
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
				<Skeleton class="h-pane-skeleton w-full rounded-md" />
			</div>
		{/if}
	</StepScreen>
{/if}
