<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import type { ChangeFrameProps } from '../types';

	let {
		title,
		saveLabel,
		cancelLabel,
		locale,
		placement = 'page',
		...rest
	}: ChangeFrameProps = $props();

	const options = $derived({ locale });
</script>

<!-- 🔴 U-102 (record §3.3, §8.2): the patient's «Αλλαγή» screens on the shared step screen (D-W51-50) — its words
     («Πίσω», «Άκυρο», «Αποθήκευση», the booking's tab title) and the test ids every patient screen and its tests know. -->
<StepScreen
	{...rest}
	{title}
	{placement}
	pageTitle={m.booking_meta_title({ title }, options)}
	backLabel={m.booking_back({}, options)}
	saveLabel={saveLabel ?? m.booking_change_save({}, options)}
	cancelLabel={cancelLabel === null ? null : (cancelLabel ?? m.booking_change_cancel({}, options))}
	backTestId="booking-back"
	cancelTestId="booking-cancel"
	saveTestId="booking-save"
/>
