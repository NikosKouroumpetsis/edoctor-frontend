<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { formatVisitLength, VISIT_LENGTHS } from '$shared/lib/visit-length';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoteField } from '$shared/ui/molecules/note-field';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import {
		DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH,
		DOCTOR_SERVICE_PRICE_DIGITS,
		DOCTOR_SERVICE_SUBTITLE_MAX_LENGTH,
		DOCTOR_SERVICE_YEARS_DIGITS
	} from '$modules/doctor-dashboard/config';
	import { doctorProfileSectionLabel } from '$modules/doctor-dashboard/lib/profile';
	import DeleteDialog from '../components/delete-dialog.svelte';
	import { useDoctorService } from '../hooks';
	import type { DoctorServiceProps } from '../types';

	let { locale, subject, servicesHref, onClose }: DoctorServiceProps = $props();

	const options = $derived({ locale });
	const durationHeadId = useId(undefined, 'doctor-service-duration');
	const textsHeadId = useId(undefined, 'doctor-service-texts');
	// «Διαγραφή υπηρεσίας» was pressed: the window that asks is open.
	let asking = $state(false);
	let fields = $state<HTMLDivElement | null>(null);
	const service = useDoctorService({
		locale: () => locale,
		subject: () => subject,
		onDone: () => {
			asking = false;
			onClose();
		}
	});
	const values = $derived(service.values);
	const fresh = $derived(subject.view === 'new');
	const durations = $derived(
		VISIT_LENGTHS.map((minutes) => ({
			value: String(minutes),
			label: formatVisitLength(minutes, locale)
		}))
	);

	/** A field of digits shows only what it keeps: a letter typed or pasted leaves nothing. */
	const showKept =
		(field: 'price' | 'years') => (event: Event & { currentTarget: HTMLInputElement }) => {
			if (event.currentTarget.value !== values[field]) event.currentTarget.value = values[field];
		};

	/** 🔴 U-214.1: the button fills both fields; the focus goes to the first of them, so the doctor goes on there. */
	async function suggest() {
		if (!service.suggest()) return;
		await tick();
		fields?.querySelector<HTMLInputElement>('[data-testid="doctor-service-subtitle"]')?.focus();
	}

	const frame = $derived({
		title: service.title || doctorProfileSectionLabel('services', locale),
		backHref: servicesHref,
		// «‹» is a link to screen 83: a plain press follows it.
		onBack: () => {},
		backLabel: m.doctor_my_profile_back({}, options),
		backIcon: 'chevron-back' as const,
		placement: 'menu' as const,
		// 🔴 U-217: from 950 the menu stands beside the page — no «‹» there.
		besideList: true,
		onCancel: onClose,
		backTestId: 'doctor-service-back'
	});
</script>

