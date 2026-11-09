<script lang="ts">
	import { untrack } from 'svelte';
	import UserIcon from '~icons/lucide/user-round';
	import DoneIcon from '~icons/lucide/circle-check';
	// 🔴 U-129.1: stage 2 wears the prototype's own clinic (`33-doctor/doctor.js:30`), not a set's house.
	import { HouseCross as OfficeIcon } from '$shared/ui/icons/house-cross';
	import { m } from '$paraglide/messages.js';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { WizardScreen } from '$shared/ui/templates/wizard-screen';
	import { doctorOnboardingProgressQuery } from '$modules/doctor-onboarding/api/progress';
	import {
		buildDoctorOnboardingOverviewContent,
		buildDoctorOnboardingStages
	} from '$modules/doctor-onboarding/lib/content';
	import { resumeDoctorOnboardingStep } from '$modules/doctor-onboarding/lib/steps';
	import BrandLink from '../components/brand-link.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'overview', {
		states: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'LOCKED']
	});
	const options = $derived({ locale: props.locale });
	const content = $derived(
		buildDoctorOnboardingOverviewContent(controller.progress ?? null, props.locale)
	);
	const stages = $derived(buildDoctorOnboardingStages(props.locale));
	const ICONS = [UserIcon, OfficeIcon, DoneIcon];
	// A member's button waits for the session and the progress; a guest's is there at once.
	const waiting = $derived(
		controller.session?.status === 'unknown' ||
			(controller.signedIn && !controller.progress && !controller.loadError)
	);
	let starting = $state(false);
	let failure = $state<string | null>(null);

	/**
	 * «Ξεκινήστε» / «Συνέχεια» (U-103.4): a guest signs in or signs up first and comes back here, once (`'doctor'`). A
	 * member's sign-up that never started starts (D-W3-01: the server answers with new cookies, the browser keeps them)
	 * and opens «Βήμα 1»; one in progress opens its first missing step; a finished or a locked one stays here.
	 */
	async function begin() {
		if (starting) return;
		if (!controller.signedIn) {
			controller.session?.requireSignIn({ action: 'doctor', onSignedIn: () => void begin() });
			return;
		}
		failure = null;
		starting = true;
		try {
			const known =
				controller.progress ??
				(await controller.client.fetchQuery(doctorOnboardingProgressQuery()).catch(() => null));
			if (!known) {
				failure = m.doctor_onboarding_frame_load_error({}, options);
				return;
			}
			if (known.state === 'IN_PROGRESS') {
				controller.open(resumeDoctorOnboardingStep(known));
				return;
			}
			if (known.state !== 'NOT_STARTED') return;
			const started = await controller.save([{ kind: 'start' }]);
			if (started?.state === 'IN_PROGRESS') controller.open('stage-1');
		} finally {
			starting = false;
		}
	}

	// U-80.1 Ε4: «Ξεκινήστε» that went through `/login` or a provider's redirect comes back here and goes on, once.
	$effect(() => {
		if (controller.signedIn && controller.session?.takeResumed('doctor'))
			untrack(() => void begin());
	});
</script>

<svelte:head>
	<title
		>{m.doctor_onboarding_frame_meta_title(
			{ title: m.doctor_onboarding_overview_title({}, options) },
			options
		)}</title
	>
</svelte:head>

{#snippet brand()}
	<BrandLink href={props.homeHref} locale={props.locale} />
{/snippet}

{#snippet footer()}
	{#if content.button}
		<div class="flex flex-row justify-stretch laptop:justify-end">
			<Button
				label={controller.signedIn
					? content.button
					: m.doctor_onboarding_overview_start({}, options)}
				tone="accent"
				radius="full"
				hover={false}
				textClass="text-body-lg"
				disabled={waiting}
				loading={starting || controller.saving}
				onclick={() => void begin()}
				data-testid="doctor-onboarding-start"
				class="w-full laptop:w-auto laptop:px-cta-inline"
			/>
		</div>
	{/if}
{/snippet}

<!-- 33 · Επισκόπηση (record §6.4): the title (30/600, 40/700 from 744), a sign-up in progress says so with the day it
     would be deleted, then the three stages — a number in a circle, the title and its line, the stage's glyph on the
     right; one round button below («Ξεκινήστε» / «Συνέχεια»), none for a finished or a locked sign-up. From 1128 the
     title and the stages side by side. No colour under the pointer (U-100). -->
<WizardScreen
	{brand}
	pills={controller.pills()}
	footer={content.button || !controller.signedIn ? footer : undefined}
	testId="doctor-onboarding-overview"
>
	<div
		class="flex flex-col gap-6 laptop:grid laptop:grid-cols-2 laptop:items-center laptop:gap-section-lg"
	>
		<div class="flex flex-col gap-4">
			<h1
				class="text-heading-xl font-semibold text-foreground tablet:text-display-md tablet:font-bold"
			>
				{m.doctor_onboarding_overview_title({}, options)}
			</h1>
			{#if controller.loadError}
				<InlineNotice
					variant="danger"
					message={m.doctor_onboarding_frame_load_error({}, options)}
					actionLabel={m.doctor_onboarding_frame_retry({}, options)}
					onAction={controller.retry}
					testId="doctor-onboarding-load-error"
				/>
			{/if}
			{#if content.resume}
				<div
					class="flex flex-col gap-1 rounded-md bg-muted px-4 py-3.5"
					data-testid="doctor-onboarding-resume"
				>
					<p class="text-body-sm text-foreground">{content.resume}</p>
					{#if content.resumeDeadline}
						<p class="text-body-sm text-muted-foreground" data-testid="doctor-onboarding-deadline">
							{content.resumeDeadline}
						</p>
					{/if}
				</div>
			{/if}
			{#if content.notice}
				<p
					class="rounded-md bg-muted px-4 py-3.5 text-body-sm text-foreground"
					role="status"
					data-testid="doctor-onboarding-notice"
				>
					{content.notice}
				</p>
			{/if}
			{#if failure || controller.saveError}
				<InlineNotice
					variant="danger"
					message={failure ?? controller.saveError ?? ''}
					testId="doctor-onboarding-start-error"
				/>
			{/if}
		</div>
		<ol class="flex flex-col" data-testid="doctor-onboarding-stages">
			{#each stages as stage, index (stage.number)}
				{@const Icon = ICONS[index]}
				<li class="flex flex-row gap-4 border-t border-border py-5 first:border-t-0 first:pt-0">
					<span
						aria-hidden="true"
						class="grid size-control-xs shrink-0 place-items-center rounded-full bg-chip text-body-sm font-semibold text-foreground"
					>
						{stage.number}
					</span>
					<span class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="text-title-xs font-semibold text-foreground">{stage.title}</span>
						<span class="text-body-sm text-muted-foreground">{stage.body}</span>
					</span>
					<Icon aria-hidden="true" class="size-control-sm shrink-0 self-center text-foreground" />
				</li>
			{/each}
		</ol>
	</div>
</WizardScreen>
