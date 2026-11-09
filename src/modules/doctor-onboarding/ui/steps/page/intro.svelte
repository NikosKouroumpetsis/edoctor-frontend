<script lang="ts">
	import { untrack } from 'svelte';
	import UserIcon from '~icons/lucide/user-round';
	import DoneIcon from '~icons/lucide/circle-check';
	// 🔴 U-129.1: stage 2 wears the prototype's own clinic (`33-doctor/doctor.js:30`), not a set's house.
	import { HouseCross as OfficeIcon } from '$shared/ui/icons/house-cross';
	import { buildDoctorOnboardingIntro } from '$modules/doctor-onboarding/lib/content';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let { stage, ...props }: DoctorOnboardingContext & { stage: 0 | 1 | 2 } = $props();

	const controller = useDoctorOnboardingStep(
		() => props,
		// The page is keyed by its screen: its stage never changes while it lives.
		untrack(() => (['stage-1', 'stage-2', 'stage-3'] as const)[stage])
	);
	const content = $derived(buildDoctorOnboardingIntro(stage, props.locale));
	const Icon = $derived([UserIcon, OfficeIcon, DoneIcon][stage]);
</script>

<!-- «Βήμα 1 / 2 / 3» (record §6.2.3, §6.4): the stage's glyph on a 72 tile, «Βήμα N», the stage's title (30/600, 40/700
     from 744) and what it asks; from 744 in the middle of the screen's height. «Επόμενο» writes nothing. -->
<Frame
	{controller}
	context={props}
	title={content.title}
	heading={false}
	next={{ onClick: () => controller.goNext() }}
	testId={`doctor-onboarding-stage-${stage + 1}`}
>
	<div class="flex flex-col">
		<span
			aria-hidden="true"
			class="mb-6 grid size-row-lg place-items-center rounded-xl bg-chip text-foreground"
		>
			<Icon class="size-control-sm" />
		</span>
		<p class="mb-2 text-body-lg font-semibold text-foreground">{content.eyebrow}</p>
		<h1
			class="mb-3 text-heading-xl font-semibold text-foreground tablet:text-display-md tablet:font-bold"
		>
			{content.title}
		</h1>
		<p class="text-title-xs font-normal text-muted-foreground">{content.text}</p>
	</div>
</Frame>
