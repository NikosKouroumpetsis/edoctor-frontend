<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import {
		readProviderUnlinkFailure,
		unlinkSignInProvider
	} from '$modules/auth/api/sign-in-methods';
	import { securityActionFailureWords, securityUnlinkWords } from '$modules/auth/lib/security';
	import type { SecurityProviderRow } from '$modules/auth/types';
	import type { Security } from '../hooks/use-security.svelte';

	let {
		open = $bindable(false),
		locale,
		security,
		row,
		onRefused
	}: {
		open?: boolean;
		locale: SupportedLocale;
		security: Security;
		/** The provider the question is about. */
		row: SecurityProviderRow;
		/** 🔴 D-W45-38: the server refused at the press — the row says why, as if it had known. */
		onRefused: () => void;
	} = $props();

	const options = $derived({ locale });
	const words = $derived(securityUnlinkWords(row.provider, options));
	let failure = $state<string | null>(null);
	let pending = $state(false);

	async function confirm() {
		if (pending) return;
		failure = null;
		pending = true;
		try {
			await unlinkSignInProvider(row.provider);
		} catch (error) {
			const kind = readProviderUnlinkFailure(error);
			if (kind === 'refused' || kind === 'gone') {
				// What the row said is stale either way: it is read again. A provider that is linked no more needs no
				// word of failure — it is what was asked for.
				open = false;
				if (kind === 'refused') onRefused();
				await security.readMethods();
			} else if (kind === 'session') {
				// 🔴 U-84: the session ended under the window; it stays for the same person after the sign-in.
				security.sessionEnded();
			} else failure = securityActionFailureWords(kind, options);
			pending = false;
			return;
		}
		const done = words.done;
		open = false;
		try {
			await security.readMethods();
			security.say(done);
		} finally {
			pending = false;
		}
	}

	function cancel() {
		if (pending) return;
		failure = null;
		open = false;
	}
</script>

<!-- «Αποσύνδεση του Google;» (record §5.4, Ε1 Α): the ONE window of the screen — the shared `ActionDialog`, a sheet
     below 744 as every other window — with «Άκυρο» and «Αποσύνδεση». One press is one request; after it the row is
     gone with «Το Google αποσυνδέθηκε.». Every word a text node (U-65.6). -->
<ActionDialog
	bind:open
	title={words.title}
	closeLabel={m.common_close({}, options)}
	onDismiss={cancel}
	testId="security-unlink-dialog"
>
	<p class="text-body-md text-muted-foreground">{words.body}</p>
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="security-unlink-failure" />
		</div>
	{/if}
	{#snippet footer()}
		<Button
			tone="outline"
			hover={false}
			label={m.auth_security_providers_ask_cancel({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			onclick={cancel}
			data-testid="security-unlink-cancel"
		/>
		<Button
			tone="contrast"
			bordered={false}
			hover={false}
			label={m.auth_security_providers_ask_confirm({}, options)}
			loading={pending}
			class="flex-1"
			textClass="text-body-lg"
			onclick={confirm}
			data-testid="security-unlink-confirm"
		/>
	{/snippet}
</ActionDialog>
