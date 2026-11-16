<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { useDoctorMerge } from '../hooks';
	import type { DoctorMergeProps } from '../types';

	let { locale, recordId, links }: DoctorMergeProps = $props();

	const options = $derived({ locale });
	// 🔴 U-102: opened from the card one step on — «‹», «Άκυρο» and the join go back to it (a link alone: the card).
	const steps = useHistorySteps('doctorPatient');
	const leave = () => steps.leave(links.card);
	const read = useDoctorMerge({
		recordId: () => recordId,
		locale: () => locale,
		onDone: leave
	});

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	const frame = $derived({
		title: m.doctor_patients_merge_title({}, options),
		backHref: links.card,
		onBack: back,
		backLabel: m.doctor_appointment_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'centred' as const,
		onCancel: leave,
		backTestId: 'doctor-merge-back',
		cancelTestId: 'doctor-merge-cancel',
		saveTestId: 'doctor-merge-save'
	});
</script>

{#snippet personGlyph()}
	<StateGlyph name="people-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 U-198.2 · D-W51-67 (no prototype: the 73's look, the step screens of 69–72): 🔴 U-102 a screen of its own, never a
     dialog — below 744 over the tabs, 744–1127 one column of 560 in the middle, from 1128 beside the list in the card's
     place (U-167). The title «Ένωση με λογαριασμό», the three lines (the two names become ONE card with every visit;
     the patient's app does not change; it is not undone) and «Άκυρο» / «Ένωση». U-65.6: every word a text node. -->
{#if read.state === 'ready'}
	<StepScreen
		{...frame}
		cancelLabel={m.booking_change_cancel({}, options)}
		saveLabel={m.doctor_patients_merge_action({}, options)}
		saveLoading={read.sending}
		onSave={() => read.send()}
		testId="doctor-merge"
	>
		<div data-testid="doctor-merge-body" class="flex flex-col gap-3">
			{#each read.lines as line, index (index)}
				<p
					data-testid={`doctor-merge-line-${index + 1}`}
					class={index === 0
						? 'text-body-md text-foreground'
						: 'text-body-sm text-muted-foreground'}
				>
					{line}
				</p>
			{/each}
		</div>
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-merge-failure"
			>
				{read.failure}
			</p>
		{/if}
	</StepScreen>
{:else if read.state === 'closed'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_appointment_back({}, options)}
		onSave={leave}
		testId="doctor-merge-closed"
	>
		<NoticeCard
			tone="warm"
			role="alert"
			title={m.doctor_patients_merge_gone({}, options)}
			testId="doctor-merge-closed-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_appointment_back({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-merge-wait"
	>
		{#if read.state === 'missing'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_patients_missing({}, options)}
				icon={personGlyph}
				class="pt-section"
				testId="doctor-merge-missing"
			/>
		{:else if read.state === 'failed'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_patients_failed_title({}, options)}
				description={m.doctor_appointment_error_body({}, options)}
				actionLabel={m.doctor_today_retry({}, options)}
				onActionPress={() => read.retry()}
				actionTone="contrast"
				icon={errorGlyph}
				class="pt-section"
				testId="doctor-merge-failed"
			/>
		{:else}
			<div
				data-testid="doctor-merge-loading"
				aria-busy="true"
				aria-label={frame.title}
				class="grid gap-3"
			>
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
			</div>
		{/if}
	</StepScreen>
{/if}
