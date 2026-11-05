<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
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
		titleId,
		onDone
	}: {
		flow: AuthFlowState;
		options: { locale: 'el' | 'en' };
		titleId?: string;
		/** «Όχι τώρα»: the surface closes, the visitor stays signed in. */
		onDone: () => void;
	} = $props();
</script>

<!-- Set a password · 1 of 3: no «‹», the sign-in beneath it is already done. -->
<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_set_password_title({}, options)}</FlowTitle>
	<p class={flowSubtitleClass}>{m.auth_set_password_subtitle({}, options)}</p>
</div>
<div class="flex flex-col gap-3">
	{#if flow.error}
		<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
	{/if}
	<Button
		label={m.auth_set_password_send({}, options)}
		size="lg"
		bordered={false}
		loading={flow.isSendingSetPassword}
		data-testid="auth-set-password-send"
		class={flowButtonClass}
		textClass={flowButtonText}
		onclick={() => flow.sendSetPasswordCode()}
	/>
	<Button
		tone="muted"
		label={m.auth_set_password_later({}, options)}
		size="lg"
		bordered={false}
		data-testid="auth-set-password-later"
		class={flowButtonClass}
		textClass={flowButtonText}
		onclick={onDone}
	/>
</div>
