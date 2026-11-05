<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { authCodeLength } from '$modules/auth/config/sign-in';
	import { readPasswordProblem, type PasswordProblem } from '$modules/auth/lib/identity';
	import { toAuthGender } from '../lib/gender';
	import { flowButtonClass, flowButtonText } from '../lib/classes';
	import CountryList from '../components/country-list.svelte';
	import DatePicker from '../components/date-picker.svelte';
	import OptionsList from '../components/options-list.svelte';
	import StepEntry from '../components/step-entry.svelte';
	import StepOnboarding from '../components/step-onboarding.svelte';
	import StepOtp from '../components/step-otp.svelte';
	import StepPassword from '../components/step-password.svelte';
	import StepRegister from '../components/step-register.svelte';
	import StepSetPasswordCode from '../components/step-set-password-code.svelte';
	import StepSetPasswordNew from '../components/step-set-password-new.svelte';
	import StepSetPassword from '../components/step-set-password.svelte';
	import StepWelcome from '../components/step-welcome.svelte';
	import SubSurface from '../components/sub-surface.svelte';
	import type { AuthFlowProps, AuthStepPhase } from '../types';

	let {
		flow,
		locale,
		titleId = useId(undefined, 'auth-flow-title'),
		privacyHref,
		termsHref,
		deletionHref,
		onClose,
		onLeaveAfterSignIn,
		onWindowHeight
	}: AuthFlowProps = $props();

	const options = $derived({ locale });
	const phaseClasses: Record<AuthStepPhase, string> = {
		still: '',
		'in-forward': 'animate-auth-in-forward',
		'out-forward': 'animate-auth-out-forward pointer-events-none',
		'in-back': 'animate-auth-in-back',
		'out-back': 'animate-auth-out-back pointer-events-none'
	};
	const centered = (step: string) => step === 'entry' || step === 'welcome';

	let scrolled = $state(false);
	let contentHeight = $state(0);
	let footerHeight = $state(0);

	/** Reports the height of the step that is on stage; the one sliding out reports nothing. */
	function measure(node: HTMLElement, active: boolean) {
		let reporting = active;
		const report = () => {
			if (reporting) contentHeight = node.offsetHeight;
		};
		const observer = new ResizeObserver(report);
		observer.observe(node);
		report();
		return {
			update(next: boolean) {
				reporting = next;
				report();
			},
			destroy: () => observer.disconnect()
		};
	}

	/** A step that arrives takes the focus (the button that led to it is gone); the first one the surface's own. */
	function focusOnArrival(node: HTMLElement, phase: AuthStepPhase) {
		if (phase === 'in-forward' || phase === 'in-back') node.focus({ preventScroll: true });
	}
	// From 744 the window follows the step (Ε1): the JS only measures, the CSS moves it. The bar 64 + the content +
	// the window's own 32 under it + the pinned footer, capped by the CSS (`max-h-window`) and scrolled inside.
	$effect(() => {
		if (contentHeight > 0) onWindowHeight?.(64 + contentHeight + 32 + footerHeight);
	});

	const isFooterStep = $derived(
		flow.currentStep === 'otp' ||
			flow.currentStep === 'set-password-code' ||
			flow.currentStep === 'set-password-new'
	);

	// The footer's password is held here for its one send; it dies with the step.
	let newPassword = $state('');
	let newPasswordProblem = $state<PasswordProblem | null>(null);
	$effect(() => {
		if (flow.currentStep !== 'set-password-new') {
			newPassword = '';
			newPasswordProblem = null;
		}
	});

	async function saveNewPassword() {
		newPasswordProblem = readPasswordProblem(newPassword);
		if (newPasswordProblem) return;
		if (await flow.saveNewPassword(newPassword)) onLeaveAfterSignIn();
	}

	const genderItems = $derived([
		{ value: 'MALE', label: m.auth_register_gender_male({}, options) },
		{ value: 'FEMALE', label: m.auth_register_gender_female({}, options) },
		{ value: 'OTHER', label: m.auth_register_gender_other({}, options) }
	]);

	const barButtonClass =
		'group grid size-touch shrink-0 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
	const barCircleClass =
		'grid size-control-xs place-items-center rounded-full bg-foreground/6 text-foreground transition-colors duration-standard ease-standard can-hover:group-hover:bg-foreground/10 tablet:size-control-md tablet:bg-transparent tablet:can-hover:group-hover:bg-foreground/5';
