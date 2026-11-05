<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { BrandApple } from '$shared/ui/icons/brand-apple';
	import { BrandGoogle } from '$shared/ui/icons/brand-google';
	import { DividerWithLabel } from '$shared/ui/molecules/divider-with-label';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Wordmark } from '$shared/ui/primitives/wordmark';
	import { cn } from '$shared/lib/utils';
	import { SIGN_IN_PROVIDER_COLORS } from '$shared/preferences/theme/sign-in-provider-colors';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import { isPhoneDraft, isPhoneEntry, readDialCode } from '$modules/auth/lib/identifier';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';
	import { flowButtonClass, flowButtonText, flowColumnClass, flowHeadClass } from '../lib/classes';
	import FlowTitle from './flow-title.svelte';

	let {
		flow,
		options,
		titleId,
		privacyHref
	}: {
		flow: AuthFlowState;
		options: { locale: 'el' | 'en' };
		titleId?: string;
		privacyHref: ResolvedPathname;
	} = $props();

	let focused = $state(false);
	// A prefix typed by hand moved into the chip: the digits after it stay a number.
	let captured = $state(false);
	const phoneShape = $derived(isPhoneEntry(flow.entryValue) || captured);
	const noteShown = $derived(focused || flow.entryValue !== '');

	function onChange(value: string) {
		const typed = isPhoneEntry(value) ? readDialCode(value) : null;
		if (typed) {
			flow.dialCode = typed.dialCode;
			flow.entryValue = typed.national;
			captured = true;
			return;
		}
		captured = captured && isPhoneDraft(value);
	}

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		flow.submitEntry();
	}
</script>

<div class={cn(flowHeadClass, 'gap-6 tablet:gap-5')}>
	<Wordmark />
	<FlowTitle {flow} id={titleId}>{m.auth_prompt_title({}, options)}</FlowTitle>
</div>
<form class={flowColumnClass} onsubmit={onSubmit} novalidate>
	<div class="flex flex-row items-stretch">
		<!-- The chip opens by its own width (identifier-field:100, 200 ms): only the inside of the control moves. -->
		<div
			data-slot="auth-country-chip"
			data-open={phoneShape}
			inert={!phoneShape}
			class="grid grid-cols-[0fr] overflow-hidden pb-1 opacity-0 transition-[grid-template-columns,opacity] duration-label ease-label data-[open=true]:grid-cols-[1fr] data-[open=true]:opacity-100"
		>
			<div class="min-w-0 overflow-hidden">
				<button
					type="button"
					data-testid="auth-country-trigger"
					aria-haspopup="listbox"
					aria-label={m.auth_prompt_country_label({}, options)}
					onclick={() => (flow.sub = 'country')}
					class="flex min-h-control-lg min-w-touch flex-row items-center justify-center gap-1 rounded-l-md border border-input bg-foreground/6 px-4 text-body-lg font-medium whitespace-nowrap text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{flow.dialCode}
					<Ionicon name="chevron-down" class="icon-sm" />
				</button>
			</div>
		</div>
		<TextField
			bind:value={flow.entryValue}
			label={m.auth_prompt_identifier_label({}, options)}
			size="lg"
			invalid={Boolean(flow.error)}
			autocomplete="username"
			inputmode={phoneShape ? 'tel' : 'email'}
			enterkeyhint="go"
			spellcheck={false}
			autocapitalize="none"
			maxlength={authFieldLimits.identifier}
			data-testid="auth-identifier"
			class="min-w-0 flex-1"
			inputClass={cn(
				'transition-[border-radius] duration-label ease-label',
				phoneShape && 'rounded-l-none border-l-0'
			)}
			onChangeText={onChange}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		/>
	</div>
	{#if flow.error}
		<FieldMessage error={flow.error} class="mt-0" data-testid="auth-error" />
	{/if}
	<Button
		type="submit"
		label={m.auth_prompt_continue({}, options)}
		size="lg"
		bordered={false}
		loading={flow.isStarting}
		data-testid="auth-continue"
		class={flowButtonClass}
		textClass={flowButtonText}
	/>
	{#if noteShown}
		<p data-testid="auth-legal-note" class="text-body-sm text-muted-foreground">
			{m.auth_prompt_legal_note({}, options)}
			<a
				data-slot="auth-legal-link"
				href={privacyHref}
				target="_blank"
				rel="noopener"
				class="font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2"
				>{m.auth_prompt_privacy_policy({}, options)}</a
			>
		</p>
	{/if}
</form>
<div class="flex flex-col gap-6 tablet:-mt-3 tablet:gap-4">
	<DividerWithLabel label={m.auth_prompt_divider_label({}, options)} />
	<div class="flex flex-row justify-center gap-3">
		<IconButton
			appearance="tile"
			size="xl"
			aria-label={m.auth_prompt_google_action({}, options)}
			busy={flow.busyProvider === 'google'}
			tileColor={SIGN_IN_PROVIDER_COLORS.surface}
			data-testid="auth-google"
			onclick={() => flow.startProvider('google')}
		>
			<BrandGoogle />
		</IconButton>
		<IconButton
			appearance="tile"
			size="xl"
			aria-label={m.auth_prompt_apple_action({}, options)}
			busy={flow.busyProvider === 'apple'}
			tileColor={SIGN_IN_PROVIDER_COLORS.surface}
			data-testid="auth-apple"
			onclick={() => flow.startProvider('apple')}
		>
			<BrandApple />
		</IconButton>
	</div>
</div>
