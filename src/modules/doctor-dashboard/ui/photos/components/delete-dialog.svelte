<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getSessionOptional } from '$shared/state/session';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { getToastsOptional } from '$shared/ui/molecules/toast';
	import { Button } from '$shared/ui/primitives/button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import {
		deleteDoctorProfileImage,
		readDoctorPhotoFailure
	} from '$modules/doctor-dashboard/api/images';

	let {
		open = $bindable(false),
		locale,
		imageId,
		promotesNext,
		onDeleted
	}: {
		open?: boolean;
		locale: SupportedLocale;
		/** The photo asked about; `null` while none is. */
		imageId: string | null;
		/** It is the main one and others follow it: the next becomes the main one, and the window says so. */
		promotesNext: boolean;
		/** The server no longer keeps it (deleted now, or already gone): the list drops it. */
		onDeleted: (imageId: string) => void;
	} = $props();

	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const options = $derived({ locale });
	let failure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later, and a second press in between
	// would ask twice.
	let deleting = $state(false);

	const removal = createMutation<void, unknown, string>(() => ({
		networkMode: 'always' as const,
		mutationFn: (id: string) => deleteDoctorProfileImage(id),
		onSettled: () => {
			deleting = false;
		},
		onSuccess: (_answer, id) => {
			open = false;
			onDeleted(id);
			toasts?.show({ message: m.doctor_photos_deleted({}, options) });
		},
		onError: (error, id) => {
			const reason = readDoctorPhotoFailure(error);
			if (reason === 'gone') {
				// Deleted elsewhere in the meantime: the photo is gone, which is what was asked.
				open = false;
				onDeleted(id);
				return;
			}
			// 🔴 U-84: the session ended under the window; it stays for the same photo after the sign-in.
			if (reason === 'session') session?.expire({});
			failure = m.doctor_photos_delete_failed({}, options);
		}
	}));

	function confirm() {
		if (deleting || !imageId) return;
		deleting = true;
		failure = null;
		removal.mutate(imageId);
	}

	function cancel() {
		if (deleting) return;
		failure = null;
		open = false;
	}
</script>

<!-- 🔴 U-206 · D-W52-34 (`64-switch/sw.js` `phSheet` `del`; the deletions of 4.5: `relatives/components/delete-dialog`,
     U-139.3): «Διαγραφή φωτογραφίας;» is ALWAYS asked, in the one small window — from below under 744, in the middle
     from it (the shared `ActionDialog`). Deleting the main one with others after it says «Κύρια γίνεται η επόμενη.».
     Done ⇒ the photo leaves the page and «Η φωτογραφία διαγράφηκε.». Every word a text node (U-65.6). -->
<ActionDialog
	bind:open
	title={m.doctor_photos_delete_title({}, options)}
	closeLabel={m.booking_close({}, options)}
	onDismiss={cancel}
	testId="doctor-photo-delete-dialog"
>
	<p data-testid="doctor-photo-delete-body" class="text-body-md text-muted-foreground">
		{m.doctor_photos_delete_body({}, options)}
		{#if promotesNext}
			{m.doctor_photos_delete_main({}, options)}
		{/if}
	</p>
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="doctor-photo-delete-failure" />
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
			data-testid="doctor-photo-delete-cancel"
		/>
		<Button
			tone="contrast"
			bordered={false}
			hover={false}
			label={m.doctor_photos_delete({}, options)}
			loading={deleting}
			class="flex-1"
			textClass="text-body-lg"
			onclick={confirm}
			data-testid="doctor-photo-delete-confirm"
		/>
	{/snippet}
</ActionDialog>
