<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { CheckRows } from '$shared/ui/molecules/check-rows';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH,
		DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH
	} from '$modules/doctor-dashboard/config';
	import { doctorCredentialTexts, doctorCvLimitText } from '$modules/doctor-dashboard/lib/cv';
	import DeleteDialog from '../components/delete-dialog.svelte';
	import { useDoctorCredential } from '../hooks';
	import type { DoctorCredentialProps } from '../types';

	let { locale, kind, id, cvHref, onClose }: DoctorCredentialProps = $props();

	const options = $derived({ locale });
	const texts = $derived(doctorCredentialTexts(kind, locale));
	const fromMessageId = useId(undefined, 'doctor-credential-from-message');
	const toMessageId = useId(undefined, 'doctor-credential-to-message');
	// «Διαγραφή» was pressed: the window that asks is open.
	let asking = $state(false);
	const credential = useDoctorCredential({
		locale: () => locale,
		kind: () => kind,
		id: () => id,
		onDone: () => {
			asking = false;
			onClose();
		}
	});
	const form = $derived(credential.form);
	const CURRENT = 'current';

	// A year's field shows only what it keeps (its digits, four at most): a letter typed or pasted leaves nothing.
	const showKept =
		(field: 'startYear' | 'endYear') => (event: Event & { currentTarget: HTMLInputElement }) => {
			if (event.currentTarget.value !== form.values[field]) {
				event.currentTarget.value = form.values[field];
			}
		};

	const frame = $derived({
		title: texts.heading,
		backHref: cvHref,
		// «‹» is a link to screen 81: a plain press follows it.
		onBack: () => {},
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'menu' as const,
		// 🔴 U-217: from 950 the menu stands beside the page — no «‹» there.
		besideList: true,
		onCancel: onClose,
		backTestId: 'doctor-credential-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 81, ONE row of the biography (U-210, D-W52-63; `64-switch/sw.js` `cvItemPage`): a PAGE, never a
     window (U-102) — below 950 alone with «‹» to screen 81, from 950 in the middle of the right column of 77, no «‹»
     (U-217). The title of its group, «Φαίνεται στο βιογραφικό της σελίδας σας μόλις το αποθηκεύσετε.», the title and
     the organization (optional), «Από» and «Έως» as years (optional) with the tick «Σε εξέλιξη» / «Εργάζομαι εδώ
     σήμερα» under them — under it «Έως» reads «Σήμερα»; a conference has ONE «Έτος» and no tick. A row that exists has
     «Διαγραφή» under its fields, always asked. «Άκυρο · Αποθήκευση»: nothing is saved before the server says so. No
     choice of a language (U-207.3). 🔴 U-65.6: the server's bounds on every field, every word a text node. -->
{#if credential.state === 'ready'}
	<StepScreen
		{...frame}
		subtitle={m.doctor_cv_item_lead({}, options)}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_photos_save({}, options)}
		saveLoading={credential.saving}
		onSave={() => credential.submit()}
		testId="doctor-credential"
		cancelTestId="doctor-credential-cancel"
		saveTestId="doctor-credential-save"
	>
		<form
			data-testid="doctor-credential-form"
			class="flex flex-col gap-3.5"
			novalidate
			onsubmit={(event) => {
				event.preventDefault();
				credential.submit();
			}}
		>
			<TextField
				field={form.field('title')}
				label={texts.title}
				placeholder={texts.titleExample}
				size="lg"
				autocomplete="off"
				maxlength={DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH}
				onChangeText={() => credential.changed()}
				data-testid="doctor-credential-title"
			/>
			<TextField
				field={form.field('organization')}
				label={texts.organization}
				placeholder={texts.organizationExample}
				size="lg"
				autocomplete="off"
				maxlength={DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH}
				onChangeText={() => credential.changed()}
				data-testid="doctor-credential-organization"
			/>
			{#if texts.current === null}
				<TextField
					bind:value={
						() => form.values.startYear, (typed) => credential.setYear('startYear', typed)
					}
					label={m.doctor_cv_field_year({}, options)}
					placeholder={m.doctor_cv_example_year({ year: credential.lastYear - 2 }, options)}
					error={form.errors.startYear}
					size="lg"
					inputmode="numeric"
					autocomplete="off"
					maxlength={4}
					oninput={showKept('startYear')}
					data-testid="doctor-credential-year"
				/>
			{:else}
				<div>
					<div class="grid grid-cols-2 gap-3">
						<TextField
							bind:value={
								() => form.values.startYear, (typed) => credential.setYear('startYear', typed)
							}
							label={m.doctor_cv_field_from({}, options)}
							placeholder={m.doctor_cv_year_placeholder({}, options)}
							invalid={Boolean(form.errors.startYear)}
							aria-describedby={form.errors.startYear ? fromMessageId : undefined}
							size="lg"
							inputmode="numeric"
							autocomplete="off"
							maxlength={4}
							oninput={showKept('startYear')}
							data-testid="doctor-credential-from"
						/>
						{#if credential.current}
							<!-- «Σήμερα»: the end is not written — the field says so and takes neither a press nor the keyboard. -->
							<TextField
								value={m.doctor_cv_today({}, options)}
								label={m.doctor_cv_field_to_today({}, options)}
								size="lg"
								readonly
								tabindex={-1}
								inputClass="text-muted-foreground"
								data-testid="doctor-credential-to-today"
							/>
						{:else}
							<TextField
								bind:value={
									() => form.values.endYear, (typed) => credential.setYear('endYear', typed)
								}
								label={m.doctor_cv_field_to({}, options)}
								placeholder={m.doctor_cv_year_placeholder({}, options)}
								invalid={Boolean(form.errors.endYear)}
								aria-describedby={form.errors.endYear ? toMessageId : undefined}
								size="lg"
								inputmode="numeric"
								autocomplete="off"
								maxlength={4}
								oninput={showKept('endYear')}
								data-testid="doctor-credential-to"
							/>
						{/if}
					</div>
					<!-- The words of the years' rules stand under BOTH fields, the row's whole width (`81-cv/shots/m-err.png`). -->
					<FieldMessage
						id={fromMessageId}
						error={form.errors.startYear}
						data-testid="doctor-credential-from-error"
					/>
					<FieldMessage
						id={toMessageId}
						error={credential.current ? undefined : form.errors.endYear}
						data-testid="doctor-credential-to-error"
					/>
				</div>
				<CheckRows
					label={texts.current}
					values={credential.current ? [CURRENT] : []}
					options={[{ value: CURRENT, label: texts.current }]}
					onToggle={() => credential.toggleCurrent()}
					testId="doctor-credential-current"
				/>
			{/if}
		</form>
		{#if id !== null}
			<button
				type="button"
				data-testid="doctor-credential-delete"
				class="mt-4 inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-accent transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
				onclick={() => (asking = true)}
			>
				{m.doctor_photos_delete({}, options)}
			</button>
		{/if}
		{#if credential.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-credential-failure"
			>
				{credential.failure}
			</p>
		{/if}
	</StepScreen>
	<DeleteDialog
		bind:open={asking}
		{locale}
		title={credential.savedTitle}
		deleting={credential.deleting}
		failure={credential.deleteFailure}
		onConfirm={() => credential.remove()}
		onCancel={() => credential.clearDeleteFailure()}
	/>
{:else if credential.state === 'loading'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		bar={false}
		testId="doctor-credential-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{:else}
	<!-- Nothing to write here: the read failed («Δοκιμάστε ξανά»), the row is no longer there, or the group already
	     holds its twenty («Έως 20.») — the page's words and ONE way back to screen 81. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		testId="doctor-credential-closed"
		saveTestId="doctor-credential-leave"
	>
		{#if credential.state === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_dashboard_load_error({}, options)}
				actionLabel={m.doctor_dashboard_retry({}, options)}
				onAction={() => credential.retry()}
				testId="doctor-credential-error"
				actionTestId="doctor-credential-retry"
			/>
		{:else}
			<NoticeCard
				tone="warm"
				role="alert"
				title={credential.state === 'full'
					? doctorCvLimitText(locale)
					: m.doctor_cv_missing({}, options)}
				testId={`doctor-credential-${credential.state}`}
			/>
		{/if}
	</StepScreen>
{/if}
