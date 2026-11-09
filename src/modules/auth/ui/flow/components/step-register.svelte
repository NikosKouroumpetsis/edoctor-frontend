<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { Button } from '$shared/ui/primitives/button';
	import { Checkbox } from '$shared/ui/primitives/checkbox';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import {
		readIdentityProblems,
		readPasswordProblem,
		type IdentityProblems,
		type PasswordProblem
	} from '$modules/auth/lib/identity';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowButtonClass, flowButtonText, flowHeadClass } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';
	import IdentityFields from './identity-fields.svelte';

	let {
		flow,
		options,
		titleId,
		termsHref,
		privacyHref
	}: {
		flow: AuthFlowState;
		options: { locale: 'el' | 'en' };
		titleId?: string;
		termsHref: ResolvedPathname;
		privacyHref: ResolvedPathname;
	} = $props();

	// The password only for an address (`lib/register`): a phone sign-up never renders a field nobody asked for.
	const hasPassword = $derived(Boolean(flow.identifier && 'email' in flow.identifier));
	// Never kept in the flow's memory: it dies with this step.
	let password = $state('');
	let optedOut = $state(false);
	let problems = $state<IdentityProblems>({});
	let passwordProblem = $state<PasswordProblem | null>(null);

	const passwordError = $derived(
		passwordProblem === 'too-short'
			? m.auth_register_errors_password({}, options)
			: passwordProblem === 'too-weak'
				? m.auth_register_errors_password_strength({}, options)
				: undefined
	);
	const linkClass =
		'font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2';

	/** The form validates everything first: an incomplete one never leaves the step. */
	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		problems = readIdentityProblems(flow.draft);
		passwordProblem = hasPassword ? readPasswordProblem(password) : null;
		if (Object.keys(problems).length > 0 || passwordProblem) return;
		void flow.submitRegistration($state.snapshot(flow.draft), hasPassword ? password : null);
	}
</script>

<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_register_title({}, options)}</FlowTitle>
	<p class="text-center text-body-md text-muted-foreground">
		{m.auth_register_subtitle({}, options)}
	</p>
</div>
<form class="flex flex-col gap-section" onsubmit={onSubmit} novalidate>
	<div class="flex flex-col gap-6">
		<IdentityFields {flow} {options} {problems} />
		{#if hasPassword}
			<PasswordField
				bind:value={password}
				label={m.auth_register_password_label({}, options)}
				showLabel={m.auth_register_password_show({}, options)}
				hideLabel={m.auth_register_password_hide({}, options)}
				revealVariant="text"
				autocomplete="new-password"
				size="lg"
				error={passwordError}
				maxlength={authFieldLimits.password}
				data-testid="auth-new-password"
			/>
		{/if}
	</div>
	<div class="flex flex-col gap-4">
		<p class="text-body-sm text-muted-foreground">
			{m.auth_register_legal_note_lead({}, options)}<b class="font-semibold text-foreground"
				>{m.auth_register_submit({}, options)}</b
			>{m.auth_register_legal_note_after_action({}, options)}<a
				data-slot="auth-legal-link"
				href={termsHref}
				target="_blank"
				rel="noopener"
				class={linkClass}>{m.auth_register_legal_note_terms({}, options)}</a
			>{m.auth_register_legal_note_middle({}, options)}<a
				data-slot="auth-legal-link"
				href={privacyHref}
				target="_blank"
				rel="noopener"
				class={linkClass}>{m.auth_register_legal_note_privacy({}, options)}</a
			>{m.auth_register_legal_note_tail({}, options)}
		</p>
		{#if flow.error}
			<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
		{/if}
		<Button
			type="submit"
			tone="contrast"
			label={m.auth_register_submit({}, options)}
			size="lg"
			bordered={false}
			loading={flow.isRegistering}
			data-testid="auth-register-submit"
			class={flowButtonClass}
			textClass={flowButtonText}
		/>
	</div>
	<div class="flex flex-col gap-4 rounded-lg bg-foreground/6 p-4 text-body-sm">
		<p class="text-muted-foreground">{m.auth_register_marketing_info({}, options)}</p>
		<label class="flex min-h-touch cursor-pointer flex-row items-center gap-3">
			<span class="min-w-0 flex-1">{m.auth_register_marketing_opt_out({}, options)}</span>
			<!-- 🔴 U-129.2: ticked as the register form's prototype (wave 2 `19-login/login.css:275`, `--dark`). -->
			<Checkbox bind:checked={optedOut} tone="secondary" data-testid="auth-marketing-opt-out" />
		</label>
	</div>
</form>
