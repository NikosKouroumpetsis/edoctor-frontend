<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { DoctorOnboardingContext } from '../types';

	let {
		context,
		title,
		backHref,
		onBack,
		testId,
		children
	}: {
		context: DoctorOnboardingContext;
		title: string;
		/** The step this screen returns to: «←» is a link to it, so it works without JavaScript too. */
		backHref: string;
		onBack: () => void;
		testId: string;
		children: Snippet;
	} = $props();

	const options = $derived({ locale: context.locale });

	function back(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
		onBack();
	}
</script>

<svelte:head>
	<title>{m.doctor_onboarding_frame_meta_title({ title }, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 U-102 (record §6.2.4, §6.7.2): a screen a step opens is a page of its own, never a modal — «←» at the top left,
     the title (22/600, 24 from 744), then its list; no bar and no progress. No colour under the pointer (U-100). White,
     as every page of the sign-up (W8-Δ3, the prototype's `--page`). -->
<main data-slot="doctor-onboarding-sub" data-testid={testId} class="min-h-dvh bg-card">
	<div
		class="flex h-bar-top flex-row items-center px-3 tablet:h-wizard-top tablet:px-gutter-md"
		data-slot="doctor-onboarding-sub-bar"
	>
		<!-- The step's address, already resolved by the screen. -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={backHref}
			aria-label={m.doctor_onboarding_frame_back({}, options)}
			data-testid="doctor-onboarding-sub-back"
			class="inline-flex size-touch shrink-0 items-center justify-center rounded-full text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			onclick={back}
		>
			<Ionicon name="arrow-back" class="icon-md" />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
	<div class="px-gutter-sm pb-section-lg tablet:px-gutter-lg">
		<div class="mx-auto flex w-full max-w-wizard-column flex-col">
			<h1
				class="mb-4 text-heading-sm font-semibold text-foreground tablet:mb-5 tablet:text-heading-md"
			>
				{title}
			</h1>
			{@render children()}
		</div>
	</div>
</main>
