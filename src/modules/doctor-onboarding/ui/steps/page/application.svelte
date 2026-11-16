<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Badge } from '$shared/ui/primitives/badge';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { WizardScreen } from '$shared/ui/templates/wizard-screen';
	import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
	import {
		buildDoctorApplicationHead,
		buildDoctorApplicationSections
	} from '$modules/doctor-onboarding/lib/content';
	import type { DoctorApplicationRow } from '$modules/doctor-onboarding/lib/steps';
	import BrandLink from '../components/brand-link.svelte';
	import type { DoctorOnboardingStepController } from '../hooks/use-step.svelte';
	import { useDoctorProfessions } from '../hooks/use-professions.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let {
		controller,
		progress,
		...props
	}: DoctorOnboardingContext & {
		controller: DoctorOnboardingStepController;
		progress: DoctorOnboardingProgress;
	} = $props();

	const options = $derived({ locale: props.locale });
	const professions = useDoctorProfessions(
		() => props.locale,
		() => controller.signedIn
	);
	// U-122: the specialty's name only from the catalogue, never a made-up one.
	const specialtyName = $derived(
		professions.options.find(
			(option) => option.professionalId === progress.professional.professionalId
		)?.label ?? null
	);
	const sections = $derived(
		buildDoctorApplicationSections(
			progress,
			{ specialtyName, showPhone: props.showPhoneNumber },
			props.locale
		)
	);
	const head = $derived(buildDoctorApplicationHead(props.locale));

	function edit(row: DoctorApplicationRow, event: MouseEvent) {
		event.preventDefault();
		controller.openEdit(row);
	}
</script>

{#snippet brand()}
	<BrandLink href={props.homeHref} locale={props.locale} />
{/snippet}

{#snippet back()}
	<!-- The «Προφίλ» it was opened from (its card «Η αίτησή σας ελέγχεται»), already resolved in the page's language. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		href={props.profileHref ?? props.homeHref}
		aria-label={m.doctor_onboarding_frame_back({}, options)}
		data-testid="doctor-onboarding-application-back"
		class="grid min-h-touch min-w-touch place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		<Ionicon name="chevron-back" class="icon-lg" />
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<!-- 🔴 Wave 5.1 · screen 64 (U-183.5, D-W51-17; `64-switch/sw.js:140-149`, shots `m-pending`, `w-pending-1440`): «Λάβαμε
     την αίτησή σας» of a completed registration without a licence, in the sign-up's own frame (the mark, «Χρειάζεστε
     βοήθεια;», one column in the middle; «‹» below 744) — «Σε έλεγχο», the end's words, what may change until the
     activation, the registration's fields in its three sections with «Επεξεργασία» each, and that the terms do not
     change from here. The contact email only as the server hides it (U-169). Every value is text (U-65.6). -->
<WizardScreen
	{brand}
	leading={back}
	pills={controller.pills()}
	centered={false}
	testId="doctor-onboarding-application"
>
	<div class="flex flex-col">
		<Badge
			label={head.state}
			tone="warning"
			size="sm"
			data-testid="doctor-onboarding-application-state"
			class="mt-2"
		/>
		<h1 class="mt-3 text-heading-lg font-semibold text-foreground tablet:text-heading-xl">
			{head.title}
		</h1>
		<p class="mt-2 text-body-lg text-muted-foreground">{head.lead}</p>
		<p
			data-testid="doctor-onboarding-application-only"
			class="mt-5 mb-2 rounded-md border border-line bg-background px-4 py-3.5 text-body-sm text-foreground"
		>
			{head.only}
		</p>
		{#each sections as section, index (section.title)}
			<section
				data-testid={`doctor-onboarding-application-section-${index}`}
				class="mt-section flex flex-col"
			>
				<h2 class="text-title-sm font-semibold text-foreground">{section.title}</h2>
				{#each section.rows as row (row.id)}
					<div
						data-testid={`doctor-onboarding-application-row-${row.id}`}
						class="flex flex-row items-start justify-between gap-4 border-b border-line py-5 first-of-type:pt-3"
					>
						<div class="min-w-0">
							<h3 class="text-body-md font-semibold text-foreground">{row.label}</h3>
							<p class="mt-0.5 text-body-sm wrap-anywhere text-muted-foreground">{row.value}</p>
						</div>
						<TextButton
							href={controller.editHrefOf(row.id)}
							label={m.doctor_application_edit({}, options)}
							aria-label={m.doctor_application_edit_label({ row: row.label }, options)}
							underline
							tone="foreground"
							textClass="text-body-sm underline-offset-3"
							data-testid={`doctor-onboarding-application-edit-${row.id}`}
							class="-my-3.5 shrink-0"
							onclick={(event: MouseEvent) => edit(row.id, event)}
						/>
					</div>
				{/each}
			</section>
		{/each}
		<p class="mt-6 text-label-lg text-muted-foreground">{head.termsFixed}</p>
	</div>
</WizardScreen>
