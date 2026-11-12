<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getSessionOptional } from '$shared/state/session';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import {
		deleteRelative,
		forgetRelative,
		readRelativeChangeFailure
	} from '$modules/appointments/api/relatives';
	import {
		relativeChangeFailureMessage,
		relativeSubject
	} from '$modules/appointments/lib/relatives';

	let {
		open = $bindable(false),
		locale,
		patientId,
		relativeId,
		name,
		gender,
		upcomingLine,
		upcomingPending,
		upcomingUnchecked,
		onDeleted,
		onGone
	}: {
		open?: boolean;
		locale: SupportedLocale;
		patientId: string | null;
		relativeId: string;
		/** The relative's names, said with the article of their gender (U-139.5). */
		name: string;
		gender: string;
		/** «Έχει 1 επερχόμενο ραντεβού, που θα γίνει κανονικά: …» (U-139.4, D-W4-21), `null` for none or not yet read. */
		upcomingLine: string | null;
		/** 🔴 D-W4-59.1: the read of the upcoming is on its way — «Διαγραφή» sleeps until it answers or fails. */
		upcomingPending: boolean;
		/** 🔴 D-W4-59.3: the read told nothing (it failed, or did not end): the window says so, the deletion is allowed. */
		upcomingUnchecked: boolean;
		onDeleted: () => void;
		/** The server keeps the relative no more (deleted elsewhere): the list says so. */
		onGone: () => void;
	} = $props();

	const client = useQueryClient();
	const session = getSessionOptional();
	const options = $derived({ locale });
	let failure = $state<string | null>(null);

	/** The lists without the deleted relative, before the server is asked again (the sign-out's mark on them too). */
	const forget = (id: string, person: string) => forgetRelative(client, person, id);

	const removal = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ person, id }: { person: string; id: string }) => deleteRelative(person, id),
		onSuccess: (_answer, { person, id }) => {
			open = false;
			onDeleted();
			forget(id, person);
		},
		onError: (error, { person, id }) => {
			const reason = readRelativeChangeFailure(error);
			if (reason === 'forbidden') {
				open = false;
				onGone();
				forget(id, person);
				return;
			}
			// 🔴 U-84: the session ended under the window; it stays for the same person after the sign-in.
			if (reason === 'session') session?.expire({});
			failure = relativeChangeFailureMessage(reason, locale);
		}
	}));

	function confirm() {
		if (removal.isPending || upcomingPending) return;
		failure = null;
		if (!patientId) {
			failure = m.relatives_failure_unknown({}, options);
			return;
		}
		removal.mutate({ person: patientId, id: relativeId });
	}

	function cancel() {
		if (removal.isPending) return;
		failure = null;
		open = false;
	}
</script>

<!-- 🔴 U-139.3 (the owner's Ε2 = Β): «Διαγραφή συγγενή;» is asked in a WINDOW over the screen — from below under 744, in
     the middle from it (the shared `ActionDialog`, D-W4-58) — the one window of screens 50–55. U-139.4: the relative's
     upcoming visit is said and the deletion stays allowed; the booked appointments keep their own copy of the person.
     🔴 D-W4-59: the line never lies — «Διαγραφή» sleeps until the read answers, and a read that told nothing says so.
     Every word a text node (U-65.6). -->
<ActionDialog
	bind:open
	title={m.relatives_delete_confirm_title({}, options)}
	closeLabel={m.booking_close({}, options)}
	onDismiss={cancel}
	testId="relatives-delete-dialog"
>
	<p class="text-body-md text-muted-foreground">
		{m.relatives_delete_confirm_body({ subject: relativeSubject(name, gender, locale) }, options)}
	</p>
	{#if upcomingLine}
		<p data-testid="relatives-delete-upcoming" class="mt-2 text-body-md text-muted-foreground">
			{upcomingLine}
		</p>
	{:else if upcomingUnchecked}
		<p data-testid="relatives-delete-unchecked" class="mt-2 text-body-md text-muted-foreground">
			{m.relatives_delete_confirm_unchecked({}, options)}
		</p>
	{/if}
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="relatives-delete-failure" />
		</div>
	{/if}
	{#snippet footer()}
		<Button
			tone="outline"
			hover={false}
			label={m.relatives_delete_confirm_cancel({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			onclick={cancel}
			data-testid="relatives-delete-cancel"
		/>
		<Button
			tone="contrast"
			bordered={false}
			hover={false}
			label={m.relatives_delete_confirm_confirm({}, options)}
			loading={removal.isPending}
			disabled={upcomingPending}
			class="flex-1"
			textClass="text-body-lg"
			onclick={confirm}
			data-testid="relatives-delete-confirm"
		/>
	{/snippet}
</ActionDialog>