<!-- 🔴 Wave 5.2 · screen 83, ONE service (U-212, U-214, U-217.3, D-W52-82; `64-switch/sw.js` `usItemPage`): a PAGE, never
     a window (U-102) — below 950 alone with «‹» to screen 83 (pushed over the tabs below 744), from 950 in the middle of
     the right column of 77, no «‹» (U-217). The catalogue's name (it never changes), «Τιμή (€)» 1–9999 — a new one with
     NO price (U-217.3) — the length as rows of D-W52-10's list, «Κείμενα για τους ασθενείς»: the doctor's own subtitle
     (≤ 120) and description (≤ 1000, with its count), both «(προαιρετικό)», EMPTY until the doctor writes or presses
     «Συμπλήρωση με την πρόταση του eDoctor» (U-214.4: never filled by itself), and the years (≤ those of the licence).
     A stored one has «Διαγραφή υπηρεσίας» (always asked) — the only one the page's sentence instead (D-W52-74).
     «Άκυρο · Αποθήκευση»: nothing is saved before the server says so. No choice of a language (U-207.3). 🔴 U-65.6:
     the server's bounds on every field, every word a text node. -->
{#if service.state === 'ready'}
	<StepScreen
		{...frame}
		subtitle={fresh
			? m.doctor_my_service_lead_new({}, options)
			: m.doctor_my_service_lead_saved({}, options)}
		cancelLabel={m.doctor_photos_cancel({}, options)}
		saveLabel={m.doctor_photos_save({}, options)}
		saveLoading={service.saving}
		onSave={() => service.submit()}
		testId="doctor-service"
		cancelTestId="doctor-service-cancel"
		saveTestId="doctor-service-save"
	>
		<form
			data-testid="doctor-service-form"
			class="flex flex-col"
			novalidate
			onsubmit={(event) => {
				event.preventDefault();
				service.submit();
			}}
		>
			<TextField
				bind:value={() => values.price, (typed) => service.setDigits('price', typed)}
				label={m.doctor_my_service_price({}, options)}
				placeholder={m.doctor_my_service_price_placeholder({}, options)}
				helperText={m.doctor_my_service_price_help({}, options)}
				error={service.errors.price}
				size="lg"
				inputmode="numeric"
				autocomplete="off"
				maxlength={DOCTOR_SERVICE_PRICE_DIGITS}
				oninput={showKept('price')}
				data-testid="doctor-service-price"
			/>

			<h3 id={durationHeadId} class="mt-6 mb-3 text-body-lg font-semibold text-foreground">
				{m.doctor_my_service_duration({}, options)}
			</h3>
			<RadioRows
				labelledby={durationHeadId}
				value={values.durationInMinutes === null ? null : String(values.durationInMinutes)}
				options={durations}
				onChange={(minutes) => service.setDuration(Number(minutes))}
				frame="always"
				testId="doctor-service-durations"
			/>

			<h3 id={textsHeadId} class="mt-6 text-body-lg font-semibold text-foreground">
				{m.doctor_my_service_texts({}, options)}
			</h3>
			<p class="mt-1 text-body-md text-muted-foreground">
				{m.doctor_my_service_texts_lead({}, options)}
			</p>
			{#if service.offer}
				<div class="mt-3 flex flex-col gap-1.5" data-testid="doctor-service-suggestion">
					<Button
						label={m.doctor_my_service_suggest({}, options)}
						tone="outline"
						radius="full"
						hover={false}
						onclick={() => void suggest()}
						data-testid="doctor-service-suggest"
						class="w-full"
					>
						{#snippet leading()}
							<Ionicon name="sparkles-outline" class="icon-md" />
						{/snippet}
					</Button>
					{#if service.offer.replaces}
						<p
							data-testid="doctor-service-suggest-replaces"
							class="text-body-sm text-muted-foreground"
						>
							{m.doctor_my_service_suggest_replaces({}, options)}
						</p>
					{/if}
				</div>
			{/if}
			<div bind:this={fields} class="mt-3 flex flex-col gap-3.5">
				<TextField
					bind:value={() => values.subtitle, (typed) => service.setText('subtitle', typed)}
					label={m.doctor_my_service_subtitle({}, options)}
					placeholder={m.doctor_my_service_subtitle_placeholder({}, options)}
					size="lg"
					autocomplete="off"
					maxlength={DOCTOR_SERVICE_SUBTITLE_MAX_LENGTH}
					data-testid="doctor-service-subtitle"
				/>
				<NoteField
					label={m.doctor_my_service_description({}, options)}
					labelAs="h3"
					placeholder={m.doctor_my_service_description_placeholder({}, options)}
					value={values.description}
					counter={m.doctor_my_service_count(
						{ count: values.description.length, limit: DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH },
						options
					)}
					error={null}
					maxLength={DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH}
					height="review"
					onInput={(typed) => service.setText('description', typed)}
					testId="doctor-service-description"
				/>
				<TextField
					bind:value={() => values.years, (typed) => service.setDigits('years', typed)}
					label={m.doctor_my_service_years({}, options)}
					error={service.errors.years}
					size="lg"
					inputmode="numeric"
					autocomplete="off"
					maxlength={DOCTOR_SERVICE_YEARS_DIGITS}
					oninput={showKept('years')}
					data-testid="doctor-service-years"
				/>
			</div>
		</form>
		{#if !fresh}
			{#if service.last}
				<p data-testid="doctor-service-last" class="mt-4 text-body-sm text-muted-foreground">
					{m.doctor_my_service_last({}, options)}
				</p>
			{:else}
				<button
					type="button"
					data-testid="doctor-service-delete"
					class="mt-4 inline-flex min-h-touch min-w-touch items-center text-body-md font-semibold text-accent transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
					onclick={() => (asking = true)}
				>
					{m.doctor_my_service_delete({}, options)}
				</button>
			{/if}
		{/if}
		{#if service.failure}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-danger-text"
				data-testid="doctor-service-failure"
			>
				{service.failure}
			</p>
		{/if}
	</StepScreen>
	{#if !fresh && !service.last}
		<DeleteDialog
			bind:open={asking}
			{locale}
			title={service.title}
			deleting={service.deleting}
			failure={service.deleteFailure}
			onConfirm={() => service.remove()}
			onCancel={() => service.clearDeleteFailure()}
		/>
	{/if}
{:else if service.state === 'loading'}
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		bar={false}
		testId="doctor-service-wait"
	>
		<div aria-busy="true" aria-label={frame.title} class="grid gap-3">
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	</StepScreen>
{:else}
	<!-- Nothing to write here: the read failed («Δοκιμάστε ξανά»), the service is no longer there, or the new one is
	     one the doctor already offers — the page's words and ONE way back to screen 83. -->
	<StepScreen
		{...frame}
		cancelLabel={null}
		saveLabel={m.doctor_my_profile_back({}, options)}
		onSave={onClose}
		testId="doctor-service-closed"
		saveTestId="doctor-service-leave"
	>
		{#if service.state === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_dashboard_load_error({}, options)}
				actionLabel={m.doctor_dashboard_retry({}, options)}
				onAction={() => service.retry()}
				testId="doctor-service-error"
				actionTestId="doctor-service-retry"
			/>
		{:else}
			<NoticeCard
				tone="warm"
				role="alert"
				title={service.state === 'owned'
					? m.doctor_my_service_error_owned({}, options)
					: m.doctor_my_service_missing({}, options)}
				testId={`doctor-service-${service.state}`}
			/>
		{/if}
	</StepScreen>
{/if}
