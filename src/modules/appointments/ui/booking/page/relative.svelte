<script lang="ts">
	import { untrack } from 'svelte';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { createForm } from '$shared/lib/form';
	import { personalQueryMeta } from '$shared/query';
	import { FormField } from '$shared/ui/molecules/form-field';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import type { PhoneValue } from '$shared/ui/molecules/phone-field/countries';
	import { DEFAULT_PHONE_DIAL_CODE } from '$shared/ui/molecules/phone-field/countries';
	import { PhoneFieldInline } from '$shared/ui/molecules/phone-field-inline';
	import { Select } from '$shared/ui/molecules/select';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import { bookingPatientQuery, type BookingPatientFacts } from '$modules/appointments/api/patient';
	import {
		createBookingRelative,
		readBookingRelativeFailure,
		readBookingRelativeInvalidIds,
		readBookingRelativeRefusedFields,
		type BookingRelativeInput
	} from '$modules/appointments/api/relatives';
	import {
		BOOKING_NAME_MAX_LENGTH,
		BOOKING_RELATIVE_EMAIL_MAX_LENGTH,
		BOOKING_RELATIVE_PHONE_MAX_LENGTH
	} from '$modules/appointments/config';
	import {
		bookingGenderOptions,
		bookingRelationshipOptions,
		bookingRelativeFailureMessage,
		bookingRelativeForm,
		bookingRelativeIdMessage,
		keepBookingAfmInput,
		keepBookingAmkaInput,
		readBookingRelativePhone,
		toBookingRelativeInput,
		type BookingRelativeFieldName,
		type BookingRelativeValues
	} from '$modules/appointments/lib/booking';
	import ChangeFrame from '../components/change-frame.svelte';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingMobileProps } from '../types';

	let props: BookingMobileProps = $props();

	const client = useQueryClient();
	const change = useBookingChange(() => props, { member: true });
	const options = $derived({ locale: props.locale });
	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && change.signedIn
	}));

	let phone = $state<PhoneValue>({ dialCode: DEFAULT_PHONE_DIAL_CODE, number: '' });
	let phoneError = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	// 🔴 W8-Σ2: the fields the server refused, marked where they are until they change (its words stay below).
	let refused = $state<BookingRelativeFieldName[]>([]);
	const isRefused = (field: BookingRelativeFieldName) => refused.includes(field);
	const forgive = (field: BookingRelativeFieldName) => {
		if (isRefused(field)) refused = refused.filter((name) => name !== field);
	};

	const write = createMutation(() => ({
		// Without a network it fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: ({ patientId, input }: { patientId: string; input: BookingRelativeInput }) =>
			createBookingRelative(patientId, input),
		onSuccess: (relative) => {
			if (!relative) {
				failure = m.relatives_failure_unknown({}, options);
				return;
			}
			// The list of «Για ποιον…» names the new relative at once; the read asks the server again behind it. 🔴 MAJOR-1
			// of R1: what is written by hand wears the sign-out's mark too.
			client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
			client.setQueryData<BookingPatientFacts | null>(appointmentsQueryKeys.patient(), (old) =>
				old ? { ...old, relatives: [...old.relatives, relative] } : old
			);
			void client.invalidateQueries({ queryKey: appointmentsQueryKeys.patient() });
			change.draft.pendingVisitor = relative.relativeId;
			change.toast(
				m.booking_for_whom_relative_added(
					{ name: `${relative.firstName} ${relative.lastName}` },
					options
				)
			);
			change.leave(1, 'for-whom');
		},
		onError: (error) => {
			const reason = readBookingRelativeFailure(error);
			// 🔴 U-84: the session ended under the page; what was typed stays for the same person.
			if (reason === 'session') change.session?.expire({});
			failure = bookingRelativeFailureMessage(reason, props.locale);
			refused = readBookingRelativeRefusedFields(error);
			if (isRefused('phone')) phoneError = m.relatives_errors_phone({}, options);
			// W8 Delta 1 / 🔴 U-121.3: a refused ΑΜΚΑ or ΑΦΜ says its own words under it — its length's, or, the length
			// right, «δεν είναι έγκυρο» (the ΑΜΚΑ's date, the ΑΦΜ's check digit), as the form does before the write.
			const invalid = readBookingRelativeInvalidIds(error);
			for (const id of ['amka', 'afm'] as const) {
				if (isRefused(id))
					form.errors[id] = bookingRelativeIdMessage(id, invalid.includes(id), props.locale);
			}
		}
	}));

	const form = createForm<BookingRelativeValues>({
		...untrack(() => bookingRelativeForm(props.locale)),
		onSubmit: (values) => {
			const patientId = patientRead.data?.patientId;
			const read = readBookingRelativePhone(
				phone.number,
				props.toMobilePhone(phone.dialCode, phone.number)
			);
			const input = toBookingRelativeInput(values, read);
			if (!input) return;
			if (!patientId) {
				failure = m.relatives_failure_unknown({}, options);
				return;
			}
			write.mutate({ patientId, input });
		}
	});

	/**
	 * A7 / W8 Delta 1 · the ΑΜΚΑ and the ΑΦΜ show only what they keep (their digits, 11 / 9 at most): a letter typed or
	 * pasted leaves nothing behind. No `maxlength` (Delta 2): it would cut «123 456 783» before its spaces go.
	 */
	function keepIdDigits(field: 'amka' | 'afm', keep: (value: string) => string) {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const kept = keep(event.currentTarget.value);
			if (kept === event.currentTarget.value) return;
			event.currentTarget.value = kept;
			form.setValue(field, kept);
		};
	}

	function save() {
		if (write.isPending) return;
		failure = null;
		refused = [];
		const read = readBookingRelativePhone(
			phone.number,
			props.toMobilePhone(phone.dialCode, phone.number)
		);
		phoneError = read.kind === 'invalid' ? m.relatives_errors_phone({}, options) : undefined;
		void form.handleSubmit();
	}
