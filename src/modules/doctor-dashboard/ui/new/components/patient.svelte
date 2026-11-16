<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { PersonRows, type PersonRow } from '$shared/ui/molecules/person-rows';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import {
		DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH,
		DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH,
		DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH,
		DOCTOR_PATIENT_SEARCH_MAX_LENGTH
	} from '$modules/doctor-dashboard/config';
	import {
		buildDoctorPatientRow,
		buildDoctorPickedCard,
		doctorPatientKeyOf,
		doctorSamePhoneName
	} from '$modules/doctor-dashboard/lib/new';
	import type { DoctorNewRead } from '../hooks';

	let { read, locale }: { read: DoctorNewRead; locale: SupportedLocale } = $props();

	const options = $derived({ locale });
	const NEW_ROW = 'new';
	const listId = $props.id();

	const newRow = $derived<PersonRow>({
		id: NEW_ROW,
		name: m.doctor_new_patient_new({}, options),
		lines: [m.doctor_new_patient_new_line({}, options)],
		glyph: 'add'
	});
	const rows = $derived<PersonRow[]>([
		...read.results.map((patient) => buildDoctorPatientRow(patient, locale)),
		newRow
	]);
	const card = $derived(read.picked ? buildDoctorPickedCard(read.picked, locale) : null);
	const same = $derived(doctorSamePhoneName(read.matches));
	const firstMatch = $derived(read.matches[0] ?? null);

	const onRow = (id: string) => (id === NEW_ROW ? read.startNew() : read.choose(id));
</script>

{#snippet initials(name: string)}
	<Avatar size="lg" class="size-row" aria-hidden="true">
		<AvatarFallback class="text-body-lg text-foreground">{visitInitials(name)}</AvatarFallback>
	</Avatar>
{/snippet}

<!-- 🔴 D-W51-70 (`sw.js:613-632`, `sw.css:228-254`; the form of U-197.4 / U-198.3: the title inside the box, the names
     side by side): the search of «οι ασθενείς μου» with the most recent / the results and «Νέος ασθενής» last; «Νέος
     ασθενής» (U-197.3: name, surname, mobile, the email optional) with «ίδιο κινητό» as a warning that never blocks; the
     chosen one as a card with «Αλλαγή». U-65.6: every word a text node, every field within the server's bounds. -->
{#if read.step === 'picked'}
	{#if card && read.picked}
		{@const name = card.name}
		{#snippet leading()}
			{@render initials(name)}
		{/snippet}
		{#snippet change()}
			<button
				type="button"
				data-testid="doctor-new-change"
				class="group -my-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-end outline-none"
				onclick={() => read.backToSearch()}
			>
				<span
					class="inline-flex h-control-xs items-center rounded-sm bg-chip px-3 text-label-md font-medium whitespace-nowrap text-foreground group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
					>{m.booking_summary_change({}, options)}</span
				>
			</button>
		{/snippet}
		<ContextCard
			{leading}
			label={card.label}
			title={card.name}
			lines={card.lines}
			trailing={change}
			class="mb-0"
			testId="doctor-new-picked"
		/>
	{:else}
		<div data-testid="doctor-new-naming" aria-busy="true" class="grid gap-2">
			<Skeleton class="h-placeholder-lg w-full rounded-md" />
		</div>
	{/if}
{:else if read.step === 'new'}
	{@const form = read.form}
	<div data-testid="doctor-new-form" class="flex flex-col gap-3.5">
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
				data-testid="doctor-new-first-name"
			/>
			<TextField
				field={form.field('lastName')}
				label={m.relatives_field_last_name({}, options)}
				size="lg"
				autocomplete="off"
				maxlength={DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH}
				data-testid="doctor-new-last-name"
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
			data-testid="doctor-new-phone"
		/>
		{#if same && firstMatch}
			{#snippet pickSame()}
				<Button
					tone="outline"
					hover={false}
					label={m.doctor_new_same_person({}, options)}
					textClass="text-body-sm"
					class="mt-3"
					onclick={() => read.choose(doctorPatientKeyOf(firstMatch.key))}
					data-testid="doctor-new-same-person"
				/>
			{/snippet}
			<NoticeCard
				tone="warm"
				title={m.doctor_new_same_phone({ name: same }, options)}
				lines={[m.doctor_new_same_phone_line({}, options)]}
				action={pickSame}
				testId="doctor-new-same-phone"
			/>
		{/if}
		<TextField
			field={form.field('email')}
			label={m.relatives_field_email({}, options)}
			type="email"
			inputmode="email"
			autocomplete="off"
			size="lg"
			maxlength={DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH}
			helperText={m.doctor_new_email_help({}, options)}
			data-testid="doctor-new-email"
		/>
		<p class="mt-2 text-label-lg font-normal text-muted-foreground" data-testid="doctor-new-note">
			{m.doctor_new_no_account_note({}, options)}
		</p>
		<div>
			<TextButton
				label={m.doctor_new_back_to_search({}, options)}
				tone="foreground"
				underline
				textClass="text-body-sm font-semibold"
				class="min-h-touch"
				onclick={() => read.backToSearch()}
				data-testid="doctor-new-back-to-search"
			/>
		</div>
	</div>
{:else}
	<div data-testid="doctor-new-search">
		<SearchField
			value={read.query}
			shape="pill"
			placeholder={m.doctor_new_search_placeholder({}, options)}
			aria-label={m.doctor_new_search_label({}, options)}
			maxlength={DOCTOR_PATIENT_SEARCH_MAX_LENGTH}
			autocomplete="off"
			autocapitalize="off"
			spellcheck={false}
			onChangeText={(next) => read.type(next)}
			onClear={() => read.type('')}
			testId="doctor-new-search-field"
		/>
		{#if read.missing}
			<p
				role="alert"
				class="mt-3 text-label-lg font-medium text-foreground"
				data-testid="doctor-new-missing"
			>
				{m.doctor_new_patient_missing({}, options)}
			</p>
		{/if}
		<p id={listId} class="mt-4.5 mb-2 text-label-lg font-normal text-muted-foreground">
			{read.words ? m.doctor_new_results({}, options) : m.doctor_new_recent({}, options)}
		</p>
		{#if read.searchState === 'failed'}
			<InlineNotice
				variant="danger"
				message={m.doctor_new_search_failed({}, options)}
				actionLabel={m.doctor_availability_retry({}, options)}
				onAction={() => read.retrySearch()}
				testId="doctor-new-search-failed"
			/>
		{:else if read.searchState === 'loading'}
			<div data-testid="doctor-new-search-loading" aria-busy="true" class="grid gap-2">
				<Skeleton class="h-placeholder-lg w-full rounded-md" />
			</div>
		{:else}
			{#if read.words && read.results.length === 0}
				<p class="mb-3 text-body-sm text-foreground" data-testid="doctor-new-none">
					{m.doctor_new_none({ text: read.words }, options)}
				</p>
			{/if}
			<PersonRows {rows} onSelect={onRow} labelledby={listId} testId="doctor-new-patients" />
		{/if}
	</div>
{/if}
