<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { BookingRelativeFacts } from '$modules/appointments/api/patient';
	import { relativeSubject } from '$modules/appointments/lib/relatives';
	import RelativeForm from '$modules/appointments/ui/relative-form';
	import { useBookingChange } from '../hooks/use-change.svelte';
	import type { BookingMobileProps } from '../types';

	let props: BookingMobileProps = $props();

	const change = useBookingChange(() => props, { member: true });
	const options = $derived({ locale: props.locale });

	function saved(relative: BookingRelativeFacts) {
		change.draft.pendingVisitor = relative.relativeId;
		// 🔴 U-139.5 (P-W4 §6.5, Σ-15): «Η Άννα Παππά προστέθηκε και επιλέχθηκε.» — the article of the gender the server
		// keeps for the new relative; the neutral «Ο/Η» when it names none.
		change.toast(
			m.booking_for_whom_relative_added(
				{
					subject: relativeSubject(
						`${relative.firstName} ${relative.lastName}`,
						relative.gender,
						props.locale
					)
				},
				options
			)
		);
		change.leave(1, 'for-whom');
	}
</script>

<!-- Record §3.3 «Νέος συγγενής» of the booking (U-102): the ONE relative form (P-W4 Σ-27) on the booking's page — «←» and
     «Άκυρο» back to «Για ποιον…», a saved relative CHOSEN there with the toast over the page's bar. -->
<RelativeForm
	locale={props.locale}
	toMobilePhone={props.toMobilePhone}
	backHref={change.backHref('for-whom')}
	onBack={change.back(1, 'for-whom')}
	onCancel={() => change.leave(1, 'for-whom')}
	onSaved={saved}
/>
