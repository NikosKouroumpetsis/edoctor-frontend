<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowButtonClass, flowButtonText } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';
	import AppleContinue from './apple-continue.svelte';
	import GoogleContinue from './google-continue.svelte';

	let {
		flow,
		options,
		titleId
	}: { flow: AuthFlowState; options: { locale: 'el' | 'en' }; titleId?: string } = $props();

	const known = $derived(flow.known);
	// The door this browser last came through leads, the code the way around it: Google and Apple only by redirect.
	const provider = $derived(
		known?.lastMethod === 'google' || known?.lastMethod === 'apple' ? known.lastMethod : null
	);
	const initial = $derived(known?.firstName.slice(0, 1).toUpperCase() ?? '');
</script>

{#if known}
	<div class="flex flex-col items-center gap-5 text-center">
		<span
			aria-hidden="true"
			class="grid size-avatar-2xl place-items-center rounded-full bg-primary/10 text-display-xs font-semibold text-primary-text"
			>{initial}</span
		>
		<FlowTitle {flow} id={titleId}>
			{m.auth_welcome_back_title({ firstName: known.firstName }, options)}
		</FlowTitle>
		<p class="flex flex-row items-center justify-center gap-2 text-title-xs wrap-anywhere">
			<Ionicon name={known.channel === 'email' ? 'mail-outline' : 'call-outline'} class="icon-md" />
			<span data-testid="auth-known-identifier">{known.maskedIdentifier}</span>
		</p>
	</div>
	<div class="flex flex-col gap-5">
		<p class="text-center text-body-md text-muted-foreground">
			{m.auth_welcome_back_info({}, options)}
		</p>
		{#if flow.error}
			<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
		{/if}
		{#if provider}
			{#if provider === 'google'}
				<GoogleContinue
					label={m.auth_welcome_back_google_cta({}, options)}
					busy={flow.busyProvider === 'google'}
					data-testid="auth-welcome-google"
					onclick={() => flow.startProvider('google')}
				/>
			{:else}
				<AppleContinue
					label={m.auth_prompt_apple_action({}, options)}
					busy={flow.busyProvider === 'apple'}
					data-testid="auth-welcome-apple"
					onclick={() => flow.startProvider('apple')}
				/>
			{/if}
			<div class="flex justify-center">
				<TextButton
					label={m.auth_welcome_back_otp_fallback({}, options)}
					tone="primary"
					textClass="text-body-lg"
					data-testid="auth-welcome-code"
					onclick={() => flow.signInKnown()}
				/>
			</div>
		{:else}
			<Button
				label={m.auth_welcome_back_cta({}, options)}
				size="lg"
				bordered={false}
				loading={flow.isStarting}
				data-testid="auth-welcome-sign-in"
				class={flowButtonClass}
				textClass={flowButtonText}
				onclick={() => flow.signInKnown()}
			/>
		{/if}
		<div class="flex justify-center">
			<TextButton
				label={m.auth_welcome_back_not_you({}, options)}
				tone="foreground"
				textClass="text-body-lg"
				data-testid="auth-welcome-not-you"
				onclick={() => flow.useAnotherAccount()}
			/>
		</div>
	</div>
{/if}
