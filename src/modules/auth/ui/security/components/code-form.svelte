<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { setPassword } from '$modules/auth/api/password-credential';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import { readAccountPasswordFailure } from '$modules/auth/lib/failures';
	import {
		cleanSecurityCode,
		securityCodeError,
		securityNewPasswordError,
		securityPasswordFailureWords
	} from '$modules/auth/lib/security';
	import type { PasswordCode } from '../hooks/use-password-code.svelte';
	import type { Security } from '../hooks/use-security.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import SaveButton from './save-button.svelte';

	let {
		locale,
		security,
		sender,
		hadPassword
	}: {
		locale: SupportedLocale;
		security: Security;
		/** The code's own sends (the first, «Αποστολή ξανά»), kept by the row. */
		sender: PasswordCode;
		/** The account had a password when the row opened («Ξέχασα τον κωδικό μου»): the word after is «άλλαξε». */
		hadPassword: boolean;
	} = $props();

	const options = $derived({ locale });
	let root = $state<HTMLFormElement | null>(null);
	// 🔴 U-168 / U-65.6: the mailed code and the new password live in this open row alone — gone when it closes or the
	// password is kept; never a cache, a storage, an address or a log.
	let code = $state('');
	let next = $state('');
	let codeError = $state<string | undefined>(undefined);
	let newError = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	let pending = $state(false);

	// The field shows only what it keeps (its digits, six at most): a letter typed or pasted leaves nothing behind.
	function showKept(event: Event & { currentTarget: HTMLInputElement }) {
		if (event.currentTarget.value !== code) event.currentTarget.value = code;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		failure = null;
		sender.clear();
		// The page's own checks before any request (record §5.4).
		codeError = securityCodeError(code, options);
		newError = securityNewPasswordError(next, options);
		if (codeError || newError) {
			await focusFirstInvalid(root);
			return;
		}
		pending = true;
		try {
			await setPassword(code, next);
		} catch (error) {
			const kind = readAccountPasswordFailure(error);
			// (The set knows no «no password yet»: an answer read so is simply one that did not go through.)
			const words = securityPasswordFailureWords(
				kind === 'no-password' ? 'unknown' : kind,
				options
			);
			if (!words) security.sessionEnded();
			else if (words.field === 'code') {
				// A wrong or a spent code is typed again; one that expired may be asked for anew at once.
				code = '';
				codeError = words.message;
				if (kind === 'stale-code') sender.spent();
			} else if (words.field === 'new') newError = words.message;
			else failure = words.message;
			pending = false;
			await focusFirstInvalid(root);
			return;
		}
		code = '';
		next = '';
		sender.spent();
		try {
			await security.passwordSaved(
				hadPassword
					? m.auth_security_messages_password_changed({}, options)
					: m.auth_security_messages_password_set({}, options)
			);
		} finally {
			pending = false;
		}
	}

	function resend() {
		if (pending) return;
		failure = null;
		void sender.resend();
	}
</script>

<!-- «Κωδικός πρόσβασης» open on the mailed code (record §5.4: «Ορισμός», «Ξέχασα τον κωδικό μου»): «Κωδικός
     επιβεβαίωσης» (🔴 U-65.6: digits only, six), «Νέος κωδικός πρόσβασης» with «Τουλάχιστον 8 χαρακτήρες» under it,
     «Αποθήκευση κωδικού» and «Αποστολή ξανά». The SAME two calls as the sign-in's «ορισμός κωδικού» (`initSetPassword`,
     `setPassword`). 🔴 A wrong code is said under its field and the person stays signed in (`401 EC011` is no end of the
     session). What the server says is never drawn; one press is one request. -->
<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={save}>
	{#if failure ?? sender.failure}
		<InlineNotice
			variant="danger"
			role="alert"
			message={failure ?? sender.failure ?? ''}
			testId="security-password-error"
		/>
	{/if}
	<div class="grid gap-3">
		<TextField
			label={m.auth_security_password_code({}, options)}
			bind:value={() => code, (typed) => (code = cleanSecurityCode(typed))}
			error={codeError}
			onChangeText={() => (codeError = undefined)}
			size="lg"
			inputmode="numeric"
			autocomplete="one-time-code"
			autocapitalize="off"
			spellcheck={false}
			oninput={showKept}
			data-testid="security-code-input"
		/>
		<PasswordField
			bind:value={next}
			label={m.auth_security_password_new({}, options)}
			helperText={m.auth_security_password_new_hint({}, options)}
			showLabel={m.auth_register_password_show({}, options)}
			hideLabel={m.auth_register_password_hide({}, options)}
			revealVariant="text"
			autocomplete="new-password"
			size="lg"
			error={newError}
			maxlength={authFieldLimits.password}
			oninput={() => (newError = undefined)}
			data-testid="security-new-password-input"
		/>
	</div>
	<div class="flex flex-row flex-wrap items-center gap-x-5 gap-y-2">
		<SaveButton
			label={m.auth_security_password_save_code({}, options)}
			loading={pending}
			testId="security-password-save"
		/>
		<TextButton
			label={m.auth_security_password_resend({}, options)}
			tone="foreground"
			underline
			textClass="text-body-sm underline-offset-3"
			data-testid="security-code-resend"
			onclick={resend}
		/>
	</div>
	{#if sender.wait}
		<p data-testid="security-code-resend-wait" role="alert" class="text-body-sm text-danger-text">
			{sender.wait}
		</p>
	{/if}
</form>
