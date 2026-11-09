<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { buildDoctorOnboardingDoneContent } from '$modules/doctor-onboarding/lib/content';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	// Only a finished sign-up has an end: one still open (a link, «Πίσω» of the browser) goes to the overview.
	const controller = useDoctorOnboardingStep(() => props, 'done', { states: ['COMPLETED'] });
	const options = $derived({ locale: props.locale });
	const content = $derived(buildDoctorOnboardingDoneContent(controller.progress, props.locale));
</script>

{#snippet footer()}
	<div class="flex flex-row justify-stretch laptop:justify-end">
		<Button
			label={m.doctor_onboarding_done_to_home({}, options)}
			href={props.homeHref}
			tone="accent"
			radius="full"
			hover={false}
			textClass="text-body-lg"
			data-testid="doctor-onboarding-to-home"
			class="w-full laptop:w-auto laptop:px-cta-inline"
		/>
	</div>
{/snippet}

<!-- «Λάβαμε την αίτησή σας» (record §6.4, shot `20-done`): the ✓ in a dark circle, the title, the thanks with «Dr. {name}»
     (plain text), «Τι ακολουθεί» in three points, and one round «Στην αρχική» (the web's; the application's «Στο προφίλ
     μου»). Only the help pill on top, no bar, no «Αποθήκευση και έξοδος». -->
<Frame
	{controller}
	context={props}
	title={content.title}
	heading={false}
	{footer}
	testId="doctor-onboarding-done"
>
	<div class="flex flex-col">
		<span
			aria-hidden="true"
			class="mb-4 flex size-control-md items-center justify-center rounded-full bg-foreground text-card"
		>
			<Ionicon name="checkmark" class="icon-md" />
		</span>
		<h1 class="mb-2 text-heading-lg font-semibold text-foreground tablet:text-heading-xl">
			{content.title}
		</h1>
		<p class="mb-6 text-body-lg text-muted-foreground" data-testid="doctor-onboarding-done-body">
			{content.body}
		</p>
		<h2 class="mb-3 text-body-lg font-semibold text-foreground">{content.nextTitle}</h2>
		<ul
			class="flex list-disc flex-col gap-2 ps-5 text-body-md text-foreground"
			data-testid="doctor-onboarding-done-next"
		>
			{#each content.next as line (line)}
				<li>{line}</li>
			{/each}
		</ul>
	</div>
</Frame>
