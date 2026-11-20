<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';

	let {
		open,
		locale,
		deleting,
		failure,
		onConfirm,
		onCancel
	}: {
		/** The window is open (a reply's «Διαγραφή» was pressed). */
		open: boolean;
		locale: SupportedLocale;
		/** The deletion is on its way: a second press asks nothing, and the window stays. */
		deleting: boolean;
		/** The words of a deletion that did not happen (`null`: none). */
		failure: string | null;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	const options = $derived({ locale });
</script>

<!-- 🔴 D-W52-86 / 92 (U-219.1 Ε2 Α; `64-switch/sw.js` `rvSheet`; the 83's way, D-W52-81): «Διαγραφή απάντησης;» is ALWAYS
     asked, in the one small window — from below under 744, in the middle from it (the shared `ActionDialog`): «Η απάντηση
     φεύγει από τη σελίδα σας. Μπορείτε να γράψετε νέα όποτε θέλετε.». Every word a text node (U-65.6). -->
<ActionDialog
	{open}
	title={m.doctor_my_review_reply_delete_title({}, options)}
	closeLabel={m.booking_close({}, options)}
	onDismiss={onCancel}
	testId="doctor-review-delete-dialog"
>
	<p data-testid="doctor-review-delete-body" class="text-body-md text-muted-foreground">
		{m.doctor_my_review_reply_delete_body({}, options)}
	</p>
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="doctor-review-delete-failure" />
		</div>
	{/if}
	{#snippet footer()}
		<Button
			tone="outline"
			hover={false}
			label={m.doctor_photos_cancel({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			onclick={onCancel}
			data-testid="doctor-review-delete-cancel"
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
			data-testid="doctor-review-delete-confirm"
		/>
	{/snippet}
</ActionDialog>