</script>

<!-- Record §3.3 «Νέος συγγενής» (U-102, P-A3 Σ5): the profile's relative form as a screen of its own — the names side
     by side, «Όπως αναγράφεται στην ταυτότητα.», the relationship and the gender, then the optional mobile, email, ΑΜΚΑ
     and ΑΦΜ. 🔴 U-65.6: every field stops at the server's length and the rules are said before the write — one word
     of letters per name (U-121.2), a real date in the ΑΜΚΑ and the check digit of the ΑΦΜ (U-121.3); what a person
     typed shows back only as text. A refused write marks the fields the server refused (W8-Σ2), a refused ΑΜΚΑ or
     ΑΦΜ with its own words (W8 Delta 1, U-121.3); both keep only their digits (A7, Delta 1). A saved relative goes
     back to «Για ποιον…» CHOSEN; «Άκυρο» keeps nobody. -->
<ChangeFrame
	title={m.relatives_sheet_create_title({}, options)}
	backHref={change.backHref('for-whom')}
	onBack={change.back(1, 'for-whom')}
	saveLoading={write.isPending}
	onCancel={() => change.leave(1, 'for-whom')}
	onSave={save}
	locale={props.locale}
	testId="booking-relative"
>
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
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
					maxlength={BOOKING_NAME_MAX_LENGTH}
					invalid={isRefused('firstName')}
					onChangeText={() => forgive('firstName')}
					data-testid="booking-relative-first-name"
				/>
				<TextField
					field={form.field('lastName')}
					label={m.relatives_field_last_name({}, options)}
					size="lg"
					autocomplete="off"
					maxlength={BOOKING_NAME_MAX_LENGTH}
					invalid={isRefused('lastName')}
					onChangeText={() => forgive('lastName')}
					data-testid="booking-relative-last-name"
				/>
			</div>
			{#if !form.errors.firstName && !form.errors.lastName}
				<p class="px-0.5 text-label-lg text-muted-foreground">
					{m.relatives_field_name_helper({}, options)}
				</p>
			{/if}
		</div>
		<FormField label={m.relatives_field_relationship({}, options)} error={form.errors.relationship}>
			{#snippet children(control)}
				<Select
					id={control.id}
					aria-describedby={control['aria-describedby']}
					invalid={Boolean(form.errors.relationship) || isRefused('relationship')}
					options={bookingRelationshipOptions(props.locale)}
					value={form.values.relationship || undefined}
					onChange={(value) => {
						forgive('relationship');
						form.setValue('relationship', value);
					}}
					placeholder={m.relatives_field_relationship_placeholder({}, options)}
					size="lg"
					data-testid="booking-relative-relationship"
				/>
			{/snippet}
		</FormField>
		<FormField label={m.relatives_field_gender({}, options)} error={form.errors.gender}>
			{#snippet children(control)}
				<Select
					id={control.id}
					aria-describedby={control['aria-describedby']}
					invalid={Boolean(form.errors.gender) || isRefused('gender')}
					options={bookingGenderOptions(props.locale)}
					value={form.values.gender || undefined}
					onChange={(value) => {
						forgive('gender');
						form.setValue('gender', value);
					}}
					placeholder={m.relatives_field_gender_placeholder({}, options)}
					size="lg"
					data-testid="booking-relative-gender"
				/>
			{/snippet}
		</FormField>
		<PhoneFieldInline
			bind:value={phone}
			maxlength={BOOKING_RELATIVE_PHONE_MAX_LENGTH}
			onChange={() => {
				phoneError = undefined;
				forgive('phone');
			}}
			label={m.relatives_field_phone({}, options)}
			countryAccessibilityLabel={m.relatives_field_country_label({}, options)}
			searchPlaceholder={m.relatives_field_country_search_placeholder({}, options)}
			helperText={m.relatives_field_phone_helper({}, options)}
			error={phoneError}
			size="lg"
			inputTestId="booking-relative-phone"
		/>
		<TextField
			field={form.field('email')}
			label={m.relatives_field_email({}, options)}
			type="email"
			inputmode="email"
			autocomplete="off"
			size="lg"
			maxlength={BOOKING_RELATIVE_EMAIL_MAX_LENGTH}
			invalid={isRefused('email')}
			onChangeText={() => forgive('email')}
			data-testid="booking-relative-email"
		/>
		<TextField
			field={form.field('amka')}
			label={m.relatives_field_amka({}, options)}
			helperText={m.relatives_field_amka_helper({}, options)}
			inputmode="numeric"
			autocomplete="off"
			size="lg"
			invalid={isRefused('amka')}
			oninput={keepIdDigits('amka', keepBookingAmkaInput)}
			onChangeText={() => forgive('amka')}
			data-testid="booking-relative-amka"
		/>
		<TextField
			field={form.field('afm')}
			label={m.relatives_field_afm({}, options)}
			helperText={m.relatives_field_afm_helper({}, options)}
			inputmode="numeric"
			autocomplete="off"
			size="lg"
			invalid={isRefused('afm')}
			oninput={keepIdDigits('afm', keepBookingAfmInput)}
			onChangeText={() => forgive('afm')}
			data-testid="booking-relative-afm"
		/>
		{#if failure}
			<InlineNotice variant="danger" message={failure} testId="booking-relative-failure" />
		{/if}
	</div>
</ChangeFrame>
