<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { authFieldLimits } from '$modules/auth/config/sign-in';
	import type { IdentityProblems } from '$modules/auth/lib/identity';
	import type { AuthFlowState } from '../hooks/flow-state.svelte';

	let {
		flow,
		options,
		problems
	}: {
		flow: AuthFlowState;
		options: { locale: 'el' | 'en' };
		problems: IdentityProblems;
	} = $props();

	const nameLabelId = useId(undefined, 'auth-name');
	const nameError = $derived(
		problems.firstName
			? m.auth_register_errors_first_name({}, options)
			: problems.lastName
				? m.auth_register_errors_last_name({}, options)
				: undefined
	);
	const birthLabel = $derived(
		flow.draft.birthDate
			? new Date(`${flow.draft.birthDate}T12:00:00Z`).toLocaleDateString(
					options.locale === 'en' ? 'en-GB' : 'el-GR',
					{ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
				)
			: ''
	);
	const genderLabels = $derived({
		MALE: m.auth_register_gender_male({}, options),
		FEMALE: m.auth_register_gender_female({}, options),
		OTHER: m.auth_register_gender_other({}, options)
	});
	const genderLabel = $derived(flow.draft.gender ? genderLabels[flow.draft.gender] : '');

	const pickerClass =
		'flex min-h-control-lg w-full flex-row items-center justify-between gap-2 rounded-md border border-input bg-card px-3.5 text-start text-body-lg text-muted-foreground transition-colors duration-standard ease-standard outline-none focus-visible:border-ring data-[filled=true]:text-foreground data-[invalid=true]:border-danger data-[invalid=true]:bg-danger/10';
</script>

<!-- The person's own details (`ui/identity-fields`): the joined name pair, the date of birth, the optional gender. -->
<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1.5">
		<span id={nameLabelId} class="text-label-lg font-medium text-foreground"
			>{m.auth_register_name_group_label({}, options)}</span
		>
		<div role="group" aria-labelledby={nameLabelId} class="flex flex-col pb-1">
			<TextField
				bind:value={flow.draft.firstName}
				label={m.auth_register_first_name_label({}, options)}
				size="lg"
				invalid={Boolean(nameError)}
				autocomplete="given-name"
				maxlength={authFieldLimits.name}
				data-testid="auth-first-name"
				class="pb-0"
				inputClass="rounded-b-none"
			/>
			<TextField
				bind:value={flow.draft.lastName}
				label={m.auth_register_last_name_label({}, options)}
				size="lg"
				invalid={Boolean(nameError)}
				autocomplete="family-name"
				maxlength={authFieldLimits.name}
				data-testid="auth-last-name"
				class="pb-0"
				inputClass="rounded-t-none border-t-0"
			/>
		</div>
		{#if nameError}
			<FieldMessage error={nameError} class="mt-0" data-testid="auth-name-error" />
		{:else}
			<FieldMessage helperText={m.auth_register_name_helper({}, options)} class="mt-0" />
		{/if}
	</div>
	<div class="flex flex-col gap-1.5">
		<span class="text-label-lg font-medium text-foreground"
			>{m.auth_register_birth_date_label({}, options)}</span
		>
		<button
			type="button"
			data-testid="auth-birth-date"
			data-filled={Boolean(birthLabel)}
			aria-haspopup="dialog"
			aria-expanded={flow.sub === 'date'}
			data-invalid={problems.birthDate ? 'true' : undefined}
			class={cn(pickerClass)}
			onclick={() => (flow.sub = 'date')}
		>
			<span>{birthLabel || m.auth_register_birth_date_placeholder({}, options)}</span>
			<Ionicon name="calendar-outline" class="icon-md text-muted-foreground" />
		</button>
		{#if problems.birthDate}
			<FieldMessage
				error={m.auth_register_errors_birth_date({}, options)}
				class="mt-0"
				data-testid="auth-birth-date-error"
			/>
		{/if}
	</div>
	<div class="flex flex-col gap-1.5">
		<span class="text-label-lg font-medium text-foreground"
			>{m.auth_register_gender_label({}, options)}</span
		>
		<button
			type="button"
			data-testid="auth-gender"
			data-filled={Boolean(genderLabel)}
			aria-haspopup="listbox"
			aria-expanded={flow.sub === 'gender'}
			class={cn(pickerClass)}
			onclick={() => (flow.sub = 'gender')}
		>
			<span>{genderLabel || m.auth_register_gender_placeholder({}, options)}</span>
			<Ionicon name="chevron-down" class="icon-md text-muted-foreground" />
		</button>
	</div>
</div>
