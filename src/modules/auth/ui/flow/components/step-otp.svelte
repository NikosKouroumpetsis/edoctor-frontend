<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { maskIdentifier } from '$modules/auth/lib/masks';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowHeadClass, flowSubtitleClass } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';
	import CodeField from './code-field.svelte';

	let {
		flow,
		options,
		titleId
	}: { flow: AuthFlowState; options: { locale: 'el' | 'en' }; titleId?: string } = $props();

	const destination = $derived(flow.identifier ? maskIdentifier(flow.identifier) : '');
	// 🔴 Record §6.7: the sentence says «διεύθυνση» only for an address.
	const subtitle = $derived(
		flow.recentCode
			? m.auth_otp_recent_code_subtitle({ destination }, options)
			: flow.identifier && 'mobilePhone' in flow.identifier
				? m.auth_otp_subtitle_phone({ destination }, options)
				: m.auth_otp_subtitle({ destination }, options)
	);
</script>

<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_otp_title({}, options)}</FlowTitle>
	<p class={flowSubtitleClass} data-testid="auth-otp-subtitle">{subtitle}</p>
</div>
<div class="flex flex-col gap-3">
	<CodeField
		bind:value={flow.code}
		label={m.auth_otp_code_label({}, options)}
		invalid={Boolean(flow.error)}
	/>
	{#if flow.error}
		<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
	{/if}
</div>
<div class="flex flex-col gap-2">
	<p class="flex flex-row flex-wrap items-center justify-center gap-x-2 text-body-md">
		<span>{m.auth_otp_resend_prompt({}, options)}</span>
		<TextButton
			label={m.auth_otp_resend({}, options)}
			tone="foreground"
			underline
			textClass="text-body-md"
			data-testid="auth-resend"
			onclick={() => flow.resendCode()}
		/>
	</p>
	{#if flow.feedback?.kind === 'wait'}
		<p
			data-testid="auth-resend-feedback"
			role="alert"
			class="flex flex-row items-start justify-center gap-1 text-center text-body-sm text-danger-text"
		>
			<Ionicon name="alert-circle" class="mt-0.5 icon-sm" />
			<span>{flow.feedback.message}</span>
		</p>
	{:else if flow.feedback?.kind === 'sent'}
		<p
			data-testid="auth-resend-feedback"
			role="status"
			class="text-center text-body-sm text-success-text"
		>
			{flow.feedback.message}
		</p>
	{/if}
</div>