</script>

<!-- Π1, Π2: the application's `ModalScreenTemplate` below 744 (the 64 row, the 32 tinted circles, the column of 560 and
     its pinned footer), Airbnb's window from 744 (the bar over the content, the 40 circles, white with a line once it
     scrolls). One step = one component; the host changes only the frame around it. -->
<div data-slot="auth-flow" class="relative flex min-h-0 flex-1 flex-col">
	<div
		data-slot="auth-flow-bar"
		data-scrolled={scrolled}
		class="relative z-2 flex h-control-xl shrink-0 flex-row items-center justify-between px-4 py-2 tablet:absolute tablet:inset-x-0 tablet:top-0 tablet:bg-transparent tablet:p-2 tablet:transition-[background-color,box-shadow] tablet:duration-standard tablet:ease-standard tablet:data-[scrolled=true]:bg-card tablet:data-[scrolled=true]:shadow-raised"
	>
		{#if flow.canGoBack}
			<button
				type="button"
				aria-label={m.auth_common_back({}, options)}
				data-testid="auth-back"
				class={barButtonClass}
				onclick={() => flow.back()}
			>
				<span class={barCircleClass}><Ionicon name="arrow-back" class="icon-md" /></span>
			</button>
		{:else}
			<span class="size-touch" aria-hidden="true"></span>
		{/if}
		{#if flow.canClose}
			<button
				type="button"
				aria-label={m.auth_common_close({}, options)}
				data-testid="auth-close"
				class={barButtonClass}
				onclick={onClose}
			>
				<span class={barCircleClass}><Ionicon name="close" class="icon-md" /></span>
			</button>
		{:else}
			<span class="size-touch" aria-hidden="true"></span>
		{/if}
	</div>
	<div
		data-slot="auth-flow-scroll"
		onscroll={(event) => (scrolled = event.currentTarget.scrollTop > 4)}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pt-1 pb-6 tablet:pt-control-xl tablet:pb-section"
	>
		<div
			data-slot="auth-flow-stage"
			class="relative mx-auto grid min-h-full w-full max-w-form tablet:max-w-none"
		>
			{#each flow.frames as frame (frame.id)}
				{@const leaving = frame.phase.startsWith('out')}
				{@const id = leaving ? undefined : titleId}
				<div
					data-slot="auth-step"
					data-step={frame.step}
					data-phase={frame.phase}
					data-testid={leaving ? undefined : `auth-step-${frame.step}`}
					inert={leaving}
					tabindex="-1"
					use:focusOnArrival={frame.phase}
					class={cn(
						'col-start-1 row-start-1 flex min-w-0 flex-col outline-none',
						centered(frame.step) && 'justify-center',
						phaseClasses[frame.phase]
					)}
				>
					<div class="flex flex-col gap-section" use:measure={!leaving}>
						{#if frame.step === 'entry'}
							<StepEntry {flow} {options} titleId={id} {privacyHref} />
						{:else if frame.step === 'welcome'}
							<StepWelcome {flow} {options} titleId={id} />
						{:else if frame.step === 'otp'}
							<StepOtp {flow} {options} titleId={id} />
						{:else if frame.step === 'password'}
							<StepPassword {flow} {options} titleId={id} />
						{:else if frame.step === 'register'}
							<StepRegister {flow} {options} titleId={id} {termsHref} {privacyHref} />
						{:else if frame.step === 'set-password'}
							<StepSetPassword {flow} {options} titleId={id} onDone={onLeaveAfterSignIn} />
						{:else if frame.step === 'set-password-code'}
							<StepSetPasswordCode {flow} {options} titleId={id} />
						{:else if frame.step === 'set-password-new'}
							<StepSetPasswordNew
								{flow}
								{options}
								titleId={id}
								bind:password={newPassword}
								problem={newPasswordProblem}
							/>
						{:else if frame.step === 'onboarding'}
							<StepOnboarding {flow} {options} titleId={id} {deletionHref} />
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
	{#if isFooterStep}
		<div
			data-slot="auth-flow-footer"
			bind:clientHeight={footerHeight}
			class="shrink-0 border-t border-border/60 bg-card"
		>
			<div
				class="mx-auto flex w-full max-w-form flex-col gap-3 px-6 pt-3 pb-safe-area-3 tablet:max-w-none tablet:py-4"
			>
				{#if flow.currentStep === 'otp'}
					<Button
						tone="contrast"
						label={m.auth_otp_continue({}, options)}
						size="lg"
						bordered={false}
						disabled={flow.code.length !== authCodeLength}
						loading={flow.isVerifying}
						data-testid="auth-verify"
						class={flowButtonClass}
						textClass={flowButtonText}
						onclick={() => flow.submitCode()}
					/>
					{#if flow.hasPasswordOption}
						<Button
							tone="muted"
							label={m.auth_otp_try_another_way({}, options)}
							size="lg"
							bordered={false}
							data-testid="auth-try-another-way"
							class={flowButtonClass}
							textClass={flowButtonText}
							onclick={() => (flow.sub = 'options')}
						/>
					{/if}
				{:else if flow.currentStep === 'set-password-code'}
					<Button
						label={m.auth_otp_continue({}, options)}
						size="lg"
						bordered={false}
						disabled={flow.setPasswordCode.length !== authCodeLength}
						data-testid="auth-set-password-code-continue"
						class={flowButtonClass}
						textClass={flowButtonText}
						onclick={() => flow.acceptSetPasswordCode()}
					/>
				{:else}
					<Button
						label={m.auth_set_password_new_password_submit({}, options)}
						size="lg"
						bordered={false}
						loading={flow.isSavingPassword}
						data-testid="auth-set-password-save"
						class={flowButtonClass}
						textClass={flowButtonText}
						onclick={saveNewPassword}
					/>
				{/if}
			</div>
		</div>
	{/if}
	<SubSurface
		open={flow.sub !== null}
		label={flow.sub === 'options'
			? m.auth_otp_try_another_way({}, options)
			: flow.sub === 'country'
				? m.auth_prompt_country_label({}, options)
				: flow.sub === 'date'
					? m.auth_register_birth_date_label({}, options)
					: m.auth_register_gender_label({}, options)}
		onClose={() => (flow.sub = null)}
	>
		{#if flow.sub === 'country'}
			<CountryList
				value={flow.dialCode}
				{options}
				onSelect={(dialCode) => {
					flow.dialCode = dialCode;
					flow.sub = null;
				}}
			/>
		{:else if flow.sub === 'options'}
			<div class="flex justify-end px-4">
				<button
					type="button"
					aria-label={m.auth_otp_sheet_close({}, options)}
					class={barButtonClass}
					onclick={() => (flow.sub = null)}
				>
					<span class={barCircleClass}><Ionicon name="close" class="icon-md" /></span>
				</button>
			</div>
			<p class="px-6 pb-2 text-center text-title-lg font-semibold">
				{m.auth_otp_try_another_way({}, options)}
			</p>
			<button
				type="button"
				data-testid="auth-use-password"
				class="flex min-h-control-lg w-full flex-row items-center gap-4 px-6 py-2 text-start transition-colors duration-standard ease-standard outline-none focus-visible:bg-background can-hover:hover:bg-background"
				onclick={() => flow.usePassword()}
			>
				<span class="grid size-touch shrink-0 place-items-center rounded-lg bg-foreground/6">
					<Ionicon name="lock-closed-outline" class="icon-md" />
				</span>
				<span class="text-body-lg font-medium">{m.auth_otp_sheet_password({}, options)}</span>
			</button>
		{:else if flow.sub === 'date'}
			<DatePicker
				value={flow.draft.birthDate}
				{options}
				onCancel={() => (flow.sub = null)}
				onConfirm={(date) => {
					flow.draft.birthDate = date;
					flow.sub = null;
				}}
			/>
		{:else if flow.sub === 'gender'}
			<OptionsList
				label={m.auth_register_gender_label({}, options)}
				items={genderItems}
				value={flow.draft.gender}
				onSelect={(value) => {
					flow.draft.gender = toAuthGender(value);
					flow.sub = null;
				}}
			/>
		{/if}
	</SubSurface>
</div>
