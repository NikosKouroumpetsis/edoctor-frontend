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
		/** The row's title as the server keeps it: what leaves the page. */
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

<!-- 🔴 U-210 · D-W52-63 (`64-switch/sw.js` `cvSheet`; the deletion of a photo, `photos/components/delete-dialog`, D-W52-34):
     «Διαγραφή από το βιογραφικό;» is ALWAYS asked, in the one small window — from below under 744, in the middle from
     it (the shared `ActionDialog`) — with the row's own title: ««…» φεύγει από τη σελίδα σας.». Every word a text node
     (U-65.6): the title is the doctor's own text and is never drawn as HTML. -->
<ActionDialog
	bind:open
	title={m.doctor_cv_delete_title({}, options)}
	closeLabel={m.booking_close({}, options)}
	onDismiss={cancel}
	testId="doctor-credential-delete-dialog"
>
	<p
		data-testid="doctor-credential-delete-body"
		class="text-body-md wrap-anywhere text-muted-foreground"
	>
		{m.doctor_cv_delete_body({ title }, options)}
	</p>
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="doctor-credential-delete-failure" />
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
			data-testid="doctor-credential-delete-cancel"
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
			data-testid="doctor-credential-delete-confirm"
		/>
	{/snippet}
</ActionDialog>
