<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import type { PhoneValue } from '$shared/ui/molecules/phone-field/countries';
	import { DEFAULT_PHONE_DIAL_CODE } from '$shared/ui/molecules/phone-field/countries';
	import { PhoneField } from '$shared/ui/molecules/phone-field';
	import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
	import { readBookingPhoneFailure, startBookingPhone } from '$modules/appointments/api/phone';
	import { BOOKING_RELATIVE_PHONE_MAX_LENGTH } from '$modules/appointments/config';
	import {
		bookingPhoneFailureMessage,
		bookingResendDeadline,
		maskBookingMobile
	} from '$modules/appointments/lib/booking';
	import ChangeFrame from '../components/change-frame.svelte';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingMobileProps } from '../types';

	let props: BookingMobileProps = $props();

	const client = useQueryClient();
	const change = useBookingChange(() => props, { member: true });
	const options = $derived({ locale: props.locale });

	// 🔴 U-65.6 / D-47: the number lives only in this screen's field; once a code goes, only its mask stays (the draft).
	let phone = $state<PhoneValue>({ dialCode: DEFAULT_PHONE_DIAL_CODE, number: '' });
	let error = $state<string | undefined>(undefined);

	const start = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: (mobilePhone: string) => startBookingPhone(mobilePhone),
		onSuccess: (answer) => {
			if (answer.alreadyVerified) {
				// No code was sent: the number is the account's already (the application's), so straight back to screen 30.
				void client.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
				change.toast(m.booking_details_phone_already_verified({}, options));
				change.leave();
				return;
			}
			change.draft.phoneDestination = maskBookingMobile(phone.dialCode, phone.number);
			change.draft.phoneResendAt = bookingResendDeadline(Date.now());
			change.open('details/code');
		},
		onError: (failure) => {
			const reason = readBookingPhoneFailure(failure);
			// 🔴 U-84: the session ended under the page; the number stays typed for the same person.
			if (reason === 'session') change.session?.expire({});
			error = bookingPhoneFailureMessage(reason, props.locale) ?? undefined;
		}
	}));

	function save() {
		if (start.isPending) return;
		const mobilePhone = props.toMobilePhone(phone.dialCode, phone.number);
		if (!mobilePhone) {
			error = m.booking_details_phone_error({}, options);
			return;
		}
		error = undefined;
		start.mutate(mobilePhone);
	}
</script>

<!-- Record §3.3 «Το κινητό σας» (D-04 / D-05, asked once): the country over the number as ONE control, «Θα σας στείλουμε
     έναν κωδικό επιβεβαίωσης.», and «Συνέχεια», fully round. A number of another account (409), the limits (429) and a
     lock are said under the field; the code screen comes as one more step. -->
<ChangeFrame
	title={m.booking_details_phone_title({}, options)}
	subtitle={m.booking_details_phone_subtitle({}, options)}
	backHref={change.backHref()}
	onBack={change.back()}
	saveLabel={m.booking_details_submit({}, options)}
	saveLoading={start.isPending}
	onCancel={() => change.leave()}
	onSave={save}
	locale={props.locale}
	testId="booking-phone"
>
	<PhoneField
		bind:value={phone}
		maxlength={BOOKING_RELATIVE_PHONE_MAX_LENGTH}
		onChange={() => (error = undefined)}
		label={m.booking_details_phone_label({}, options)}
		countryLabel={m.booking_details_phone_country({}, options)}
		countryAccessibilityLabel={m.booking_details_phone_country({}, options)}
		searchPlaceholder={m.booking_details_phone_country_search({}, options)}
		helperText={m.booking_details_phone_helper({}, options)}
		{error}
		size="lg"
	/>
</ChangeFrame>
