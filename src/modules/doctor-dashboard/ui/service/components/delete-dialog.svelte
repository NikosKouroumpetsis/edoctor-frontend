<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';

	let {
		open = $bindable(false),
		locale,
		title,
		deleting,
		failure,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		locale: SupportedLocale;
		/** The service's title: what leaves the page. */
		title: string;
		/** The deletion is on its way: a second press asks nothing. */
		deleting: boolean;
		/** The words of a deletion that did not happen (`null`: none). */
		failure: string | null;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	const options = $derived({ locale });

	function cancel() {
		if (deleting) return;
		open = false;
		onCancel();
	}
</script>

<!-- 🔴 U-212.1 · D-W52-81 (`64-switch/sw.js` `usSheet`; the deletion of a row of the biography, D-W52-63): «Διαγραφή
     υπηρεσίας;» is ALWAYS asked, in the one small window — from below under 744, in the middle from it (the shared
     `ActionDialog`) — with the service's own title: ««…» φεύγει από τη σελίδα σας. Τα ραντεβού που έχουν ήδη κλειστεί
     μένουν όπως είναι.». Every word a text node (U-65.6). -->
<ActionDialog
	bind:open
	title={m.doctor_my_service_delete_title({}, options)}
	closeLabel={m.booking_close({}, options)}
	onDismiss={cancel}
	testId="doctor-service-delete-dialog"
>
	<p
		data-testid="doctor-service-delete-body"
		class="text-body-md wrap-anywhere text-muted-foreground"
	>
		{m.doctor_my_service_delete_body({ title }, options)}
	</p>
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="doctor-service-delete-failure" />
		</div>
	{/if}
	{#snippet footer()}
		<Button
			tone="outline"
			hover={false}
			label={m.doctor_photos_cancel({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			onclick={cancel}
			data-testid="doctor-service-delete-cancel"
		/>
		<Button
			tone="contrast"
			bordered={false}
			hover={false}
			label={m.doctor_photos_delete({}, options)}
			loading={deleting}
			class="flex-1"
			textClass="text-body-lg"
			onclick={onConfirm}
			data-testid="doctor-service-delete-confirm"
		/>
	{/snippet}
</ActionDialog>
