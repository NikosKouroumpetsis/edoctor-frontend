<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { buildBookingServiceOptions } from '$modules/appointments/lib/booking';
	import ChangeFrame from '../components/change-frame.svelte';
	import ChoiceList from '../components/choice-list.svelte';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingServiceProps } from '../types';

	let props: BookingServiceProps = $props();

	const change = useBookingChange(() => props);
	const options = $derived({ locale: props.locale });
	const title = $derived(m.booking_service_title({}, options));
	const services = $derived(buildBookingServiceOptions(props.doctor, props.locale));
	// The pick until «Αποθήκευση» (the prototype's `S.draft`): «Άκυρο» leaves with nothing written.
	let picked = $state<string | null>(untrack(() => props.serviceId ?? null));

	function save() {
		if (!picked) return;
		// Screen 30 checks the hour again for this service's length (record §3.3, `resolveSlotState`).
		change.draft.serviceId = picked;
		change.leave();
	}
</script>

<!-- Record §3.3 «Επιλέξτε υπηρεσία» (U-102, U-103.2): ONE service, a card each, a screen of its own. -->
<ChangeFrame
	{title}
	backHref={change.backHref()}
	onBack={change.back()}
	saveDisabled={!picked}
	onCancel={() => change.leave()}
	onSave={save}
	locale={props.locale}
	testId="booking-service"
>
	<ChoiceList
		label={title}
		choices={services.map((service) => ({
			id: service.id,
			title: service.title,
			description: service.duration,
			trailing: service.fee,
			locked: service.fee === null
		}))}
		value={picked}
		onChange={(id) => (picked = id)}
		lockedLabel={m.doctor_fee_sign_in({}, options)}
		testId="booking-service-options"
	/>
</ChangeFrame>
