<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { EditableRow } from '$shared/ui/molecules/editable-row';
	import { securityPasswordHelp } from '$modules/auth/lib/security';
	import type { SecurityPasswordMode } from '$modules/auth/types';
	import { usePasswordCode } from '../hooks/use-password-code.svelte';
	import type { Security } from '../hooks/use-security.svelte';
	import ChangeForm from './change-form.svelte';
	import CodeForm from './code-form.svelte';
	import Part from './part.svelte';
	import ReadFailure from './read-failure.svelte';
	import Row from './row.svelte';
	import Skeleton from './skeleton.svelte';

	let { locale, security }: { locale: SupportedLocale; security: Security } = $props();

	const options = $derived({ locale });
	const row = $derived(security.passwordRow);

	// What the open row shows, and whether the account had a password then: both held from the moment it opened, so a
	// read that comes back under an open row never swaps its form.
	let mode = $state<SecurityPasswordMode>('change');
	let hadPassword = $state(false);
	let box = $state<HTMLDivElement | null>(null);

	const sender = usePasswordCode({
		locale: () => locale,
		onSent: (again) =>
			security.say(
				again
					? m.auth_security_messages_resent({}, options)
					: m.auth_security_messages_code_sent({}, options)
			),
		onSessionEnded: () => security.sessionEnded(),
		onUnavailable: () => void security.readMethods()
	});

	// A row that can open no more (its read came back otherwise) leaves nothing faded behind it.
	$effect(() => {
		if (security.passwordOpen && !row?.opens) security.passwordOpen = false;
	});

	function setOpen(open: boolean) {
		if (open && row?.opens) {
			mode = row.opens;
			hadPassword = row.set;
			sender.clear();
			// «Ορισμός»: the row opens on the code, and the code is mailed with the same press.
			if (mode === 'code') void sender.open();
		}
		security.passwordOpen = open;
	}

	// «Ξέχασα τον κωδικό μου»: the same row goes on with the mailed code, and the focus into its first field.
	async function forgot() {
		mode = 'code';
		void sender.open();
		await tick();
		box?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled])')?.focus();
	}
</script>

<!-- Part 1 «Σύνδεση» (record §5.4): the row «Κωδικός πρόσβασης», edited IN its place at every width — «Έχει οριστεί ·
     Αλλαγή» opens the change, «Δεν έχει οριστεί · Ορισμός» the mailed code; 🔴 D-W45-39: an account with no sign-in
     email has no «Ορισμός» and reads what to do instead. «Ακύρωση», Escape and a kept change all drop the open form,
     and with it whatever was typed (U-168). -->
<Part title={m.auth_security_sign_in_title({}, options)} testId="security-part-password">
	{#if security.methodsView === 'loading'}
		<Skeleton
			label={m.auth_security_password_title({}, options)}
			testId="security-password-loading"
		/>
	{:else if security.methodsView === 'failed' || !row}
		<ReadFailure {locale} part="password" onRetry={() => security.retryMethods()} />
	{:else if row.opens && row.actionLabel}
		<EditableRow
			title={m.auth_security_password_title({}, options)}
			titleAs="h4"
			value={row.value}
			help={security.passwordOpen
				? securityPasswordHelp(mode, security.maskedEmail, options)
				: undefined}
			actionLabel={row.actionLabel}
			closeLabel={m.auth_security_cancel({}, options)}
			open={security.passwordOpen}
			onOpenChange={setOpen}
			testId="security-row-password"
		>
			<div bind:this={box}>
				{#if mode === 'code'}
					<CodeForm {locale} {security} {sender} {hadPassword} />
				{:else}
					<ChangeForm {locale} {security} canForget={row.canForget} onForgot={forgot} />
				{/if}
			</div>
		</EditableRow>
	{:else}
		<Row
			title={m.auth_security_password_title({}, options)}
			value={row.value}
			testId="security-row-password"
		>
			{#if row.hint}
				<p
					data-testid="security-password-hint"
					class="mt-2 max-w-text text-body-sm text-foreground"
				>
					{row.hint}
				</p>
			{/if}
		</Row>
	{/if}
</Part>
