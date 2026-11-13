<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { changePassword } from '$modules/auth/api/password-credential';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import { readAccountPasswordFailure } from '$modules/auth/lib/failures';
	import {
		securityCurrentPasswordError,
		securityNewPasswordError,
		securityPasswordFailureWords
	} from '$modules/auth/lib/security';
	import type { Security } from '../hooks/use-security.svelte';
	import { focusFirstInvalid } from '../lib/focus';
	import SaveButton from './save-button.svelte';

	let {
		locale,
		security,
		canForget,
		onForgot
	}: {
		locale: SupportedLocale;
		security: Security;
		/** «Ξέχασα τον κωδικό μου» only where a code can be mailed (a verified sign-in email). */
		canForget: boolean;
		onForgot: () => void;
	} = $props();

	const options = $derived({ locale });
	let root = $state<HTMLFormElement | null>(null);
	// 🔴 U-168: the two passwords live in this open row alone — runes of a form that is gone when the row closes or the
	// change is kept; never a cache, a storage, an address or a log.
	let current = $state('');
	let next = $state('');
	let currentError = $state<string | undefined>(undefined);
	let newError = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	let pending = $state(false);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		failure = null;
		// The page's own checks before any request (record §5.4).
		currentError = securityCurrentPasswordError(current, options);
		newError = securityNewPasswordError(next, options);
		if (currentError || newError) {
			await focusFirstInvalid(root);
			return;
		}
		pending = true;
		try {
			await changePassword(current, next);
		} catch (error) {
			const kind = readAccountPasswordFailure(error);
			const words = securityPasswordFailureWords(kind, options);
			if (kind === 'session') security.sessionEnded();
			else if (kind === 'no-password' || !words) {
				// An account that has no password after all (`404`): what the row said is stale — it closes on what the
				// server holds now, with no word of failure (the application's rule, `w45-a6` Κ5).
				current = '';
				next = '';
				await security.passwordGone();
			} else if (words.field === 'current') currentError = words.message;
			else if (words.field === 'new') newError = words.message;
			else failure = words.message;
			pending = false;
			await focusFirstInvalid(root);
			return;
		}
		current = '';
		next = '';
		try {
			await security.passwordSaved(m.auth_security_messages_password_changed({}, options));
		} finally {
			pending = false;
		}
	}

	function forgot() {
		if (pending) return;
		onForgot();
	}
</script>

<!-- «Κωδικός πρόσβασης» open on the change (record §5.4): «Τρέχων κωδικός πρόσβασης», «Νέος κωδικός πρόσβασης» with
     «Τουλάχιστον 8 χαρακτήρες» under it, «Αποθήκευση» and the link «Ξέχασα τον κωδικό μου». 🔴 A wrong current password is said
     under its field and the person stays signed in (`401 EC412` is no end of the session). What the server says is
     never drawn; one press is one request. -->
<form bind:this={root} novalidate class="flex flex-col gap-4" onsubmit={save}>
	{#if failure}
		<InlineNotice
			variant="danger"
			role="alert"
			message={failure}
			testId="security-password-error"
		/>
	{/if}
	<div class="grid gap-3">
		<PasswordField
			bind:value={current}
			label={m.auth_security_password_current({}, options)}
			showLabel={m.auth_register_password_show({}, options)}
			hideLabel={m.auth_register_password_hide({}, options)}
			revealVariant="text"
			autocomplete="current-password"
			size="lg"
			error={currentError}
			maxlength={authFieldLimits.password}
			oninput={() => (currentError = undefined)}
			data-testid="security-current-password-input"
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
			label={m.auth_security_password_save({}, options)}
			loading={pending}
			testId="security-password-save"
		/>
		{#if canForget}
			<TextButton
				label={m.auth_security_password_forgot({}, options)}
				tone="foreground"
				underline
				textClass="text-body-sm underline-offset-3"
				data-testid="security-forgot"
				onclick={forgot}
			/>
		{/if}
	</div>
</form>
