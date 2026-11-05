<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { PasswordField } from '$shared/ui/molecules/password-field';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import { maskIdentifier } from '$modules/auth/lib/masks';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import {
		flowButtonClass,
		flowButtonText,
		flowHeadClass,
		flowSubtitleClass
	} from '../lib/classes';
	import FlowTitle from './flow-title.svelte';

	let {
		flow,
		options,
		titleId
	}: { flow: AuthFlowState; options: { locale: 'el' | 'en' }; titleId?: string } = $props();

	let password = $state('');
	const destination = $derived(flow.identifier ? maskIdentifier(flow.identifier) : '');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!password) return;
		// A refused password is never kept (the application empties it).
		if (!(await flow.submitPassword(password))) password = '';
	}
</script>

<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_password_title({}, options)}</FlowTitle>
	<p class={flowSubtitleClass}>{m.auth_password_subtitle({ destination }, options)}</p>
</div>
<form class="flex flex-col gap-3" onsubmit={onSubmit} novalidate>
	<PasswordField
		bind:value={password}
		label={m.auth_password_password_label({}, options)}
		showLabel={m.auth_register_password_show({}, options)}
		hideLabel={m.auth_register_password_hide({}, options)}
		size="lg"
		invalid={Boolean(flow.error)}
		maxlength={authFieldLimits.password}
		data-testid="auth-password"
	/>
	{#if flow.error}
		<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
	{/if}
	<Button
		type="submit"
		label={m.auth_password_submit({}, options)}
		size="lg"
		bordered={false}
		disabled={!password}
		loading={flow.isLoggingIn}
		data-testid="auth-password-submit"
		class={flowButtonClass}
		textClass={flowButtonText}
	/>
	<div class="flex justify-center">
		<TextButton
			label={m.auth_password_forgot({}, options)}
			tone="foreground"
			underline
			textClass="text-body-md"
			data-testid="auth-password-forgot"
			onclick={() => flow.forgotPassword()}
		/>
	</div>
</form>
