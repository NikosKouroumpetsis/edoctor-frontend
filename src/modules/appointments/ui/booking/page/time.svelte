<script lang="ts">
	import { bookingPath, hintsOf } from '$modules/appointments/lib/booking';
	import ChangeFrame from '../components/change-frame.svelte';
	import { useBookingEntry } from '../hooks/use-entry.svelte';
	import { isPlainClick, useBookingNavigation } from '../hooks/use-navigation.svelte';
	import type { BookingTimeProps } from '../types';

	let props: BookingTimeProps = $props();

	const draft = useBookingEntry(() => props.slug);
	const navigation = useBookingNavigation();
	// Screen 30 with the draft's hour and service: where «Άκυρο» and «Αποθήκευση» return without a page behind.
	const reviewHref = () =>
		props.href(bookingPath(props.slug, null, hintsOf(draft.slot, props.serviceId ?? null)));
	// Review w3-w2 R1 MINOR-2: with no hour yet (the 307 of a booking address that named none), screen 30 would send the
	// reader straight back here: «Άκυρο» and «←» go to the doctor instead.
	const backHref = () => (draft.slot ? reviewHref() : props.profileHref);

	function back(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		navigation.leave(backHref());
	}

	function save() {
		if (!props.canSave || !props.staged) return;
		draft.chooseSlot(props.staged, props.serviceId ?? null);
		navigation.leave(reviewHref());
	}
</script>

<!-- Record §3.3 «Διαθεσιμότητα» (U-102): the profile's own picker (the doctor module's, composed by the screen) on a
     screen of its own; «Αποθήκευση» writes the hour into the draft and goes back to screen 30, locked while the hour
     chosen here is not offered. -->
<ChangeFrame
	title={props.title}
	backHref={backHref()}
	onBack={back}
	saveDisabled={!props.canSave}
	onCancel={() => navigation.leave(backHref())}
	onSave={save}
	locale={props.locale}
	testId="booking-time"
>
	{@render props.picker()}
</ChangeFrame>
