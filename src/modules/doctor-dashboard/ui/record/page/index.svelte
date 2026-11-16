<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { isPlainClick, useHistorySteps } from '$shared/lib/navigation';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH,
		DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH,
		DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH
	} from '$modules/doctor-dashboard/config';
	import { keepDoctorPatientIdInput } from '$modules/doctor-dashboard/lib/patients';
	import { useDoctorRecord } from '../hooks';
	import type { DoctorRecordProps } from '../types';

	let { locale, recordId, links }: DoctorRecordProps = $props();

	const options = $derived({ locale });
	// 🔴 U-102: opened from the card one step on — «‹», «Άκυρο» and the save go back to it (a link alone: the card).
	const steps = useHistorySteps('doctorPatient');
	const leave = () => steps.leave(links.card);
	const read = useDoctorRecord({
		recordId: () => recordId,
		locale: () => locale,
		onDone: leave
	});
	const form = $derived(read.form);

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		leave();
	}

	/** The ΑΜΚΑ and the ΑΦΜ keep only their digits (11 / 9 at most): a letter typed or pasted leaves nothing behind. */
	function keepDigits(field: 'amka' | 'afm') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const kept = keepDoctorPatientIdInput(field, event.currentTarget.value);
			if (kept === event.currentTarget.value) return;
			event.currentTarget.value = kept;
			form.setValue(field, kept);
		};
	}

	const frame = $derived({
		title: m.doctor_patients_edit_title({}, options),
		backHref: links.card,
		onBack: back,
		backLabel: m.doctor_appointment_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'centred' as const,
		onCancel: leave,
		backTestId: 'doctor-record-back',
		cancelTestId: 'doctor-record-cancel',
		saveTestId: 'doctor-record-save'
	});
</script>

{#snippet personGlyph()}
	<StateGlyph name="people-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- 🔴 Wave 5.1 · screen 73 «Στοιχεία ασθενή» (D-W51-76; `64-switch/sw.js:739-752` `ptEditPage`, the approved field of
     the forms — the title inside the box, the names side by side, U-197.4): 🔴 U-102 a screen of its own, never a dialog,
     on the shared step screen — below 744 over the tabs, 744–1127 one column of 560 in the middle, from 1128 beside the
     list in the card's place (U-167). «Ο ασθενής δεν έχει λογαριασμό eDoctor…», the name and the surname, the mobile, the
     email, ΑΜΚΑ (11) and ΑΦΜ (9) with the server's bounds (U-65.6), each error under its field; «Άκυρο» / «Αποθήκευση». -->
{#if read.state === 'form'}
	<StepScreen
		{...frame}
		subtitle={m.doctor_patients_edit_lead({}, options)}
		cancelLabel={m.booking_change_cancel({}, options)}
		saveLabel={m.booking_change_save({}, options)}
		saveLoading={read.sending}
		onSave={() => read.submit()}
		testId="doctor-record"
	>
		<form
			data-testid="doctor-record-form"
			class="flex flex-col gap-3.5"
			novalidate
			onsubmit={(event) => {
				event.preventDefault();
				read.submit();
			}}
		>
			<div
				role="group"
				aria-label={m.relatives_field_name_group_label({}, options)}
				class="grid grid-cols-2 gap-3"
			>
				<TextField
					field={form.field('firstName')}
					label={m.relatives_field_first_name({}, options)}
					size="lg"
					autocomplete="off"
					maxlength={DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH}
					data-testid="doctor-record-first-name"
				/>
				<TextField
					field={form.field('lastName')}
					label={m.relatives_field_last_name({}, options)}
					size="lg"
					autocomplete="off"
					maxlength={DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH}
					data-testid="doctor-record-last-name"
				/>
			</div>
			<TextField
				field={form.field('phone')}
				label={m.doctor_appointment_mobile({}, options)}
				type="tel"
				inputmode="tel"
				autocomplete="off"
				size="lg"
				maxlength={DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH}
				data-testid="doctor-record-phone"
			/>
			<TextField
				field={form.field('email')}
				label={m.relatives_field_email({}, options)}
				type="email"
				inputmode="email"
				autocomplete="off"
				size="lg"
				maxlength={DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH}
				data-testid="doctor-record-email"
			/>
			<TextField
				field={form.field('amka')}
				label={m.relatives_field_amka({}, options)}
				helperText={m.relatives_field_amka_helper({}, options)}
				inputmode="numeric"
				autocomplete="off"
				size="lg"
				oninput={keepDigits('amka')}
				data-testid="doctor-record-amka"
			/>
			<TextField
				field={form.field('afm')}
				label={m.relatives_field_afm({}, options)}
				helperText={m.doctor_patients_edit_afm_help({}, options)}
				inputmode="numeric"
				autocomplete="off"
				size="lg"
				oninput={keepDigits('afm')}
				data-testid="doctor-record-afm"
			/>
		</form>
		{#if read.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-record-failure"
			>
				{read.failure}
			</p>
		{/if}
	</StepScreen>
{:else if read.state === 'closed'}
	<!-- D-W51-67: a record joined to an account no longer changes — its words and ONE way back to its card. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_appointment_back({}, options)}
		onSave={leave}
		testId="doctor-record-closed"
	>
		<NoticeCard
			tone="warm"
			role="alert"
			title={m.doctor_patients_edit_merged({}, options)}
			testId="doctor-record-closed-text"
		/>
	</StepScreen>
{:else}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_patients_title({}, options)}
		onSave={leave}
		bar={false}
		testId="doctor-record-wait"
	>
		{#if read.state === 'missing'}
			<EmptyState
				titleAs="h3"
				title={m.doctor_patients_missing({}, options)}
				icon={personGlyph}
				class="pt-section"
				testId="doctor-record-missing"
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
				testId="doctor-record-failed"
			/>
		{:else}
			<div
				data-testid="doctor-record-loading"
				aria-busy="true"
				aria-label={frame.title}
				class="grid gap-3"
			>
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
				<Skeleton class="h-pane-skeleton w-full rounded-md" />
			</div>
		{/if}
	</StepScreen>
{/if}
