<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowHeadClass, flowSubtitleClass } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';
	import CodeField from './code-field.svelte';

	let {
		flow,
		options,
		titleId
	}: { flow: AuthFlowState; options: { locale: 'el' | 'en' }; titleId?: string } = $props();

	const error = $derived.by(() => {
		switch (flow.setPasswordRejection) {
			case 'invalid':
				return m.auth_set_password_code_errors_invalid_code({}, options);
			case 'locked':
				return m.auth_set_password_code_errors_locked({}, options);
			case 'stale':
				return m.auth_set_password_code_errors_stale_code({}, options);
			default:
				return undefined;
		}
	});
</script>

<!-- 2 of 3: the mailed code; nothing is sent from here, it travels in memory to the next step. -->
<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_set_password_code_title({}, options)}</FlowTitle>
	<p class={flowSubtitleClass}>{m.auth_set_password_code_subtitle({}, options)}</p>
</div>
<div class="flex flex-col gap-3">
	<CodeField
		bind:value={flow.setPasswordCode}
		label={m.auth_otp_code_label({}, options)}
		invalid={Boolean(error)}
	/>
	{#if error}
		<FieldMessage {error} class="mt-0" data-testid="auth-error" />
	{/if}
</div>
