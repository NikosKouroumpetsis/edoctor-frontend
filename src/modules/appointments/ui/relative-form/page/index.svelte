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
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import {
		bookingPatientQuery,
		type BookingPatientFacts,
		type BookingRelativeFacts
	} from '$modules/appointments/api/patient';
	import {
		createBookingRelative,
		forgetRelative,
		readBookingRelativeFailure,
		readBookingRelativeInvalidIds,
		readBookingRelativeRefusedFields,
		readRelativeChangeFailure,
		updateRelative,
		type BookingRelativeInput,
		type RelativeFacts,
		type RelativeUpdate
	} from '$modules/appointments/api/relatives';
	import {
		BOOKING_NAME_MAX_LENGTH,
		BOOKING_RELATIVE_EMAIL_MAX_LENGTH,
		BOOKING_RELATIVE_PHONE_MAX_LENGTH
	} from '$modules/appointments/config';
	import {
		bookingGenderOptions,
		bookingRelationshipOptions,
		bookingRelativeForm,
		bookingRelativeIdMessage,
		keepBookingAfmInput,
		keepBookingAmkaInput,
		readBookingRelativePhone,
		relativeChangeFailureMessage,
		relativeFormValues,
		relativePhoneValue,
		toBookingRelativeInput,
		toRelativeUpdate,
		type BookingRelativeFieldName,
		type BookingRelativeValues,
		type RelativeIdField
	} from '$modules/appointments/lib/relatives';
	import { getSessionOptional } from '$shared/state/session';
	import { ChangeFrame } from '$modules/appointments/ui/change-screen';
	import type { RelativeFormProps } from '../types';

	let props: RelativeFormProps = $props();

	/** A new relative, or (screen 55) the change of one on file — the server's own reading of each refusal. */
	type RelativeWrite =
		| { kind: 'create'; patientId: string; input: BookingRelativeInput }
		| { kind: 'update'; patientId: string; relativeId: string; update: RelativeUpdate };

	const client = useQueryClient();
	const session = getSessionOptional();
	const testId = $derived(props.testId ?? 'booking-relative');
	const options = $derived({ locale: props.locale });
	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && (session?.isMember ?? false)
	}));

	// Screen 55: the relative on file when the form opened (its caller keys one form per relative and per save).
	const stored: RelativeFacts | null = untrack(() => props.relative ?? null);
	const initialPhone: PhoneValue = untrack(() =>
		relativePhoneValue(
			stored?.phone ?? null,
			props.splitMobilePhone ?? (() => null),
			DEFAULT_PHONE_DIAL_CODE
		)
	);

	let phone = $state<PhoneValue>({ ...initialPhone });
	let phoneError = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	// 🔴 W8-Σ2: the fields the server refused, marked where they are until they change (its words stay below).
	let refused = $state<BookingRelativeFieldName[]>([]);
	const isRefused = (field: BookingRelativeFieldName) => refused.includes(field);
	const forgive = (field: BookingRelativeFieldName) => {
		if (isRefused(field)) refused = refused.filter((name) => name !== field);
	};

	// 🔴 D-W45-14 (U-168): an ΑΜΚΑ / ΑΦΜ on file is known only by the server's mask, read as the lists hold it NOW (a new
	// relative's arrives with the next read) — the hint under its EMPTY field. «Αφαίρεση» marks it to be taken off at the
	// save (`null`); from then on the field reads as one never given, as the application's.
	let removed = $state<RelativeIdField[]>([]);
	const maskOf = (id: RelativeIdField) =>
		removed.includes(id)
			? null
			: ((id === 'amka' ? props.relative?.amkaMasked : props.relative?.afmMasked) ?? null);

	/** A relative as the booking's lists name it (D-W3-23): the id, the names, the relationship and the gender. */
	const named = (relative: BookingRelativeFacts): BookingRelativeFacts => ({
		relativeId: relative.relativeId,
		firstName: relative.firstName,
		lastName: relative.lastName,
		relationship: relative.relationship,
		gender: relative.gender
	});

	/**
	 * What the lists hold right after a write, before the server is asked again: «Για ποιον…» of the booking and screen
	 * 55's list (a new one whole as it was sent, a changed one as the server answered). 🔴 MAJOR-1 of R1: what is
	 * written by hand wears the sign-out's mark too.
	 */
	function remember(write: RelativeWrite, relative: BookingRelativeFacts, whole: RelativeFacts) {
		client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
		client.setQueryData<BookingPatientFacts | null>(appointmentsQueryKeys.patient(), (old) => {
			if (!old) return old;
			const others = old.relatives.filter((entry) => entry.relativeId !== relative.relativeId);
			return {
				...old,
				relatives:
					write.kind === 'create'
						? [...others, named(relative)]
						: old.relatives.map((entry) =>
								entry.relativeId === relative.relativeId ? named(relative) : entry
							)
			};
		});
		client.setQueryData<RelativeFacts[]>(appointmentsQueryKeys.relatives(write.patientId), (old) =>
			old
				? write.kind === 'create'
					? [...old.filter((entry) => entry.relativeId !== whole.relativeId), whole]
					: old.map((entry) => (entry.relativeId === whole.relativeId ? whole : entry))
				: old
		);
		void client.invalidateQueries({ queryKey: appointmentsQueryKeys.patient() });
		void client.invalidateQueries({ queryKey: appointmentsQueryKeys.relatives(write.patientId) });
	}

	const write = createMutation(() => ({
		// Without a network it fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		// The new one as it was sent (its mobile and email never read back from the answer, review w3-w6 R1 MINOR-1) —
		// 🔴 U-168 / D-W45-14: but NEVER its ΑΜΚΑ / ΑΦΜ: the lists keep no whole number, and the server's masks come with
		// the read that follows. A change as the server keeps it now. `null` for an answer that is none.
		mutationFn: async (request: RelativeWrite) => {
			if (request.kind === 'create') {
				const made = await createBookingRelative(request.patientId, request.input);
				const { firstName, lastName, relationship, gender, phone: mobile, email } = request.input;
				return made
					? {
							named: made,
							whole: {
								relativeId: made.relativeId,
								firstName,
								lastName,
								relationship,
								gender,
								phone: mobile,
								email,
								amkaMasked: null,
								afmMasked: null
							}
						}
					: null;
			}
			const kept = await updateRelative(request.patientId, request.relativeId, request.update);
			return kept ? { named: kept, whole: kept } : null;
		},
		onSuccess: (saved, request) => {
			if (!saved) {
				failure = m.relatives_failure_unknown({}, options);
				return;
			}
			remember(request, saved.named, saved.whole);
			props.onSaved(saved.named);
		},
		onError: (error, request) => {
			const reason =
				request.kind === 'update'
					? readRelativeChangeFailure(error)
					: readBookingRelativeFailure(error);
			// Screen 55: a relative that is not the person's any more (deleted elsewhere) — the caller takes the list.
			if (reason === 'forbidden' && props.onGone) {
				// Review w4-w7 R1 NIT-3: the lists lose them at once (a change names its relative), then are read again.
				if (request.kind === 'update') {
					forgetRelative(client, request.patientId, request.relativeId);
				} else {
					void client.invalidateQueries({ queryKey: appointmentsQueryKeys.patient() });
					void client.invalidateQueries({
						queryKey: appointmentsQueryKeys.relatives(request.patientId)
					});
				}
				props.onGone();
				return;
			}
			// 🔴 U-84: the session ended under the page; what was typed stays for the same person.
			if (reason === 'session') session?.expire({});
			failure = relativeChangeFailureMessage(reason, props.locale);
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
		...(stored ? { initialValues: relativeFormValues(stored) } : {}),
		onSubmit: (values) => {
			const patientId = patientRead.data?.patientId;
			const read = readBookingRelativePhone(
				phone.number,
				props.toMobilePhone(phone.dialCode, phone.number)
			);
			if (stored) {
				const update = toRelativeUpdate(values, read, stored, removed);
				if (!update) return;
				if (!patientId) {
					failure = m.relatives_failure_unknown({}, options);
					return;
				}
				// Nothing differs from what is on file once trimmed: nothing to send.
				if (Object.keys(update).length === 0) {
					props.onSaved(stored);
					return;
				}
				write.mutate({ kind: 'update', patientId, relativeId: stored.relativeId, update });
				return;
			}
			const input = toBookingRelativeInput(values, read);
			if (!input) return;
			if (!patientId) {
				failure = m.relatives_failure_unknown({}, options);
				return;
			}
			write.mutate({ kind: 'create', patientId, input });
		}
	});

	// Screen 55 (record §11.2): a relative's «Αποθήκευση» sleeps until something changes; a new one's never does.
	const changed = $derived(
		form.isDirty ||
			removed.length > 0 ||
			phone.dialCode !== initialPhone.dialCode ||
			phone.number !== initialPhone.number
	);

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

	type MessageOptions = { locale: RelativeFormProps['locale'] };
	// The two numbers' fields, drawn the same way: the label, the helper while none is on file, what the field keeps.
	const idFields = [
		{
			name: 'amka',
			label: (at: MessageOptions) => m.relatives_field_amka({}, at),
			helper: (at: MessageOptions) => m.relatives_field_amka_helper({}, at),
			keep: keepBookingAmkaInput
		},
		{
			name: 'afm',
			label: (at: MessageOptions) => m.relatives_field_afm({}, at),
			helper: (at: MessageOptions) => m.relatives_field_afm_helper({}, at),
			keep: keepBookingAfmInput
		}
	] as const;

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

<!-- Record §3.3 «Νέος συγγενής» (U-102, P-A3 Σ5; P-W4 Σ-27: one form for the booking and screen 52's «Προσθήκη συγγενή»,
     each with its own way back and its own after): the profile's relative form as a screen of its own — the names side
     by side, «Όπως αναγράφεται στην ταυτότητα.», the relationship and the gender, then the optional mobile, email, ΑΜΚΑ
     and ΑΦΜ. 🔴 U-65.6: every field stops at the server's length and the rules are said before the write — one word
     of letters per name (U-121.2), a real date in the ΑΜΚΑ and the check digit of the ΑΦΜ (U-121.3); what a person
     typed shows back only as text. A refused write marks the fields the server refused (W8-Σ2), a refused ΑΜΚΑ or
     ΑΦΜ with its own words (W8 Delta 1, U-121.3); both keep only their digits (A7, Delta 1). A saved relative is
     handed to the caller (`onSaved`), which goes back to «Για ποιον…» with it CHOSEN; «Άκυρο» keeps nobody. Screen 55
     opens the same form on a relative on file: its values first, «Αποθήκευση» asleep until something changes.
     🔴 D-W45-14 (U-168): on a relative on file the ΑΜΚΑ and the ΑΦΜ open EMPTY, the server's mask under each as a hint
     («Έχει δοθεί: •••••••2345»); an empty field is left untouched, a number typed replaces it, «Αφαίρεση» takes it off. -->
<ChangeFrame
	title={stored
		? m.relatives_sheet_edit_title({}, options)
		: m.relatives_sheet_create_title({}, options)}
	backHref={props.backHref}
	onBack={props.onBack}
	saveDisabled={stored !== null && !changed}
	saveLoading={write.isPending}
	onCancel={props.onCancel}
	onSave={save}
	locale={props.locale}
	placement={props.placement}
	besideList={props.besideList}
	footer={props.footer}
	{testId}
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
					data-testid={`${testId}-first-name`}
				/>
				<TextField
					field={form.field('lastName')}
					label={m.relatives_field_last_name({}, options)}
					size="lg"
					autocomplete="off"
					maxlength={BOOKING_NAME_MAX_LENGTH}
					invalid={isRefused('lastName')}
					onChangeText={() => forgive('lastName')}
					data-testid={`${testId}-last-name`}
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
					data-testid={`${testId}-relationship`}
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
					data-testid={`${testId}-gender`}
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
			autocomplete="off"
			inputTestId={`${testId}-phone`}
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
			data-testid={`${testId}-email`}
		/>
		{#each idFields as id (id.name)}
			{@const masked = maskOf(id.name)}
			<div class="flex flex-col items-start">
				<TextField
					field={form.field(id.name)}
					label={id.label(options)}
					helperText={masked ? m.relatives_field_id_given({ masked }, options) : id.helper(options)}
					inputmode="numeric"
					autocomplete="off"
					size="lg"
					invalid={isRefused(id.name)}
					oninput={keepIdDigits(id.name, id.keep)}
					onChangeText={() => forgive(id.name)}
					data-testid={`${testId}-${id.name}`}
				/>
				{#if masked}
					<TextButton
						label={m.relatives_field_id_remove({}, options)}
						tone="danger"
						underline
						textClass="text-body-sm underline-offset-3"
						aria-describedby={`${testId}-${id.name}-given`}
						data-testid={`${testId}-${id.name}-remove`}
						onclick={() => (removed = [...removed, id.name])}
					/>
					<span id={`${testId}-${id.name}-given`} class="sr-only">{id.label(options)}</span>
				{/if}
			</div>
		{/each}
		{#if failure}
			<InlineNotice variant="danger" message={failure} testId={`${testId}-failure`} />
		{/if}
	</div>
</ChangeFrame>
