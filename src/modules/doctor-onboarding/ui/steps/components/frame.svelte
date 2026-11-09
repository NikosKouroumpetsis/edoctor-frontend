<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Spinner } from '$shared/ui/primitives/spinner';
	import { WizardScreen } from '$shared/ui/templates/wizard-screen';
	import type { DoctorOnboardingStepController } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';
	import BrandLink from './brand-link.svelte';

	let {
		controller,
		context,
		title,
		subtitle,
		heading = true,
		next,
		footer,
		commit,
		testId,
		children
	}: {
		controller: DoctorOnboardingStepController;
		context: DoctorOnboardingContext;
		/** The step's heading: the page's `h1`, and its tab's title. */
		title: string;
		subtitle?: string;
		/** `false`: the page draws its own heading (the «Βήμα N» pages); the title still names the tab. */
		heading?: boolean;
		/** «Επόμενο» (or the step's own words): locked until the step is complete, and while it saves; `loading` (the
		 * page's own chain) locks «Αποθήκευση και έξοδος» too. */
		next?: { label?: string; disabled?: boolean; loading?: boolean; onClick: () => void };
		/** What the bar holds instead of «Πίσω / Επόμενο» (the end's one button), drawn once the progress is here. */
		footer?: Snippet;
		/** What «Αποθήκευση και έξοδος» saves first, when the step is complete (its own «Επόμενο» write). */
		commit?: () => Promise<boolean>;
		testId: string;
		children: Snippet;
	} = $props();

	const options = $derived({ locale: context.locale });
</script>

<svelte:head>
	<title>{m.doctor_onboarding_frame_meta_title({ title }, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet brand()}
	<BrandLink href={context.homeHref} locale={context.locale} />
{/snippet}

<!-- Record §6.3 (the shared `WizardScreen`, U-81.2: below 744 the application's frame): the pills, the step's title and
     line, its content once the server's progress is here, and the bar — the stage's segments over «Πίσω» and
     «Επόμενο». A failed read says so with «Δοκιμάστε ξανά»; a refused write keeps the words and says so (record §6.10). -->
<WizardScreen
	title={heading ? title : undefined}
	subtitle={heading ? subtitle : undefined}
	{brand}
	pills={controller.pills(commit, Boolean(next?.loading))}
	progress={controller.bar}
	back={{
		label: m.doctor_onboarding_frame_back({}, options),
		onClick: controller.goBack,
		testId: 'doctor-onboarding-back'
	}}
	next={next
		? {
				label: next.label ?? m.doctor_onboarding_frame_next({}, options),
				onClick: next.onClick,
				disabled: !controller.ready || Boolean(next.disabled),
				loading: controller.saving || Boolean(next.loading),
				testId: 'doctor-onboarding-next'
			}
		: undefined}
	footer={footer && controller.ready ? footer : undefined}
	{testId}
>
	{#if controller.loadError}
		<InlineNotice
			variant="danger"
			role="alert"
			message={m.doctor_onboarding_frame_load_error({}, options)}
			actionLabel={m.doctor_onboarding_frame_retry({}, options)}
			onAction={controller.retry}
			testId="doctor-onboarding-load-error"
		/>
	{:else if !controller.ready}
		<div class="flex justify-center py-section" data-testid="doctor-onboarding-loading">
			<Spinner tone="muted" />
		</div>
	{:else}
		{@render children()}
	{/if}
	{#if controller.saveError}
		<div class="mt-4">
			<InlineNotice
				variant="danger"
				role="alert"
				message={controller.saveError}
				testId="doctor-onboarding-save-error"
			/>
		</div>
	{/if}
</WizardScreen>
