<script lang="ts">
	import { Checkbox } from '$shared/ui/primitives/checkbox';
	import { InlineLinkText } from '$shared/ui/primitives/inline-link-text';

	let {
		accepted,
		label,
		lead,
		linkLabel,
		href,
		onChange
	}: {
		accepted: boolean;
		/** The whole sentence, the checkbox's name: «Αποδέχομαι τους Όρους Συνεργασίας Γιατρών». */
		label: string;
		/** The words before the link: «Αποδέχομαι τους». */
		lead: string;
		/** «Όρους Συνεργασίας Γιατρών». */
		linkLabel: string;
		/** The doctors' terms' page, already resolved in the page's language. */
		href: string;
		onChange: (accepted: boolean) => void;
	} = $props();
</script>

<!-- 41 · «Αποδέχομαι τους Όρους…» (record §6.4, the application's `DoctorOnboardingTermsAccept`): the checkbox, named by
     the whole sentence, and beside it the words with the terms as their own link (strings note: no control inside a
     control), which opens the terms as a page of their own (U-102, U-59.1) — the draft keeps the answers meanwhile
     (U-112.2). The box takes no colour under the pointer (U-100); the link is a word of the sentence (WCAG 2.5.8). -->
<div data-slot="doctor-onboarding-terms-accept" class="flex flex-row items-center gap-2">
	<!-- 🔴 U-129.1: ticked dark, as the prototype's «Αποδοχή όρων» (`doctor.js:248`, `.d-box`). -->
	<Checkbox
		checked={accepted}
		aria-label={label}
		hover={false}
		tone="foreground"
		onCheckedChange={onChange}
		data-testid="doctor-onboarding-terms-accept"
	/>
	<InlineLinkText
		text={lead}
		{linkLabel}
		{href}
		tone="foreground"
		linkTestId="doctor-onboarding-terms-link"
		class="min-w-0 flex-1"
	/>
</div>
