<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import type { PasswordProblem } from '$modules/auth/lib/identity';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowHeadClass, flowSubtitleClass } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';

	let {
		flow,
		options,
		titleId,
		password = $bindable(''),
		problem
	}: {
		flow: AuthFlowState;
		options: { locale: 'el' | 'en' };
		titleId?: string;
		/** The footer's «Αποθήκευση» reads it: never kept in the flow's memory. */
		password?: string;
		problem: PasswordProblem | null;
	} = $props();

	const passwordError = $derived(
		problem === 'too-short'
			? m.auth_register_errors_password({}, options)
			: problem === 'too-weak'
				? m.auth_register_errors_password_strength({}, options)
				: undefined
	);
</script>

<!-- 3 of 3: one field, the action pinned below. -->
<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_set_password_new_password_title({}, options)}</FlowTitle>
	<p class={flowSubtitleClass}>{m.auth_set_password_new_password_subtitle({}, options)}</p>
</div>
<div class="flex flex-col gap-3">
	<PasswordField
		bind:value={password}
		label={m.auth_set_password_new_password_password_label({}, options)}
		showLabel={m.auth_register_password_show({}, options)}
		hideLabel={m.auth_register_password_hide({}, options)}
		revealVariant="text"
		autocomplete="new-password"
		size="lg"
		error={passwordError}
		maxlength={authFieldLimits.password}
		data-testid="auth-set-password-new"
	/>
	{#if flow.error}
		<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
	{/if}
</div>
