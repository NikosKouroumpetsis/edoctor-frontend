<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { getSessionOptional } from '$shared/state/session';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { readIdentityProblems, type IdentityProblems } from '$modules/auth/lib/identity';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowButtonClass, flowButtonText, flowHeadClass } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';
	import IdentityFields from './identity-fields.svelte';

	let {
		flow,
		options,
		titleId,
		deletionHref
	}: {
		flow: AuthFlowState;
		options: { locale: 'el' | 'en' };
		titleId?: string;
		deletionHref: ResolvedPathname;
	} = $props();

	const session = getSessionOptional();
	let problems = $state<IdentityProblems>({});

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		problems = readIdentityProblems(flow.draft);
		if (Object.keys(problems).length > 0) return;
		void flow.submitOnboarding($state.snapshot(flow.draft));
	}
</script>

<div class={flowHeadClass}>
	<FlowTitle {flow} id={titleId}>{m.auth_onboarding_title({}, options)}</FlowTitle>
	<p class="text-center text-body-md text-muted-foreground">
		{m.auth_onboarding_subtitle({}, options)}
	</p>
</div>
<form class="flex flex-col gap-section" onsubmit={onSubmit} novalidate>
	<IdentityFields {flow} {options} {problems} />
	<div class="flex flex-col gap-4">
		{#if flow.error}
			<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
		{/if}
		<Button
			type="submit"
			tone="contrast"
			label={m.auth_onboarding_submit({}, options)}
			size="lg"
			bordered={false}
			loading={flow.isOnboarding}
			data-testid="auth-onboarding-submit"
			class={flowButtonClass}
			textClass={flowButtonText}
		/>
	</div>
</form>
<div class="flex flex-col">
	<p class="flex flex-row flex-wrap items-center justify-center gap-x-2 text-body-md">
		<span class="text-muted-foreground">{m.auth_onboarding_sign_out_prompt({}, options)}</span>
		<TextButton
			label={m.auth_onboarding_sign_out({}, options)}
			tone="foreground"
			underline
			textClass="text-body-md"
			data-testid="auth-onboarding-sign-out"
			onclick={() => session?.signOut()}
		/>
	</p>
	<p class="flex flex-row flex-wrap items-center justify-center gap-x-2 text-body-md">
		<span class="text-muted-foreground">{m.auth_onboarding_delete_account_prompt({}, options)}</span
		>
		<TextButton
			label={m.auth_onboarding_delete_account({}, options)}
			tone="foreground"
			underline
			textClass="text-body-md"
			href={deletionHref}
			data-testid="auth-onboarding-delete"
		/>
	</p>
</div>
